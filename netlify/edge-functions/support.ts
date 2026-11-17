import type { Config } from "@netlify/edge-functions";

const SB_URL = "https://deknzrajghaatahmdrwn.supabase.co";
const SB_KEY = "sb_publishable_xOp7aSByxfPuyojXVo6-kg_F-aF4MB0";

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

// In-app support chat: saves the member's message, then emails a heads-up (max one per 10 min per member).
export default async (req: Request) => {
  const host = new URL(req.url).host;
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== host) return json({ error: "Forbidden" }, 403);
  if (req.headers.get("x-toyscope") !== "1") return json({ error: "Forbidden" }, 403);
  const authz = req.headers.get("authorization") || "";
  if (!authz.startsWith("Bearer ")) return json({ error: "Sign in to message us." }, 401);

  let b: { body?: string; image?: string | null; meta?: Record<string, unknown> } = {};
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const body = String(b.body ?? "").slice(0, 4000);
  const meta = typeof b.meta === "object" && b.meta ? b.meta : {};

  const r = await fetch(`${SB_URL}/rest/v1/rpc/send_support`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: authz, "Content-Type": "application/json" },
    body: JSON.stringify({ p_body: body, p_image: b.image || null, p_meta: meta }),
  });
  const g = await r.json().catch(() => null) as { ok?: boolean; reason?: string; notify?: boolean; handle?: string } | null;
  if (!r.ok || !g?.ok) {
    const why = g?.reason;
    if (why === "limit") return json({ error: "You’ve sent a lot of messages today. We’ll reply soon." }, 429);
    if (why === "empty") return json({ error: "Write a few words first." }, 400);
    return json({ error: "Sign in to message us." }, 401);
  }

  const key = (Netlify.env.get("RESEND_API_KEY") || "").trim();
  if (g.notify && key) {
    const to = Netlify.env.get("SUPPORT_TO") || "support@toyscope.app";
    const from = Netlify.env.get("SUPPORT_FROM") || "ToyScope <notify@toyscope.app>";
    const who = g.handle ? "@" + g.handle : "a member";
    const lines = Object.entries(meta).map(([k, v]) => `${esc(k)}: ${esc(String(v)).slice(0, 200)}`).join("<br>");
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to: [to],
          subject: `New support message from ${who}`,
          html: `<p><b>${esc(who)}</b> sent a message${b.image ? " (with a screenshot)" : ""}:</p>
<blockquote style="border-left:3px solid #3851A3;margin:0;padding:8px 12px;white-space:pre-wrap">${esc(body) || "(screenshot only)"}</blockquote>
<p style="color:#666;font-size:12px">${lines}</p>
<p><a href="https://admin.toyscope.app/support">Open in ToyScope Admin →</a></p>`,
        }),
      });
    } catch { /* email is only a heads-up; the message is already saved */ }
  }
  return json({ ok: true });
};

export const config: Config = { path: "/api/support", method: "POST" };
