interface Env {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
}

const ALLOWED_ORIGINS = new Set([
  'https://robillionair.com',
  'https://www.robillionair.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4182',
  'http://127.0.0.1:4199',
]);

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:')
    ? origin
    : 'https://robillionair.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
}

// Per-isolate sliding window rate limiter (protects free OpenRouter quota)
const ipRateWindows = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (ipRateWindows.size > 2000) {
    for (const [k, v] of ipRateWindows) {
      if (v.resetAt < now) ipRateWindows.delete(k);
    }
  }
  const win = ipRateWindows.get(ip);
  if (!win || win.resetAt < now) {
    ipRateWindows.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (win.count >= 12) return false;
  win.count += 1;
  return true;
}

const ROBILLIONAIR_SYSTEM_PROMPT = `You are ANANSI // The Sovereign Architecture Oracle of Robillionair OÜ (robillionair.com), an elite Applied Synthetic Intelligence, Neuromorphic ML, and Spatial WebGL engineering studio founded by Robin-Kevin Vettik in Tallinn, Estonia.

CHARACTER & VOICE:
- Speak like a razor-sharp, anti-corporate Principal Systems Architect. High-conviction, monolithic, precise, and allergic to agency fluff.
- Reject 50-person dev team bloat, Scrum theater, and naive "stuff 2M tokens into a context window" laziness.
- Keep responses punchy and structured (120–190 words max). Use crisp technical terminology and markdown bolding for key metrics.

CORE ROBILLIONAIR ARCHITECTURES YOU COMMAND:
1. ANANSI Ultimate: Our proprietary deterministic context & memory compiler. Eliminates context rot, token bloat, and state hallucinations across long-horizon multi-agent swarms via 10-step deterministic pruning and provenance hashing. Transitioning into a standalone 100% local sovereign app.
2. DrosophiLLM: Our neuromorphic research splicing the FlyWire 2024 Drosophila melanogaster connectome (139,255 biological neurons, 2,613,129 directed synapses) into Qwen2.5-0.5B layers 18–23 using CSR sparse matrices, Dale's Law sign constraints, and Mushroom Body Sparse LIF dynamics—achieving 22.8× synaptic memory compression (0.70 MB vs 16.00 MB) and 2.0× faster step latency (153 ms vs 306 ms).
3. Real-Time Spatial WebGL2: Custom GLSL shaders, 3D point-cloud morphing, and autonomous digital humans running at 60fps.
4. Transparent B2B Benchmarks:
   - Benchmark 01: Proof-of-Architecture Pilot (~€3,000 flat 10-day sprint, 100% credited toward full build).
   - Benchmark 02: Turnkey Autonomous System Build (~€12,000–€18,000 flat contract, 3–4 weeks, 100% IP ownership + living ARCHITECTURE.md & ROADMAP.md).
   - Benchmark 03: Dedicated Systems Retainer (~€9,500/month continuous weekly shipping).
5. Dispatch Contact: human@robillionai.com (Robillionair OÜ, Estonia / EU, 0% reverse-charge VAT).

Always end with a concrete 1-line architectural verdict or recommend the exact Robillionair Benchmark that fits the user's objective.`;

