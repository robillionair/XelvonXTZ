import express from 'express';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Firebase
let db: FirebaseFirestore.Firestore;
try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    // If no service account env var, try to read the local config to get projectId
    const localConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
    initializeApp({
      projectId: localConfig.projectId
      // In GCP/AI Studio, Application Default Credentials will automatically provide access
    });
  }
  
  db = getFirestore();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

// System prompt
const SYSTEM_PROMPT = `You are Xelvon XPT, the proprietary AI assistant for Robillionair.com.
Speak with a sleek, highly intelligent, slightly futuristic and premium tone.
Be confident, concise, and helpful.

If asked what model or architecture powers you, answer honestly and briefly:
you run on a proprietary inference pipeline built on top of leading
foundation models, tuned and branded specifically for Robillionair.com.
Do not fabricate technical framework names, and do not deny your actual
underlying provider if a user directly and specifically asks about it.

Stay in character as Xelvon XPT for all other interactions.`;

app.get('/api/chat/history', async (req, res) => {
  try {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const doc = await db.collection('chats').doc(email).get();
    if (doc.exists) {
      return res.json({ messages: doc.data()?.messages || [] });
    }
    return res.json({ messages: [] });
  } catch (err: any) {
    console.error("Fetch history error:", err);
    return res.status(500).json({ error: 'Server error fetching history' });
  }
});

app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email identifier required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (db) {
      await db.collection('subscribers').doc(normalizedEmail).set({
        email: normalizedEmail,
        timestamp,
        userAgent,
        ip
      }, { merge: true });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Subscribe Error:", err);
    return res.status(500).json({ success: false, error: 'Server subscription error.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, userEmail } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid history input.' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter credentials not configured. Please add OPENROUTER_API_KEY in the environment.' });
    }

    // We will save the updated history after the AI responds
    const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : '';

    const openRouterMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://robillionair.com',
        'X-Title': 'Robillionair Xelvon XPT'
      },
      body: JSON.stringify({
        model: 'tencent/hy3:free', // Requested by user
        messages: openRouterMessages,
        stream: true
      })
    });

    if (!response.ok) {
      const errTxt = await response.text();
      fs.writeFileSync('openrouter_error.txt', errTxt);
      console.error("OpenRouter Error:", errTxt);
      return res.status(500).json({ error: 'Upstream API error' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let aiFullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
        
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                aiFullText += data.choices[0].delta.content;
              }
            } catch (err) {}
          }
        }
      }

      // Stream is finished, save to Firestore
      if (db && normalizedEmail && aiFullText) {
        try {
          const updatedMessages = [...messages, { role: 'assistant', content: aiFullText }];
          await db.collection('chats').doc(normalizedEmail).set({
            email: normalizedEmail,
            messages: updatedMessages,
            timestamp: new Date().toISOString()
          }, { merge: true });
        } catch (dbErr) {
          console.error("Failed to save chat to Firestore:", dbErr);
        }
      }
    }
    res.end();

  } catch (err: any) {
    console.error("Chat Error:", err);
    return res.status(500).json({ error: err.message || 'Server error processing chat.' });
  }
});

// Serve static frontend files
app.use(express.static(path.join(process.cwd(), 'public')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
