import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

export type ProviderLocality = 'local' | 'private-network' | 'cloud';
export type ProviderStatus = 'connected' | 'not-configured' | 'offline' | 'authentication-failed' | 'model-missing' | 'rate-limited' | 'spending-limit' | 'blocked-by-policy' | 'degraded';
export type ProviderType = 'ollama' | 'lm-studio' | 'localai' | 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'mistral' | 'groq' | 'cohere' | 'xai' | 'azure-openai' | 'openai-compatible';
export type AIFunction = 'ask' | 'extraction' | 'summarization' | 'writing' | 'classification' | 'embeddings' | 'vision' | 'transcription';
export type Sensitivity = 'public' | 'organization' | 'department' | 'confidential' | 'restricted' | 'sealed';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number | null;
  capabilities: {
    embeddings: boolean | null;
    structuredOutput: boolean | null;
    vision: boolean | null;
    toolCalling: boolean | null;
  };
}

export interface ConnectionInput {
  name: string;
  providerType: ProviderType;
  locality: ProviderLocality;
  baseUrl?: string;
  apiKey?: string;
  organizationId?: string;
  projectId?: string;
  timeoutMs?: number;
  streaming?: boolean;
  customHeaders?: Record<string, string>;
  model?: string;
}

interface EncryptedSecret {
  iv: string;
  tag: string;
  ciphertext: string;
}

interface StoredConnection extends Omit<ConnectionInput, 'apiKey' | 'customHeaders'> {
  id: string;
  status: ProviderStatus;
  maskedKey?: string;
  secret?: EncryptedSecret;
  encryptedHeaders?: EncryptedSecret;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  lastLatencyMs?: number;
  lastError?: string;
}

export interface PublicConnection extends Omit<StoredConnection, 'secret' | 'encryptedHeaders'> {
  secretStored: boolean;
}

export interface GenerationRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerationResponse {
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  requestId?: string;
}

export interface ConnectionResult {
  ok: boolean;
  status: ProviderStatus;
  message: string;
  latencyMs: number;
  modelCount?: number;
}

export interface AnansiAIProvider {
  validateConnection(): Promise<ConnectionResult>;
  listModels(): Promise<ModelInfo[]>;
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  cancel(requestId: string): Promise<void>;
}

const PROVIDER_DEFAULTS: Partial<Record<ProviderType, string>> = {
  ollama: 'http://127.0.0.1:11434',
  'lm-studio': 'http://127.0.0.1:1234/v1',
  localai: 'http://127.0.0.1:8080/v1',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openrouter: 'https://openrouter.ai/api/v1',
  mistral: 'https://api.mistral.ai/v1',
  groq: 'https://api.groq.com/openai/v1',
  cohere: 'https://api.cohere.com/v2',
  xai: 'https://api.x.ai/v1'
};

const OPENAI_COMPATIBLE = new Set<ProviderType>(['lm-studio', 'localai', 'openai', 'openrouter', 'mistral', 'groq', 'xai', 'azure-openai', 'openai-compatible']);
const FIXED_CLOUD_PROVIDERS = new Set<ProviderType>(['openai', 'anthropic', 'gemini', 'openrouter', 'mistral', 'groq', 'cohere', 'xai', 'azure-openai']);
const FIXED_LOCAL_PROVIDERS = new Set<ProviderType>(['ollama', 'lm-studio', 'localai']);
const SECRET_PATTERN = /(?:sk|key|token|bearer)[-_][A-Za-z0-9_-]{8,}/gi;

function normalizeMasterKey(value?: string): Buffer {
  if (!value) return randomBytes(32);
  const trimmed = value.trim();
  const decoded = /^[0-9a-f]{64}$/i.test(trimmed) ? Buffer.from(trimmed, 'hex') : Buffer.from(trimmed, 'base64');
  if (decoded.length !== 32) throw new Error('ANANSI_PROVIDER_MASTER_KEY must decode to exactly 32 bytes.');
  return decoded;
}

