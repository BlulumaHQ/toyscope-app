import type { Config } from "@netlify/edge-functions";

const SB_URL = "https://deknzrajghaatahmdrwn.supabase.co";
const SB_KEY = "sb_publishable_xOp7aSByxfPuyojXVo6-kg_F-aF4MB0";
const MODEL = "openai/gpt-6.1-terra";

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const PROMPT = `You check one photo uploaded to a toy collectors' app. Reply with JSON only: {"rating":"general"|"sensitive"|"prohibited"}.
- "general": normal photos of toys, shelves, packaging or people with toys.
- "sensitive": figures or artwork with notable skin exposure or a suggestive pose (swimsuit, lingerie, partial nudity, cast-off figures), or realistic gore.
- "prohibited": visible genitals or explicit sexual acts, sexual or nude content involving anyone who looks under 18 (including childlike anime characters), adult sex toys, real weapons, drugs, or real people shown nude.
When unsure, pick the stricter level.`;

// Rates a photo before it is shared (album photos, avatars). Signed-in members only.
export default async (req: Request) => {
  const key = (Netlify.env.get("OPENROUTER_API_KEY") || "").trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "");
  if (!key) return json({ error: "No AI key" }, 500);
  const host = new URL(req.url).host;
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== host) return json({ error: "Forbidden" }, 403);
  if (req.headers.get("x-toyscope") !== "1") return json({ error: "Forbidden" }, 403);
  if (Number(req.headers.get("content-length") || 0) > 4_000_000) return json({ error: "Photo is too large." }, 413);

  const authz = req.headers.get("authorization") || "";
  if (!authz.startsWith("Bearer ")) return json({ error: "Sign in first." }, 401);
  const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: authz } });
  if (!u.ok) return json({ error: "Sign in first." }, 401);

  let body: { image?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const img = String(body.image || "");
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(img) || img.length > 3_000_000) return json({ error: "Send one photo." }, 400);

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": `https://${host}`, "X-Title": "ToyScope moderation" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 60, response_format: { type: "json_object" },
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: img } }] }],
    }),
  });
  if (!r.ok) return json({ rating: "unchecked" });
  const d = await r.json().catch(() => null) as { choices?: { message?: { content?: string } }[] } | null;
  let rating = "unchecked";
  try {
    const v = JSON.parse(d?.choices?.[0]?.message?.content || "{}").rating;
    if (["general", "sensitive", "prohibited"].includes(v)) rating = v;
  } catch { /* keep unchecked */ }
  return json({ rating });
};

export const config: Config = { path: "/api/moderate", method: "POST" };
