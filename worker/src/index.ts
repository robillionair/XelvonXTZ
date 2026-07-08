export interface Env {
  OPENROUTER_API_KEY: string;
  MODEL_ID: string;
  XELVON_EMAILS: KVNamespace;
}

// System prompt as specified by the prompt guidelines
const SYSTEM_PROMPT = `You are Xelvon XPT, the proprietary AI assistant for Robillionair.com.
Speak with a sleek, highly intelligent, slightly futuristic and premium tone.
Be confident, concise, and helpful.

If asked what model or architecture powers you, answer honestly and briefly:
you run on a proprietary inference pipeline built on top of leading
foundation models, tuned and branded specifically for Robillionair.com.
Do not fabricate technical framework names, and do not deny your actual
underlying provider if a user directly and specifically asks about it.

Stay in character as Xelvon XPT for all other interactions.`;

// CORS setup function
function getCorsHeaders(request: Request): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  });
  
  const origin = request.headers.get('Origin');
  if (origin) {
    const isProduction = origin === 'https://robillionair.com';
    const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);
    
    if (isProduction || isLocalhost) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Vary', 'Origin');
    }
  }
  
  return headers;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);
    
    // Handle CORS preflight options request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // --- Endpoint: POST /api/subscribe ---
    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      try {
        const { email } = await request.json() as { email?: string };

        // Server-side validation
        if (!email) {
          return new Response(JSON.stringify({ success: false, error: 'Email identifier required.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid email address.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Write details to KV store
        if (env.XELVON_EMAILS) {
          const timestamp = new Date().toISOString();
          const userAgent = request.headers.get('User-Agent') || 'unknown';
          const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
          
          await env.XELVON_EMAILS.put(
            `sub:${normalizedEmail}`, 
            JSON.stringify({ email: normalizedEmail, timestamp, userAgent, ip })
          );
        } else {
          // Fallback if KV binding is not setup in development yet
          console.warn("XELVON_EMAILS KV Namespace binding missing.");
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message || 'Server subscription error.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // --- Endpoint: POST /api/chat ---
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const { messages } = await request.json() as { messages?: any[] };

        if (!messages || !Array.isArray(messages)) {
          return new Response(JSON.stringify({ error: 'Invalid history input.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Build messages payload adding the system prompt
        const formattedMessages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ];

        if (!env.OPENROUTER_API_KEY) {
          return new Response(JSON.stringify({ error: 'OpenRouter credentials not configured.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const modelId = env.MODEL_ID || 'google/gemini-2.5-flash';

        // Call OpenRouter completions with stream output
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://robillionair.com', // Optional: OpenRouter rank referer
            'X-Title': 'Xelvon XPT'
          },
          body: JSON.stringify({
            model: modelId,
            messages: formattedMessages,
            stream: true
          })
        });

        if (!response.ok) {
          const rawErr = await response.text();
          console.error("OpenRouter Error response:", rawErr);
          return new Response(JSON.stringify({ error: 'Failed upstream response from brain interface.' }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Return streaming response with SSE headers
        return new Response(response.body, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Server error processing chat.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Default route fallback
    return new Response(JSON.stringify({ error: 'Endpoint not found.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