export class SecretVault {
  readonly persistent: boolean;
  private readonly key: Buffer;

  constructor(masterKey?: string) {
    this.persistent = Boolean(masterKey);
    this.key = normalizeMasterKey(masterKey);
  }

  encrypt(value: string): EncryptedSecret {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
  }

  decrypt(value?: EncryptedSecret): string {
    if (!value) return '';
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(value.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }
}

export function maskSecret(secret: string): string {
  if (!secret) return '';
  const suffix = secret.slice(-4).toUpperCase();
  const prefix = secret.includes('-') ? `${secret.split('-')[0]}-` : '';
  return `${prefix}••••••••••••${suffix}`;
}

export function redactSecrets(value: string): string {
  return value.replace(SECRET_PATTERN, '[REDACTED]');
}

function isPrivateIPv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return octets[0] === 10 || octets[0] === 127 || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
}

export function validateProviderUrl(rawUrl: string, locality: ProviderLocality): URL {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error('Enter a complete HTTP or HTTPS URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS endpoints are supported.');
  if (url.username || url.password) throw new Error('Credentials must not be embedded in the endpoint URL.');
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal' || hostname.endsWith('.internal.invalid')) throw new Error('This endpoint is blocked for security.');
  const isPrivateTarget = hostname === 'localhost' || hostname === '::1' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.lan') || hostname.endsWith('.internal') || isPrivateIPv4(hostname);
  if (locality === 'cloud' && (url.protocol !== 'https:' || isPrivateTarget || net.isIP(hostname) && isPrivateIPv4(hostname))) {
    throw new Error('Cloud endpoints must use HTTPS and cannot target a local or private address.');
  }
  if ((locality === 'local' || locality === 'private-network') && !isPrivateTarget) throw new Error('A local or private-network endpoint must use localhost, loopback, or an approved private address.');
  return url;
}

function joinEndpoint(baseUrl: string, suffix: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${suffix.replace(/^\//, '')}`;
}

function plainModel(provider: string, id: string): ModelInfo {
  return { id, name: id, provider, contextWindow: null, capabilities: { embeddings: null, structuredOutput: null, vision: null, toolCalling: null } };
}

function errorResult(error: unknown, latencyMs: number): ConnectionResult {
  const message = redactSecrets(error instanceof Error ? error.message : 'Connection failed.');
  const lower = message.toLowerCase();
  const status: ProviderStatus = /401|403|auth|key/.test(lower) ? 'authentication-failed' : /429|rate/.test(lower) ? 'rate-limited' : /model/.test(lower) ? 'model-missing' : 'offline';
  return { ok: false, status, message, latencyMs };
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<{ data: any; response: Response; latencyMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: 'error' });
    const text = await response.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text.slice(0, 300) }; }
    if (!response.ok) throw new Error(`${response.status}: ${data?.error?.message || data?.message || response.statusText}`);
    return { data, response, latencyMs: Date.now() - started };
  } finally { clearTimeout(timer); }
}

