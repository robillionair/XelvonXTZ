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
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      email = String(formData.get('email') || '').trim();
      product = String(formData.get('product') || 'anansi').trim();
      source = String(formData.get('source') || 'form').trim();
      company = String(formData.get('company') || '').trim();
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ success: false, error: 'A valid email address is required.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.toLowerCase();
    const timestamp = new Date().toISOString();
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
    const country = request.headers.get('CF-IPCountry') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const record = {
      email: normalizedEmail,
      product,
      source,
      company: company || undefined,
      timestamp,
      ip,
      country,
      userAgent,
    };

    // Store in Cloudflare KV if bound
    const kv = env.XELVON_EMAILS || env.EMAILS || env.KV;
    if (kv) {
      // Store by email for deduping
      await kv.put(`sub:${normalizedEmail}`, JSON.stringify(record));
      // Store chronological index
      await kv.put(`idx:${Date.now()}:${normalizedEmail}`, normalizedEmail);
    }

    // Output to Cloudflare real-time function logs
    console.log('[NEW_SIGNUP]', JSON.stringify(record));

    // Optional webhook notification (e.g. Discord, Slack, Telegram, Zapier)
    if (env.SIGNUP_WEBHOOK_URL) {
      context.waitUntil(
        fetch(env.SIGNUP_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `New sign-up on robillionair.com:\n**Email**: \`${normalizedEmail}\`\n**Product**: ${product}\n**Source**: ${source}\n**Country**: ${country}`,
            embeds: [
              {
                title: 'New Robillionair Sign-Up',
                color: 0x00ff9d,
                fields: [
                  { name: 'Email', value: normalizedEmail, inline: true },
                  { name: 'Product', value: product, inline: true },
                  { name: 'Source', value: source, inline: true },
                  { name: 'Country', value: country, inline: true },
                ],
                timestamp,
              },
            ],
          }),
        }).catch((err) => console.error('Webhook error:', err))
      );
    }

    // If client requested JSON
    const accept = request.headers.get('accept') || '';
    if (accept.includes('application/json') || contentType.includes('application/json')) {
      return new Response(JSON.stringify({ success: true, message: 'Thank you for subscribing.' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // If standard browser form submission, redirect back with confirmation
    return Response.redirect(`${new URL(request.url).origin}/?subscribed=true#early-access`, 303);
  } catch (err: any) {
    console.error('Subscription processing error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal server error.' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};
