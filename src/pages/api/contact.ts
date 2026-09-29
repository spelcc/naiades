import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const payload = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  const record = JSON.stringify({ receivedAt: new Date().toISOString(), ...payload }) + "\n";
  const file = path.join(process.cwd(), "data/contact-submissions.ndjson");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, record, "utf8");
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