class HttpProviderAdapter implements AnansiAIProvider {
  private readonly activeRequests = new Map<string, AbortController>();
  constructor(private readonly connection: StoredConnection, private readonly apiKey: string, private readonly customHeaders: Record<string, string>) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...this.customHeaders, ...extra };
    if (this.apiKey && this.connection.providerType !== 'gemini') headers.Authorization = `Bearer ${this.apiKey}`;
    if (this.connection.providerType === 'anthropic') {
      delete headers.Authorization;
      headers['x-api-key'] = this.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }
    if (this.connection.organizationId) headers['OpenAI-Organization'] = this.connection.organizationId;
    if (this.connection.projectId) headers['OpenAI-Project'] = this.connection.projectId;
    return headers;
  }

  async listModels(): Promise<ModelInfo[]> {
    const base = this.connection.baseUrl!;
    if (this.connection.providerType === 'ollama') {
      const { data } = await fetchJson(joinEndpoint(base, 'api/tags'), { headers: this.headers() }, this.connection.timeoutMs!);
      return (data.models || []).map((model: any) => plainModel(this.connection.name, model.name || model.model));
    }
    if (this.connection.providerType === 'gemini') {
      const query = this.apiKey ? `?key=${encodeURIComponent(this.apiKey)}` : '';
      const { data } = await fetchJson(`${joinEndpoint(base, 'models')}${query}`, { headers: this.headers() }, this.connection.timeoutMs!);
      return (data.models || []).map((model: any) => plainModel(this.connection.name, String(model.name || '').replace(/^models\//, '')));
    }
    const { data } = await fetchJson(joinEndpoint(base, 'models'), { headers: this.headers() }, this.connection.timeoutMs!);
    return (data.data || data.models || []).map((model: any) => plainModel(this.connection.name, model.id || model.name));
  }

  async validateConnection(): Promise<ConnectionResult> {
    const started = Date.now();
    try {
      const models = await this.listModels();
      return { ok: true, status: models.length ? 'connected' : 'degraded', message: models.length ? `Connection successful. ${models.length} model${models.length === 1 ? '' : 's'} available.` : 'Connection successful, but the provider did not return a model list. You can enter a model name manually.', latencyMs: Date.now() - started, modelCount: models.length };
    } catch (error) { return errorResult(error, Date.now() - started); }
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const base = this.connection.baseUrl!;
    if (!request.model) throw new Error('Select a model before testing generation.');
    if (this.connection.providerType === 'ollama') {
      const { data } = await fetchJson(joinEndpoint(base, 'api/chat'), { method: 'POST', headers: this.headers(), body: JSON.stringify({ model: request.model, messages: request.messages, stream: false }) }, this.connection.timeoutMs!);
      return { text: data.message?.content || '', model: data.model || request.model, inputTokens: data.prompt_eval_count ?? null, outputTokens: data.eval_count ?? null };
    }
    if (this.connection.providerType === 'anthropic') {
      const system = request.messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n');
      const messages = request.messages.filter((message) => message.role !== 'system');
      const { data, response } = await fetchJson(joinEndpoint(base, 'messages'), { method: 'POST', headers: this.headers(), body: JSON.stringify({ model: request.model, system, messages, max_tokens: request.maxTokens || 512 }) }, this.connection.timeoutMs!);
      return { text: (data.content || []).map((part: any) => part.text || '').join(''), model: data.model || request.model, inputTokens: data.usage?.input_tokens ?? null, outputTokens: data.usage?.output_tokens ?? null, requestId: response.headers.get('request-id') || undefined };
    }
    if (this.connection.providerType === 'gemini') {
      const prompt = request.messages.map((message) => `${message.role}: ${message.content}`).join('\n');
      const query = this.apiKey ? `?key=${encodeURIComponent(this.apiKey)}` : '';
      const { data, response } = await fetchJson(`${joinEndpoint(base, `models/${encodeURIComponent(request.model)}:generateContent`)}${query}`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }) }, this.connection.timeoutMs!);
      return { text: data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') || '', model: request.model, inputTokens: data.usageMetadata?.promptTokenCount ?? null, outputTokens: data.usageMetadata?.candidatesTokenCount ?? null, requestId: response.headers.get('x-request-id') || undefined };
    }
    if (!OPENAI_COMPATIBLE.has(this.connection.providerType)) throw new Error(`Generation is not yet available for ${this.connection.providerType}.`);
    const { data, response } = await fetchJson(joinEndpoint(base, 'chat/completions'), { method: 'POST', headers: this.headers(), body: JSON.stringify({ model: request.model, messages: request.messages, max_tokens: request.maxTokens || 512, temperature: request.temperature ?? 0.2, stream: false }) }, this.connection.timeoutMs!);
    return { text: data.choices?.[0]?.message?.content || '', model: data.model || request.model, inputTokens: data.usage?.prompt_tokens ?? null, outputTokens: data.usage?.completion_tokens ?? null, requestId: response.headers.get('x-request-id') || undefined };
  }

  async cancel(requestId: string): Promise<void> {
    this.activeRequests.get(requestId)?.abort();
    this.activeRequests.delete(requestId);
  }
}

