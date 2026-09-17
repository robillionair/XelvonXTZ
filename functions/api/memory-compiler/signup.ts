interface Env {
  XELVON_EMAILS?: KVNamespace;
  EMAILS?: KVNamespace;
  KV?: KVNamespace;
  SIGNUP_WEBHOOK_URL?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const data = (await request.json().catch(() => ({}))) as Record<string, any>;
    const email = String(data.email || '').trim();
    const company = String(data.company || '').trim();
    const consent = Boolean(data.consent);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ success: false, error: 'A valid email address is required.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.toLowerCase();
    const timestamp = new Date().toISOString();
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const country = request.headers.get('CF-IPCountry') || 'unknown';

    const record = {
      email: normalizedEmail,
      product: 'memory-compiler',
      company: company || undefined,
      consent,
      timestamp,
      ip,
      country,
    };

    const kv = env.XELVON_EMAILS || env.EMAILS || env.KV;
    if (kv) {
      await kv.put(`sub:${normalizedEmail}`, JSON.stringify(record));
      await kv.put(`mc:${normalizedEmail}`, JSON.stringify(record));
      await kv.put(`idx:${Date.now()}:${normalizedEmail}`, normalizedEmail);
    }

    console.log('[MEMORY_COMPILER_SIGNUP]', JSON.stringify(record));

    return new Response(JSON.stringify({ success: true, message: 'Compiler unlocked.' }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Server error.' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};
