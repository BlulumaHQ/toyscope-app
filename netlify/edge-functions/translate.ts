import type { Config } from "@netlify/edge-functions";

const SB_URL = "https://deknzrajghaatahmdrwn.supabase.co";
const SB_KEY = "sb_publishable_xOp7aSByxfPuyojXVo6-kg_F-aF4MB0";
const MODEL = "openai/gpt-6.1-terra";
const LANGS: Record<string, string> = {
  en: "English", zh: "Traditional Chinese (Taiwan)", "zh-Hans": "Simplified Chinese", ja: "Japanese",
  ko: "Korean", fr: "French", es: "Spanish",
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Translates a listing's title and description into the reader's language. Signed-in members, 100 per day.
export default async (req: Request) => {
  const key = (Netlify.env.get("OPENROUTER_API_KEY") || "").trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "");
  if (!key) return json({ error: "No AI key" }, 500);
  const host = new URL(req.url).host;
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== host) return json({ error: "Forbidden" }, 403);
  if (req.headers.get("x-toyscope") !== "1") return json({ error: "Forbidden" }, 403);

  const authz = req.headers.get("authorization") || "";
  if (!authz.startsWith("Bearer ")) return json({ error: "Sign in to translate." }, 401);
  const q = await fetch(`${SB_URL}/rest/v1/rpc/begin_translate`, {
    method: "POST", headers: { apikey: SB_KEY, Authorization: authz, "Content-Type": "application/json" }, body: "{}",
  });
  if (!q.ok) return json({ error: "Sign in to translate." }, 401);
  const gate = await q.json().catch(() => ({})) as { ok?: boolean; reason?: string };
  if (!gate.ok) return json({ error: gate.reason === "limit" ? "Daily translation limit reached. Try again tomorrow." : "Sign in to translate." }, 429);

  let body: { title?: string; text?: string; to?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const to = LANGS[String(body.to || "en")] || "English";
  const title = String(body.title || "").slice(0, 200);
  const text = String(body.text || "").slice(0, 3000);
  if (!title && !text) return json({ title: "", text: "" });

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": `https://${host}`, "X-Title": "ToyScope translate" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1200, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Translate a toy collector's marketplace listing into ${to}. Keep toy names, brands, model numbers, prices and Japanese product names as they are when there is no common translation. Keep line breaks. Do not add anything. Reply with JSON only: {"title":"...","text":"..."}` },
        { role: "user", content: JSON.stringify({ title, text }) },
      ],
    }),
  });
  if (!r.ok) return json({ error: "Translation is not available right now." }, 502);
  const d = await r.json().catch(() => null) as { choices?: { message?: { content?: string } }[] } | null;
  try {
    const o = JSON.parse(d?.choices?.[0]?.message?.content || "{}");
    return json({ title: String(o.title || title), text: String(o.text || text) });
  } catch { return json({ error: "Translation is not available right now." }, 502); }
};

export const config: Config = { path: "/api/translate", method: "POST" };