export class ProviderRepository {
  private connections: StoredConnection[] = [];
  private routes: Record<AIFunction, string | 'automatic' | 'none'> = {
    ask: 'none', extraction: 'none', summarization: 'none', writing: 'none', classification: 'none', embeddings: 'none', vision: 'none', transcription: 'none'
  };
  private usage: Array<{ connectionId: string; function: AIFunction; timestamp: string; inputTokens: number | null; outputTokens: number | null; estimated: boolean }> = [];
  private readonly filePath: string;

  constructor(readonly vault: SecretVault, dataDirectory = path.join(process.cwd(), 'data')) {
    this.filePath = path.join(dataDirectory, 'ai-provider-store.json');
  }

  async load(): Promise<void> {
    if (!this.vault.persistent) return;
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
      this.connections = Array.isArray(parsed.connections) ? parsed.connections : [];
      this.routes = { ...this.routes, ...(parsed.routes || {}) };
      this.usage = Array.isArray(parsed.usage) ? parsed.usage.slice(-2000) : [];
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  private async persist(): Promise<void> {
    if (!this.vault.persistent) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify({ version: 1, connections: this.connections, routes: this.routes, usage: this.usage.slice(-2000) }, null, 2), { encoding: 'utf8', mode: 0o600 });
  }

  list(): PublicConnection[] {
    return this.connections.map(({ secret, encryptedHeaders, ...connection }) => ({ ...connection, secretStored: Boolean(secret) }));
  }

  get(id: string): StoredConnection | undefined { return this.connections.find((connection) => connection.id === id); }

  adapter(id: string): AnansiAIProvider {
    const connection = this.get(id);
    if (!connection) throw new Error('AI connection not found.');
    const apiKey = this.vault.decrypt(connection.secret);
    const customHeaders = connection.encryptedHeaders ? JSON.parse(this.vault.decrypt(connection.encryptedHeaders)) : {};
    return new HttpProviderAdapter(connection, apiKey, customHeaders);
  }

  async add(input: ConnectionInput): Promise<PublicConnection> {
    if (!input.name?.trim()) throw new Error('Connection name is required.');
    const providerType = input.providerType;
    if (FIXED_CLOUD_PROVIDERS.has(providerType) && input.locality !== 'cloud') throw new Error(`${providerType} must be configured as a cloud provider.`);
    if (FIXED_LOCAL_PROVIDERS.has(providerType) && input.locality === 'cloud') throw new Error(`${providerType} must be configured as local or private-network.`);
    const baseUrl = input.baseUrl || PROVIDER_DEFAULTS[providerType];
    if (!baseUrl) throw new Error('A base URL is required for this provider.');
    validateProviderUrl(baseUrl, input.locality);
    if (input.customHeaders && Object.keys(input.customHeaders).length > 20) throw new Error('A maximum of 20 custom headers is supported.');
    const now = new Date().toISOString();
    const connection: StoredConnection = {
      id: randomUUID(), name: input.name.trim(), providerType, locality: input.locality, baseUrl: baseUrl.replace(/\/$/, ''),
      organizationId: input.organizationId?.trim() || undefined, projectId: input.projectId?.trim() || undefined,
      timeoutMs: Math.min(120000, Math.max(1000, Number(input.timeoutMs) || 15000)), streaming: input.streaming !== false,
      model: input.model?.trim() || undefined, status: 'not-configured', createdAt: now, updatedAt: now,
      maskedKey: input.apiKey ? maskSecret(input.apiKey) : undefined,
      secret: input.apiKey ? this.vault.encrypt(input.apiKey) : undefined,
      encryptedHeaders: input.customHeaders && Object.keys(input.customHeaders).length ? this.vault.encrypt(JSON.stringify(input.customHeaders)) : undefined
    };
    this.connections.push(connection);
    await this.persist();
    return this.list().find((item) => item.id === connection.id)!;
  }

