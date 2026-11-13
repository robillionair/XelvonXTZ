import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AnansiBetaRegistry, betaRoute } from '../worker/src/anansi-beta.ts';

function fixture() {
  const data = new Map();
  const storage = {
    alarm: null, fail: false,
    async get(key) { return data.get(key); },
    async put(key, value) { if (this.fail) throw Error('storage unavailable'); data.set(key, value); },
    async transaction(fn) { const before = new Map(data); try { return await fn(this); } catch (e) { data.clear(); for (const pair of before) data.set(...pair); throw e; } },
    async getAlarm() { return this.alarm; }, async setAlarm(time) { this.alarm = time; },
    async list({ prefix, startAfter = '', limit = 1000 }) { return new Map([...data].sort().filter(([k]) => k.startsWith(prefix) && k > startAfter).slice(0, limit)); },
    async delete(keys) { for (const key of keys) data.delete(key); },
  };
  const registry = new AnansiBetaRegistry({ storage });
  const env = { ANANSI_BETA: { idFromName: x => x, get: () => registry }, ASSETS: { fetch: async () => new Response('installer', { headers: { 'Content-Type': 'application/octet-stream' } }) } };
  return { data, storage, registry, env };
}
const register = (body, headers = {}) => new Request('https://robillionair.com/api/anansi/register', { method: 'POST', headers: { Origin: 'https://robillionair.com', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const valid = { email: 'Tester@Example.com', consent: true, platform: 'windows' };

test('email consent persists before access and token authorizes only the protected download', async () => {
  const { env, data } = fixture();
  const result = await betaRoute(register(valid), env);
  assert.equal(result.status, 200);
  const { download } = await result.json();
  assert.equal(data.get('beta:tester@example.com').consentVersion, '2026-11-13');
  assert.equal(data.get('beta:tester@example.com').marketing, false);
  const response = await betaRoute(new Request('https://robillionair.com' + download), env);
  assert.equal(response.status, 200); assert.equal(await response.text(), 'installer');
  assert.match(response.headers.get('Content-Disposition'), /attachment/);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
});
test('invalid emails, missing consent, non-Windows and honeypot are refused without storage', async () => {
  for (const input of [{...valid,email:'bad'}, {...valid,consent:false}, {...valid,platform:'linux'}, {...valid,website:'bot'}, {...valid,email:'x'.repeat(255)+'@example.com'}, null]) {
    const { env, data } = fixture();
    assert.equal((await betaRoute(register(input), env)).status, 400);
    assert.equal(data.size, 0);
  }
});
test('cross-origin, missing origin, malformed JSON and oversized bodies fail closed', async () => {
  const { env } = fixture();
  assert.equal((await betaRoute(register(valid, { Origin: 'https://evil.example' }), env)).status, 403);
  assert.equal((await betaRoute(register(valid, { Origin: '' }), env)).status, 403);
  assert.equal((await betaRoute(register({...valid, email:'a'.repeat(3000)}), env)).status, 413);
  assert.equal((await betaRoute(new Request('https://robillionair.com/api/anansi/register', { method:'POST',headers:{Origin:'https://robillionair.com','Content-Type':'application/json'},body:'{' }),env)).status,400);
});
test('storage unavailable never returns a download or a partial subscription', async () => {
  const { env, storage, data } = fixture(); storage.fail = true;
  const response = await betaRoute(register(valid), env);
  assert.equal(response.status,503); assert.equal(data.size,0); assert.ok(!(await response.json()).download);
  assert.equal((await betaRoute(register(valid), {})).status,503);
  env.ASSETS.fetch = async () => new Response(null, {status:404});
  assert.equal((await betaRoute(register(valid),env)).status,503);
});
test('direct asset paths, absent tokens, forged tokens and expired tokens are refused', async () => {
  const { env, data } = fixture();
  assert.equal((await betaRoute(new Request('https://robillionair.com/_anansi-private/ANANSI-Ultimate-0.1.0-windows-x64-setup.exe'),env)).status,404);
  for (const token of ['', 'bad', 'a'.repeat(64)]) assert.equal((await betaRoute(new Request('https://robillionair.com/api/anansi/download?token='+token),env)).status,403);
  data.set('token:'+'b'.repeat(64),Date.now()-1);
  assert.equal((await betaRoute(new Request('https://robillionair.com/api/anansi/download?token='+'b'.repeat(64)),env)).status,403);
});
test('registration is throttled and cleanup preserves the email consent record', async () => {
  const { env, data, registry } = fixture();
  for(let i=0;i<5;i++)assert.equal((await betaRoute(register(valid),env)).status,200);
  assert.equal((await betaRoute(register(valid),env)).status,429);
  data.set('token:expired',0); data.set('rate:expired',{until:0,count:1});
  await registry.alarm();
  assert.ok(!data.has('token:expired')); assert.ok(!data.has('rate:expired')); assert.ok(data.has('beta:tester@example.com'));
});
test('admin export is authenticated, paginated and never public', async () => {
  const { env, data } = fixture();
  const url='https://robillionair.com/api/anansi/admin/emails';
  assert.equal((await betaRoute(new Request(url),env)).status,401);
  env.ADMIN_KEY='test-only-not-production-key';
  assert.equal((await betaRoute(new Request(url,{headers:{Authorization:'Bearer wrong'}}),env)).status,401);
  for(let i=0;i<101;i++) data.set('beta:'+String(i).padStart(3,'0'),{email:`test${i}@example.com`});
  const response=await betaRoute(new Request(url,{headers:{Authorization:'Bearer '+env.ADMIN_KEY}}),env);
  const page=await response.json();assert.equal(page.subscribers.length,100);assert.ok(page.nextCursor);
  const next=await betaRoute(new Request(url+'?after='+encodeURIComponent(page.nextCursor),{headers:{Authorization:'Bearer '+env.ADMIN_KEY}}),env);
  assert.equal((await next.json()).subscribers.length,1);
});
test('shipped installer matches its provenance; page stays lean with no repository exposure', () => {
  const installer=readFileSync(new URL('../public/_anansi-private/ANANSI-Ultimate-0.1.0-windows-x64-setup.exe',import.meta.url));
  const meta=JSON.parse(readFileSync(new URL('../docs/anansi-installer-provenance.json',import.meta.url)));
  assert.equal(createHash('sha256').update(installer).digest('hex'),meta.installerSha256);
  const html=readFileSync(new URL('../public/anansi/index.html',import.meta.url),'utf8');
  assert.ok(Buffer.byteLength(html)<50000); assert.ok(!/github\.com|tailwindcss|three\.js/i.test(html));
  assert.equal((html.match(/<canvas/g)||[]).length,1);assert.match(html,/plaintext/);assert.match(html,/Linux · Coming soon/);
});
