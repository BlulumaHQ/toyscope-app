import type { Config, Context } from "@netlify/edge-functions";

const MODELS: Record<string, string> = {
  accurate: "google/gemini-omni-1.2-flash",
  fast: "openai/gpt-5.4-mini",
  t_grok: "x-ai/grok-4.7",
  t_carbon: "google/gemini-4-carbon",
  t_terra: "openai/gpt-6.1-terra",
  t_haiku: "anthropic/claude-haiku-5.5",
  t_terrapro: "openai/gpt-6.1-terra-pro",
};
const LANGS: Record<string, string> = { en: "English", zh: "Traditional Chinese (Taiwan)", ja: "Japanese", ko: "Korean", fr: "French", es: "Spanish", de: "German" };
const THINK: Record<string, Record<string, unknown>> = { none: {}, off: { enabled: false }, budget: { max_tokens: 1024, exclude: true }, low: { effort: "low", exclude: true }, minimal: { effort: "minimal", exclude: true }, high: { effort: "high", exclude: true } };
const LABELS = ["Front", "Back", "Box", "Accessories"];

const prompt = (labels: string[], langName: string) => `You identify collectible toys from ONE photo for a collector app. Reply with a single JSON object only.

Honesty first:
- If you are not sure, lower "confidence" and list up to 3 alternatives in "candidates". Never pretend to be sure.
- Never invent product numbers, catalog codes or production counts. Leave them out if you do not know them.
- "origin_country" = country of the actual maker. "name_origin" = the toy's original name in that country's language and script (Japanese toys in Japanese).
- History: only facts you are confident about. Short. No filler.

Photos, in this order: ${labels.join(', ')}. Use every photo. Back and base photos often show maker stamps and dates — use them to tell originals from reissues. If a Box photo is included, the toy comes with its box: price as boxed unless the box is clearly empty. If an Accessories photo is included, list what you can see there as visible accessories.

Not a collectible (food, menu, furniture, people, AI-generated image, modern mass-market toy under $5): set is_collectible false and every price field null. Still name what it is.
Rare items: rarity is one of common|uncommon|rare|very_rare|grail. For grail/very_rare items, price the authentic original and put the typical value of a reproduction/reissue in reproduction_value_usd. If it may be a reproduction or custom, set is_reproduction_or_custom true and list reproduction_signs.

condition_grade must be one of: broken, loose_poor, loose_good, loose_complete, boxed_opened, mint_in_box — judged from THIS photo.
price_tiers_usd: object with those same 6 keys, each [low, high] in USD for this exact toy.
price_low_usd/price_high_usd: value of the item in this photo at its condition.

Write name_app, history, condition_reasons, buying_tips, reproduction_signs and notes in ${langName}.

Item number: only fill item_number when a product/catalog number is printed and readable in the photos (item_number_source "photo"), or when you are highly confident from your own knowledge (item_number_source "ai"). Otherwise null.
condition_details: score each 1–10 from what you can see; use null for score when you cannot see it (e.g. packaging when there is no box). Keep each note under 6 words.

JSON keys:
{"name_app":"","name_en":"","name_origin":"","origin_country":"","brand":"","series":"","year":"","category":"","is_collectible":true,"is_reproduction_or_custom":false,"rarity":"","confidence":0.0,"candidates":[{"name":"","confidence":0.0}],"condition_grade":"","condition_reasons":[""],"accessories_expected":[""],"accessories_visible":[""],"price_low_usd":0,"price_high_usd":0,"price_tiers_usd":{"broken":[0,0],"loose_poor":[0,0],"loose_good":[0,0],"loose_complete":[0,0],"boxed_opened":[0,0],"mint_in_box":[0,0]},"reproduction_value_usd":null,"history":"","buying_tips":[""],"reproduction_signs":[""],"notes":"","item_number":null,"item_number_source":null,"condition_details":{"paint":{"score":0,"note":""},"structure":{"score":0,"note":""},"plastic":{"score":0,"note":""},"stickers":{"score":0,"note":""},"accessories":{"score":0,"note":""},"packaging":{"score":null,"note":""}}}`;

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req: Request, context: Context) => {
  const key = (Netlify.env.get("OPENROUTER_API_KEY") || "").trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "");
  if (!key) return json({ error: "The server has no AI key yet. Add OPENROUTER_API_KEY in Netlify." }, 500);

  const host = new URL(req.url).host;
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== host) return json({ error: "Forbidden" }, 403);
  if (Number(req.headers.get("content-length") || 0) > 8_000_000) return json({ error: "Photos are too large." }, 413);

  let body: { engine?: string; lang?: string; think?: string; images?: { label?: string; url?: string }[] };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  const model = MODELS[body.engine ?? ""] ?? MODELS.fast;
  const images = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
  if (!images.length || images.some((im) => typeof im?.url !== "string" || !im.url.startsWith("data:image/")))
    return json({ error: "Send 1 to 4 photos." }, 400);
  const labels = images.map((im, k) => (LABELS.includes(String(im.label)) ? String(im.label) : k === 0 ? "Front" : "Extra"));

  const content = [
    { type: "text", text: prompt(labels, LANGS[body.lang ?? "en"] ?? "English") },
    ...images.flatMap((im, k) => [
      { type: "text", text: `Photo ${k + 1}: ${labels[k]}` },
      { type: "image_url", image_url: { url: im.url } },
    ]),
  ];

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": `https://${host}`, "X-Title": "ToyScope" },
    body: JSON.stringify({ model, stream: true, max_tokens: 2500, ...(Object.keys(THINK[body.think ?? ""] ?? THINK.low).length ? { reasoning: THINK[body.think ?? ""] ?? THINK.low } : {}), response_format: { type: "json_object" }, messages: [{ role: "user", content }] }),
  });
  if (!r.ok || !r.body) {
    const t = await r.text().catch(() => "");
    return json({ error: `AI service error (${r.status})`, detail: t.slice(0, 300) }, 502);
  }
  return new Response(r.body, { headers: { "content-type": "text/event-stream", "cache-control": "no-store", "x-model": model } });
};

export const config: Config = { path: "/api/identify", method: "POST" };