  async previewModels(input: ConnectionInput): Promise<ModelInfo[]> {
    if (!input.name?.trim()) throw new Error('Connection name is required.');
    const baseUrl = input.baseUrl || PROVIDER_DEFAULTS[input.providerType];
    if (!baseUrl) throw new Error('A base URL is required for this provider.');
    validateProviderUrl(baseUrl, input.locality);
    const now = new Date().toISOString();
    const connection: StoredConnection = { id:'preview',name:input.name.trim(),providerType:input.providerType,locality:input.locality,baseUrl:baseUrl.replace(/\/$/,''),timeoutMs:Math.min(120000,Math.max(1000,Number(input.timeoutMs)||15000)),streaming:input.streaming!==false,model:input.model?.trim()||undefined,status:'not-configured',createdAt:now,updatedAt:now,secret:undefined };
    return new HttpProviderAdapter(connection,input.apiKey||'',input.customHeaders||{}).listModels();
  }

  async remove(id: string): Promise<boolean> {
    const before = this.connections.length;
    this.connections = this.connections.filter((connection) => connection.id !== id);
    for (const fn of Object.keys(this.routes) as AIFunction[]) if (this.routes[fn] === id) this.routes[fn] = 'none';
    await this.persist();
    return this.connections.length !== before;
  }

  async updateModel(id: string, model: string): Promise<PublicConnection> {
    const connection = this.get(id);
    if (!connection) throw new Error('AI connection not found.');
    if (!model.trim() || model.length > 250) throw new Error('Choose a valid model name.');
    connection.model = model.trim();
    connection.updatedAt = new Date().toISOString();
    await this.persist();
    return this.list().find((item) => item.id === connection.id)!;
  }

  async test(id: string, runGeneration = false): Promise<ConnectionResult & { generation?: string }> {
    const connection = this.get(id);
    if (!connection) throw new Error('AI connection not found.');
    const adapter = this.adapter(id);
    let result = await adapter.validateConnection();
    connection.status = result.status;
    connection.lastTestedAt = new Date().toISOString();
    connection.lastLatencyMs = result.latencyMs;
    connection.lastError = result.ok ? undefined : redactSecrets(result.message);
    let generation: string | undefined;
    if (result.ok && runGeneration && connection.model) {
      try {
        const answer = await adapter.generate({ model: connection.model, messages: [{ role: 'user', content: 'Reply with exactly: ANANSI connection ready.' }], maxTokens: 32, temperature: 0 });
        generation = answer.text;
      } catch (error) {
        result = errorResult(error, result.latencyMs);
        connection.status = result.status;
        connection.lastError = redactSecrets(result.message);
      }
    }
    await this.persist();
    return { ...result, generation };
  }

  getRoutes() { return { ...this.routes }; }
  async setRoutes(routes: Partial<Record<AIFunction, string | 'automatic' | 'none'>>) {
    for (const [fn, connectionId] of Object.entries(routes)) {
      if (!(fn in this.routes)) continue;
      if (connectionId !== 'none' && connectionId !== 'automatic' && !this.get(connectionId!)) throw new Error(`Unknown connection for ${fn}.`);
      this.routes[fn as AIFunction] = connectionId!;
    }
    await this.persist();
    return this.getRoutes();
  }

  resolveRoute(fn: AIFunction): StoredConnection | undefined {
    const route = this.routes[fn];
    if (route === 'automatic') return this.connections.find((connection) => connection.status === 'connected');
    if (route === 'none') return undefined;
    return this.get(route);
  }

  async recordUsage(connectionId: string, fn: AIFunction, response: GenerationResponse) {
    this.usage.push({ connectionId, function: fn, timestamp: new Date().toISOString(), inputTokens: response.inputTokens, outputTokens: response.outputTokens, estimated: response.inputTokens === null || response.outputTokens === null });
    await this.persist();
  }

