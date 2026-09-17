interface Env {
  XELVON_EMAILS?: KVNamespace;
  EMAILS?: KVNamespace;
  KV?: KVNamespace;
  ADMIN_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Authentication check: matches ADMIN_KEY env var or query parameter / header
  const requiredKey = env.ADMIN_KEY || 'robillionair';
  const providedKey = url.searchParams.get('key') || request.headers.get('x-admin-key') || '';

  if (providedKey !== requiredKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Provide ?key=...' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const kv = env.XELVON_EMAILS || env.EMAILS || env.KV;
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV Namespace not bound yet in Cloudflare Pages dashboard.' }), {
      status: 503,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // List all subscriber keys
    const list = await kv.list({ prefix: 'sub:' });
    const records = [];

    for (const key of list.keys) {
      const val = await kv.get(key.name);
      if (val) {
        try {
          records.push(JSON.parse(val));
        } catch {
          records.push({ raw: val, key: key.name });
        }
      }
    }

    // Sort by timestamp descending
    records.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    // Check if CSV format is requested
    if (url.searchParams.get('format') === 'csv') {
      const headers = 'Email,Product,Source,Company,Timestamp,Country,IP\n';
      const rows = records
        .map((r) => `"${r.email || ''}","${r.product || ''}","${r.source || ''}","${r.company || ''}","${r.timestamp || ''}","${r.country || ''}","${r.ip || ''}"`)
        .join('\n');
      return new Response(headers + rows, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="robillionair_subscribers.csv"',
        },
      });
    }

    return new Response(JSON.stringify({ total: records.length, subscribers: records }, null, 2), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};
