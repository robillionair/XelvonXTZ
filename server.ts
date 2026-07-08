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
  } else {
    serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
  }
  
  initializeApp({
    credential: cert(serviceAccount)
  });
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

    // Save chat history to Firestore if userEmail is provided
    if (db && userEmail) {
      try {
        const normalizedEmail = userEmail.trim().toLowerCase();
        await db.collection('chats').add({
          email: normalizedEmail,
          messages,
          timestamp: new Date().toISOString()
        });
      } catch (dbErr) {
        console.error("Failed to save chat to Firestore:", dbErr);
      }
    }

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
      console.error("OpenRouter Error:", errTxt);
      return res.status(500).json({ error: 'Upstream API error' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
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
