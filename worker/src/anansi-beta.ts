// Separate from the studio's general newsletter: durable consent before access.
export interface BetaEnv {
  ANANSI_BETA?: DurableObjectNamespace;
  ASSETS?: Fetcher;
  ADMIN_KEY?: string;
}
const FILE = '/_anansi-private/ANANSI-Ultimate-0.1.0-windows-x64-setup.exe';
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

export async function betaRoute(request: Request, env: BetaEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/_anansi-private/')) return new Response('Not found', { status: 404 });
  if (!url.pathname.startsWith('/api/anansi/')) return null;
  if (!env.ANANSI_BETA || !env.ASSETS) return json({ error: 'Beta access is temporarily unavailable. Please try again later.' }, 503);
  const registry = env.ANANSI_BETA.get(env.ANANSI_BETA.idFromName('anansi-beta-v1'));
  if (url.pathname === '/api/anansi/admin/emails' && request.method === 'GET') {
    const key = env.ADMIN_KEY || '';
    const provided = request.headers.get('Authorization') || '';
    const expected = 'Bearer ' + key;
    let different = provided.length ^ expected.length;
    for (let i = 0; i < Math.max(provided.length, expected.length); i++) different |= (provided.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
    if (key.length < 16 || different) return json({ error: 'Unauthorized.' }, 401);
    return registry.fetch(new Request('https://registry/emails?after=' + encodeURIComponent(url.searchParams.get('after') || '')));
  }
  if (url.pathname === '/api/anansi/register' && request.method === 'POST') {
    if (request.headers.get('Origin') !== url.origin) return json({ error: 'Please submit from this website.' }, 403);
    if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'JSON required.' }, 415);
    // Bound the actual stream, including clients that omit Content-Length.
    let body = '';
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Email and consent are required.' }, 400);
    let size = 0;
    const decoder = new TextDecoder();
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 2048) { await reader.cancel(); return json({ error: 'Request too large.' }, 413); }
      body += decoder.decode(part.value, { stream: true });
    }
    body += decoder.decode();
    // Do not register someone for a download we cannot serve.
    const available = await env.ASSETS.fetch(new Request(new URL(FILE, url), { method: 'HEAD' }));
    if (!available.ok) return json({ error: 'The Windows beta is temporarily unavailable.' }, 503);
    return registry.fetch(new Request('https://registry/register', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-IP': request.headers.get('CF-Connecting-IP') || 'local' }, body }));
  }
  if (url.pathname === '/api/anansi/download' && request.method === 'GET') {
    const token = url.searchParams.get('token') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: 'Enter your email on the beta page to unlock this download.' }, 403);
    const result = await registry.fetch(new Request('https://registry/authorize?token=' + token));
    if (!result.ok) return result;
    const asset = await env.ASSETS.fetch(new Request(new URL(FILE, url)));
    if (!asset.ok) return json({ error: 'Installer unavailable. Please try again later.' }, 503);
    const headers = new Headers(asset.headers);
    headers.set('Content-Disposition', 'attachment; filename="ANANSI-Ultimate-0.1.0-windows-x64-setup.exe"');
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Cache-Control', 'private, no-store');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(asset.body, { headers });
  }
  return json({ error: 'Not found.' }, 404);
}

// SQLite-backed Durable Object storage: provisioned by the migration in wrangler.toml.
// No email provider, analytics, inference or outbound email is invoked.
export class AnansiBetaRegistry {
  constructor(private ctx: DurableObjectState) {}
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/emails') {
      const after = url.searchParams.get('after');
      const page = await this.ctx.storage.list({ prefix: 'beta:', limit: 100, ...(after ? { startAfter: after } : {}) });
      return json({ subscribers: [...page.values()], nextCursor: page.size === 100 ? [...page.keys()].at(-1) : null });
    }
    if (url.pathname === '/authorize') {
      const expires = await this.ctx.storage.get<number>('token:' + url.searchParams.get('token'));
      return expires && expires > Date.now() ? json({ authorized: true }) : json({ error: 'Download link expired. Please enter your email again.' }, 403);
    }
    if (url.pathname !== '/register' || request.method !== 'POST') return json({ error: 'Not found.' }, 404);
    let input: Record<string, unknown>;
    try { input = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@<>\x00-\x1f]+@[^\s@<>\x00-\x1f]+\.[^\s@<>\x00-\x1f]+$/.test(email) || input?.consent !== true || input?.platform !== 'windows' || input?.website) {
      return json({ error: 'Enter a valid email and accept the beta access notice.' }, 400);
    }
    const now = Date.now();
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request.headers.get('X-Client-IP') || 'local')))].map(x => x.toString(16).padStart(2, '0')).join('');
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2, '0')).join('');
    try {
      const allowed = await this.ctx.storage.transaction(async txn => {
        const key = 'rate:' + digest;
        const prior = await txn.get<{ count: number; until: number }>(key);
        const rate = prior && prior.until > now ? prior : { count: 0, until: now + 60000 };
        if (rate.count >= 5) return false;
        rate.count++;
        await txn.put(key, rate);
        await txn.put('beta:' + email, { email, platform: 'windows', product: 'anansi', source: 'anansi-beta-page', consentVersion: '2026-11-13', consent: true, timestamp: new Date(now).toISOString(), marketing: false });
        await txn.put('token:' + token, now + 15 * 60000);
        return true;
      });
      if (!allowed) return json({ error: 'Too many requests. Please wait a minute.' }, 429);
      if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + 60000);
      return json({ download: '/api/anansi/download?token=' + token, expiresIn: 900 });
    } catch { return json({ error: 'We could not save your email. No download was unlocked. Please try again.' }, 503); }
  }
  async alarm() {
    const now = Date.now();
    let remaining = false;
    for (const prefix of ['token:', 'rate:']) {
      let startAfter: string | undefined;
      while (true) {
        const page = await this.ctx.storage.list<number | { until: number }>({ prefix, limit: 500, ...(startAfter ? { startAfter } : {}) });
        if (!page.size) break;
        const expired = [...page].filter(([, value]) => (typeof value === 'number' ? value : value.until) <= now).map(([key]) => key);
        if (expired.length) await this.ctx.storage.delete(expired);
        if (expired.length < page.size) remaining = true;
        startAfter = [...page.keys()].at(-1);
        if (page.size < 500) break;
      }
    }
    if (remaining) await this.ctx.storage.setAlarm(now + 15 * 60000);
  }
}