  usageSummary() {
    const month = new Date().toISOString().slice(0, 7);
    const current = this.usage.filter((event) => event.timestamp.startsWith(month));
    return {
      requests: current.length,
      inputTokens: current.reduce((sum, event) => sum + (event.inputTokens || 0), 0),
      outputTokens: current.reduce((sum, event) => sum + (event.outputTokens || 0), 0),
      exact: current.every((event) => !event.estimated),
      byConnection: this.list().map((connection) => ({ connectionId: connection.id, name: connection.name, requests: current.filter((event) => event.connectionId === connection.id).length }))
    };
  }
}

export interface ContextItem { id: string; title: string; excerpt: string; sensitivity: Sensitivity; permitted: boolean; }
export interface WorkspaceAIPolicy { approvedCloudProviders: string[]; allowConfidentialCloud: boolean; allowRestrictedCloud: boolean; cloudFallback: boolean; }

export function compileAuthorizedContext(items: ContextItem[], connection: Pick<StoredConnection, 'id' | 'locality'>, policy: WorkspaceAIPolicy) {
  if (connection.locality === 'cloud' && !policy.approvedCloudProviders.includes(connection.id)) throw new Error('This AI provider is not approved by the workspace policy.');
  const removed: Array<{ id: string; reason: string }> = [];
  const selected = items.filter((item) => {
    if (!item.permitted) { removed.push({ id: item.id, reason: 'not-permitted' }); return false; }
    if (connection.locality === 'cloud' && item.sensitivity === 'sealed') { removed.push({ id: item.id, reason: 'sealed-cloud-block' }); return false; }
    if (connection.locality === 'cloud' && item.sensitivity === 'restricted' && !policy.allowRestrictedCloud) { removed.push({ id: item.id, reason: 'restricted-policy' }); return false; }
    if (connection.locality === 'cloud' && item.sensitivity === 'confidential' && !policy.allowConfidentialCloud) { removed.push({ id: item.id, reason: 'confidential-policy' }); return false; }
    return true;
  }).slice(0, 12);
  return { selected, removed, citations: selected.map((item) => ({ id: item.id, title: item.title })) };
}

export async function detectLocalServices(): Promise<Array<{ name: string; providerType: ProviderType; baseUrl: string; status: 'detected' | 'not-detected' | 'authentication-required' | 'connection-failed'; latencyMs: number | null; models: ModelInfo[] }>> {
  const candidates: ConnectionInput[] = [
    { name: 'Ollama', providerType: 'ollama', locality: 'local', baseUrl: PROVIDER_DEFAULTS.ollama!, timeoutMs: 1800 },
    { name: 'LM Studio', providerType: 'lm-studio', locality: 'local', baseUrl: PROVIDER_DEFAULTS['lm-studio']!, timeoutMs: 1800 },
    { name: 'LocalAI', providerType: 'localai', locality: 'local', baseUrl: PROVIDER_DEFAULTS.localai!, timeoutMs: 1800 }
  ];
  return Promise.all(candidates.map(async (input) => {
    const now = new Date().toISOString();
    const stored: StoredConnection = { ...input, id: input.providerType, baseUrl: input.baseUrl!, timeoutMs: input.timeoutMs!, streaming: true, status: 'not-configured', createdAt: now, updatedAt: now };
    const adapter = new HttpProviderAdapter(stored, '', {});
    const started = Date.now();
    try { const models = await adapter.listModels(); return { name: input.name, providerType: input.providerType, baseUrl: input.baseUrl!, status: 'detected' as const, latencyMs: Date.now() - started, models }; }
    catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      return { name: input.name, providerType: input.providerType, baseUrl: input.baseUrl!, status: /401|403|auth/.test(message) ? 'authentication-required' as const : /abort|fetch|connect|refused/.test(message) ? 'not-detected' as const : 'connection-failed' as const, latencyMs: null, models: [] };
    }
  }));
}

export function providerDefaults() { return { ...PROVIDER_DEFAULTS }; }
