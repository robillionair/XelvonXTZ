interface Env {
  XELVON_EMAILS?: KVNamespace;
  EMAILS?: KVNamespace;
  KV?: KVNamespace;
  ADMIN_KEY?: string;
}

const ALLOWED_ORIGINS = new Set([
  'https://robillionair.com',
  'https://www.robillionair.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://robillionair.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function escapeCsvCell(val: unknown): string {
  let str = String(val ?? '').replace(/\r?\n/g, ' ').trim();
  // Prevent CSV formula injection (=, +, -, @, tab, CR)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export const onRequestOptions: PagesFunction = async (context) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request),
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);
  const url = new URL(request.url);

  const configuredKey = (env.ADMIN_KEY || '').trim();
  if (!configuredKey || configuredKey.length < 16) {
    return new Response(
      JSON.stringify({ error: 'Admin endpoint locked: configure a strong ADMIN_KEY secret (16+ chars) in Cloudflare.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const providedKey = (request.headers.get('x-admin-key') || bearerKey).trim();

  if (!providedKey || !constantTimeEquals(providedKey, configuredKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Provide X-Admin-Key header.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const kv = env.XELVON_EMAILS || env.EMAILS || env.KV;
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV Namespace not bound yet in Cloudflare Pages dashboard.' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
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

    records.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    if (url.searchParams.get('format') === 'csv') {
      const headers = 'Email,Product,Source,Company,Timestamp,Country,IP\n';
      const rows = records
        .map((r) =>
          [r.email, r.product, r.source, r.company, r.timestamp, r.country, r.ip]
            .map(escapeCsvCell)
            .join(',')
        )
        .join('\n');
      return new Response(headers + rows, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="robillionair_subscribers.csv"',
        },
      });
    }

    return new Response(JSON.stringify({ total: records.length, subscribers: records }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to retrieve subscriber records.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