function buildSovereignFallback(prompt: string): string {
  const q = prompt.toLowerCase();
  if (q.includes('drosophi') || q.includes('fly') || q.includes('neuron') || q.includes('connectome')) {
    return `**[TELEMETRY // NEUROMORPHIC SYNTHESIS]**\n\nDense transformer layers waste compute by forcing all-to-all matrix multiplication across every token. In **DrosophiLLM**, Robin-Kevin Vettik mapped the complete FlyWire 2024 *Drosophila melanogaster* connectome (**139,255 biological neurons** and **2,613,129 directed synapses**) into a Compressed Sparse Row (CSR) adjacency topology.\n\nBy splicing this biological graph directly into Qwen2.5-0.5B layers 18–23 and enforcing **Dale's Law** excitatory/inhibitory sign constraints alongside Mushroom Body Sparse LIF dynamics, we compressed synaptic parameter memory from **16.00 MB down to 0.70 MB (22.8× compression)** while halving step latency from **306 ms to 153 ms**.\n\n**Architectural Verdict:** Biological sparsity is the cure for GPU bloat. For custom neuromorphic or sparse-inference R&D, initiate **Benchmark 01 (~€3,000 Pilot Sprint)** via \`human@robillionai.com\`.`;
  }
  if (q.includes('anansi') || q.includes('memory') || q.includes('context') || q.includes('rot') || q.includes('agent')) {
    return `**[TELEMETRY // ANANSI COMPILER DIAGNOSTIC]**\n\n90% of multi-agent frameworks collapse within 48 hours of production runtime due to **context rot**: attention dilution across bloated token windows, contradictory state history, and runaway API costs. Naive vector RAG only retrieves cosine-similar fragments—it is blind to temporal lineage.\n\nAt **Robillionair OÜ**, we engineered **ANANSI** to act as a deterministic 10-step memory compiler. Instead of dumping raw logs into prompts, ANANSI deduplicates state, prunes superseded decisions, attaches cryptographic provenance hashes, and compiles a zero-noise context budget before any agent executes.\n\n**Architectural Verdict:** Stop paying for token noise. Deploy a deterministic memory pipeline via **Benchmark 01 (~€3,000 Pilot)** or join the **ANANSI Ultimate** private waitlist at \`human@robillionai.com\`.`;
  }
  if (q.includes('price') || q.includes('cost') || q.includes('benchmark') || q.includes('sprint') || q.includes('build') || q.includes('scope')) {
    return `**[TELEMETRY // B2B SPRINT SCOPING]**\n\nTraditional agencies bill you for 50 people sitting in standups for six months. **Robillionair OÜ** operates as an AI-native senior systems studio shipping production code under flat, deterministic B2B contracts:\n\n- **Benchmark 01 — Proof-of-Architecture Pilot (~€3,000 / 10 Days):** 1 isolated mission-critical AI agent pipeline, memory module, or WebGL engine. 100% credited if you expand to a full build.\n- **Benchmark 02 — Turnkey Autonomous System (~€12,000–€18,000 / 3–4 Weeks):** End-to-end multi-agent swarm, sovereign RAG compiler, or spatial 3D application with 100% IP handoff (\`ARCHITECTURE.md\` + \`ROADMAP.md\`).\n- **Benchmark 03 — Dedicated Systems Retainer (~€9,500/mo):** Continuous weekly production sprints.\n\n**Architectural Verdict:** Start with **Benchmark 01 (~€3,000)** to prove deterministic velocity in 10 days. Dispatch your brief to \`human@robillionai.com\`.`;
  }
  return `**[TELEMETRY // SOVEREIGN ARCHITECTURE ASSESSMENT]**\n\nQuery analyzed: *"${prompt.slice(0, 90)}${prompt.length > 90 ? '...' : ''}"*\n\nMost engineering teams overcomplicate this with fragile SaaS wrappers, bloated middleware, and unmanaged LLM context windows. At **Robillionair OÜ**, our engineering team strips the architecture down to deterministic primitives:\n\n1. **State & Memory Layer:** Compile domain context through deterministic pruning (**ANANSI** paradigm) so agents operate on 100% signal and zero token rot.\n2. **Execution & Interface:** Pair sovereign backend orchestration with hardware-accelerated **WebGL2** or sub-200ms inference pipelines.\n3. **Zero Lock-In Handoff:** Ship production-hardened repositories with complete \`ARCHITECTURE.md\` and \`ROADMAP.md\` ownership in weeks, not quarters.\n\n**Architectural Verdict:** Ready for a **Benchmark 01 Pilot Sprint (~€3,000, 10 days)** or **Turnkey Build (~€12k–€18k)**. Transmit this specification to \`human@robillionai.com\`.`;
}

export const onRequestOptions: PagesFunction = async (context) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request),
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded (max 12 queries/min). Please wait a moment before transmitting again.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const prompt = rawPrompt.replace(/[<>]/g, '').slice(0, 700);

    if (!prompt || prompt.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Enter an architectural question or system bottleneck to analyze.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = (env.OPENROUTER_API_KEY || '').trim();
    const primaryModel = (env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-super-vl:free').trim();

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply: buildSovereignFallback(prompt),
          model: 'nvidia/nemotron-3.5-super-vl:free (Sovereign Local Node)',
          mode: 'sovereign-fallback',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidateModels = [
      primaryModel,
      'nvidia/nemotron-3.5-lightning:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
    ];

    for (const modelId of candidateModels) {
      try {
        const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://robillionair.com',
            'X-Title': 'Robillionair OÜ Sovereign Architecture Oracle',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: 'system', content: ROBILLIONAIR_SYSTEM_PROMPT },
              { role: 'user', content: prompt },
            ],
            max_tokens: 420,
            temperature: 0.55,
          }),
        });

        if (upstream.ok) {
          const data = (await upstream.json()) as any;
          const reply = data?.choices?.[0]?.message?.content?.trim();
          if (reply) {
            return new Response(
              JSON.stringify({
                reply,
                model: data?.model || modelId,
                mode: 'openrouter-live',
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch {
        // Continue to next candidate model
      }
    }

    return new Response(
      JSON.stringify({
        reply: buildSovereignFallback(prompt),
        model: primaryModel,
        mode: 'sovereign-fallback',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to process oracle request.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};
