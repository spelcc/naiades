import { env } from "cloudflare:workers";

const allowedOrigins = new Set([
  "https://spelcc.github.io",
  "http://127.0.0.1:4321",
  "http://localhost:4321",
]);

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  return {
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "https://spelcc.github.io",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin",
  };
}

export async function OPTIONS({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST({ request }) {
  const form = await request.formData();
  const payload = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  const record = { receivedAt: new Date().toISOString(), ...payload };
  const key = String(Date.now()) + "-" + crypto.randomUUID();
  await env.CONTACT_SUBMISSIONS.put(key, JSON.stringify(record));
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", ...corsHeaders(request) },
  });
}
