export interface Env {
  ASSETS?: Fetcher;
  XELVON_EMAILS?: KVNamespace;
  EMAILS?: KVNamespace;
  ADMIN_KEY?: string;
  SIGNUP_WEBHOOK_URL?: string;
}

// CORS setup function
function getCorsHeaders(request: Request): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Admin-Key',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Origin': '*',
  });
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
        let email = '';
        let product = 'anansi';
        let source = 'website';
        let company = '';

        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = (await request.json().catch(() => ({}))) as Record<string, any>;
          email = String(data.email || '').trim();
          product = String(data.product || 'anansi').trim();
          source = String(data.source || 'website').trim();
          company = String(data.company || '').trim();
        } else {
          const formData = await request.formData();
          email = String(formData.get('email') || '').trim();
          product = String(formData.get('product') || 'anansi').trim();
          source = String(formData.get('source') || 'form').trim();
          company = String(formData.get('company') || '').trim();
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          return new Response(JSON.stringify({ success: false, error: 'A valid email address is required.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const normalizedEmail = email.toLowerCase();
        const timestamp = new Date().toISOString();
        const userAgent = request.headers.get('User-Agent') || 'unknown';
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const country = request.headers.get('CF-IPCountry') || 'unknown';

        const record = { email: normalizedEmail, product, source, company: company || undefined, timestamp, userAgent, ip, country };

        const kv = env.XELVON_EMAILS || env.EMAILS;
        if (kv) {
          await kv.put(`sub:${normalizedEmail}`, JSON.stringify(record));
          await kv.put(`idx:${Date.now()}:${normalizedEmail}`, normalizedEmail);
        }

        console.log('[SIGNUP_CAPTURED]', JSON.stringify(record));

        return new Response(JSON.stringify({ success: true, message: 'Subscription confirmed.' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message || 'Server subscription error.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- Endpoint: POST /api/memory-compiler/signup ---
    if (url.pathname === '/api/memory-compiler/signup' && request.method === 'POST') {
      try {
        const data = (await request.json().catch(() => ({}))) as Record<string, any>;
        const email = String(data.email || '').trim().toLowerCase();
        const company = String(data.company || '').trim();

        if (!email) {
          return new Response(JSON.stringify({ success: false, error: 'Email required.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const record = {
          email,
          product: 'memory-compiler',
          company: company || undefined,
          timestamp: new Date().toISOString(),
        };

        const kv = env.XELVON_EMAILS || env.EMAILS;
        if (kv) {
          await kv.put(`sub:${email}`, JSON.stringify(record));
          await kv.put(`mc:${email}`, JSON.stringify(record));
        }

        console.log('[MEMORY_COMPILER_SIGNUP]', JSON.stringify(record));

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- Endpoint: POST /api/chat ---
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const data = (await request.json().catch(() => ({}))) as Record<string, any>;
      const userEmail = String(data.userEmail || 'operator').trim();

      const responseText = `<think>\nVerifying company access profile for ${userEmail}...\nSystems sovereignty active: local context preservation enabled.\n</think>\n\nThank you for connecting. The Xelvon AI thinking workspace is currently in controlled company onboarding. Your organization's access request has been confirmed and our architectural team will coordinate your deployment directly.`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const words = responseText.split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = (i === 0 ? '' : ' ') + words[i];
            controller.enqueue(encoder.encode(chunk));
            await new Promise((resolve) => setTimeout(resolve, 15));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // --- Endpoint: GET /api/chat/history ---
    if (url.pathname === '/api/chat/history' && request.method === 'GET') {
      return new Response(JSON.stringify({ history: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Endpoint: GET /api/admin/emails ---
    if (url.pathname === '/api/admin/emails' && request.method === 'GET') {
      const requiredKey = env.ADMIN_KEY || 'robillionair';
      const providedKey = url.searchParams.get('key') || request.headers.get('x-admin-key') || '';

      if (providedKey !== requiredKey) {
        return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const kv = env.XELVON_EMAILS || env.EMAILS;
      if (!kv) {
        return new Response(JSON.stringify({ error: 'KV Namespace not bound yet.' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const list = await kv.list({ prefix: 'sub:' });
      const records = [];
      for (const key of list.keys) {
        const val = await kv.get(key.name);
        if (val) {
          try { records.push(JSON.parse(val)); } catch { records.push({ raw: val, key: key.name }); }
        }
      }
      records.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

      return new Response(JSON.stringify({ total: records.length, subscribers: records }, null, 2), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default route fallback: serve static assets if available
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};
