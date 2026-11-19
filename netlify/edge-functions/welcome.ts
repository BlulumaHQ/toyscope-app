import type { Config } from "@netlify/edge-functions";

const SB_URL = "https://deknzrajghaatahmdrwn.supabase.co";
const SB_KEY = "sb_publishable_xOp7aSByxfPuyojXVo6-kg_F-aF4MB0";
const APP = "https://app.toyscope.app";

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

type T = { subj: string; hi: string; intro: string; life: string; half: string; lock: string; steps: string; s1: string; s2: string; s3: string; free: string; btn: string; sign: string; foot: string };
const TX: Record<string, T> = {
  en: { subj: "Welcome to ToyScope, @{h} 🎉", hi: "Hi {n},", intro: "You’re in! Thanks for joining the ToyScope beta.", life: "You’re Founder #{no}: Pro free for life once the app launches.", half: "You’re Founder #{no}: Pro free for 6 months, then half price for life once the app launches.", lock: "Post 1 photo within 30 days (a collection photo or a listing both count) to lock in your spot.", steps: "Three things to try first:", s1: "Scan a toy: tap the blue button and snap a photo. Add the back, box or foot stamps for a sharper ID.", s2: "Show your shelves: post your favourite pieces to Showcase.", s3: "Tell me what’s off: Settings → Contact support. I read every message.", free: "Everything is free during the beta. No card, no charges.", btn: "Open ToyScope", sign: "Sony, maker of ToyScope", foot: "You’re getting this because you created a ToyScope account." },
  zh: { subj: "歡迎加入 ToyScope，@{h} 🎉", hi: "{n} 你好，", intro: "註冊成功！謝謝你加入 ToyScope 公開測試。", life: "你是創始會員 #{no}：正式上架後，Pro 終身免費。", half: "你是創始會員 #{no}：正式上架後，Pro 前 6 個月免費，之後終身半價。", lock: "註冊後 30 天內發 1 張照片（收藏照或出售刊登都算），就能鎖定名額。", steps: "先試試這三件事：", s1: "掃描玩具：按藍色按鈕拍一張。加拍背面、盒子或腳底刻印，辨識會更準。", s2: "秀出收藏櫃：把你最得意的收藏 PO 到 Showcase。", s3: "告訴我哪裡怪怪的：設定 → 聯絡我們。每則訊息我都會看。", free: "測試期間所有功能都免費，不用綁卡，也不會扣款。", btn: "打開 ToyScope", sign: "Sony，ToyScope 開發者", foot: "你收到這封信，是因為你建立了 ToyScope 帳號。" },
  "zh-Hans": { subj: "欢迎加入 ToyScope，@{h} 🎉", hi: "{n} 你好，", intro: "注册成功！谢谢你加入 ToyScope 公开测试。", life: "你是创始会员 #{no}：正式上架后，Pro 终身免费。", half: "你是创始会员 #{no}：正式上架后，Pro 前 6 个月免费，之后终身半价。", lock: "注册后 30 天内发 1 张照片（收藏照或出售刊登都算），就能锁定名额。", steps: "先试试这三件事：", s1: "扫描玩具：按蓝色按钮拍一张。加拍背面、盒子或脚底刻印，识别会更准。", s2: "晒出收藏柜：把你最得意的收藏发到 Showcase。", s3: "告诉我哪里怪怪的：设置 → 联系我们。每条消息我都会看。", free: "测试期间所有功能都免费，不用绑卡，也不会扣款。", btn: "打开 ToyScope", sign: "Sony，ToyScope 开发者", foot: "你收到这封邮件，是因为你创建了 ToyScope 账号。" },
  ja: { subj: "ToyScope へようこそ、@{h} さん 🎉", hi: "{n} さん、こんにちは。", intro: "登録完了です！ToyScope のベータに参加してくれてありがとうございます。", life: "あなたは Founder #{no}：ストア公開後、Pro がずっと無料です。", half: "あなたは Founder #{no}：ストア公開後、Pro がずっと半額です。", lock: "登録から30日以内に写真を1枚投稿（コレクション写真・出品どちらもOK）すると枠が確定します。", steps: "まずはこの3つを試してみてください：", s1: "スキャン：青いボタンを押して撮影。背面・箱・足裏の刻印も撮るとさらに正確に。", s2: "棚を見せる：お気に入りを Showcase に投稿。", s3: "気になる点を教えて：設定 → お問い合わせ。すべて読んでいます。", free: "ベータ期間中はすべて無料。カード登録も課金もありません。", btn: "ToyScope を開く", sign: "Sony（ToyScope 開発者）", foot: "ToyScope のアカウントを作成されたため、このメールをお送りしています。" },
  ko: { subj: "ToyScope에 오신 걸 환영해요, @{h} 🎉", hi: "{n}님, 안녕하세요.", intro: "가입 완료! ToyScope 베타에 참여해 주셔서 감사해요.", life: "Founder #{no}이에요: 앱 출시 후 Pro 평생 무료.", half: "Founder #{no}이에요: 앱 출시 후 Pro 평생 반값.", lock: "가입 후 30일 안에 사진 1장(컬렉션 사진이나 판매 글 모두 포함)을 올리면 자리가 확정돼요.", steps: "먼저 이렇게 해 보세요:", s1: "스캔: 파란 버튼을 눌러 촬영하세요. 뒷면, 박스, 발바닥 각인을 추가하면 더 정확해요.", s2: "컬렉션 자랑: 아끼는 아이템을 Showcase에 올려 보세요.", s3: "이상한 점 알려주기: 설정 → 문의하기. 모든 메시지를 읽어요.", free: "베타 기간에는 모두 무료예요. 카드 등록도 결제도 없어요.", btn: "ToyScope 열기", sign: "Sony, ToyScope 개발자", foot: "ToyScope 계정을 만들어서 이 메일을 받으셨어요." },
  fr: { subj: "Bienvenue sur ToyScope, @{h} 🎉", hi: "Bonjour {n},", intro: "C’est fait ! Merci de rejoindre la bêta de ToyScope.", life: "Vous êtes Fondateur #{no} : Pro gratuit à vie au lancement de l’app.", half: "Vous êtes Fondateur #{no} : Pro à moitié prix à vie au lancement de l’app.", lock: "Publiez 1 photo dans les 30 jours (photo de collection ou annonce) pour garder votre place.", steps: "Trois choses à essayer :", s1: "Scanner un jouet : touchez le bouton bleu et prenez une photo. Ajoutez le dos, la boîte ou les marquages pour plus de précision.", s2: "Montrer vos étagères : publiez vos pièces préférées dans Showcase.", s3: "Me dire ce qui cloche : Réglages → Contacter le support. Je lis chaque message.", free: "Tout est gratuit pendant la bêta. Pas de carte, aucun prélèvement.", btn: "Ouvrir ToyScope", sign: "Sony, créateur de ToyScope", foot: "Vous recevez cet e-mail car vous avez créé un compte ToyScope." },
  es: { subj: "Bienvenido a ToyScope, @{h} 🎉", hi: "Hola, {n}:", intro: "¡Ya estás dentro! Gracias por unirte a la beta de ToyScope.", life: "Eres Fundador #{no}: Pro gratis de por vida cuando se lance la app.", half: "Eres Fundador #{no}: Pro a mitad de precio de por vida cuando se lance la app.", lock: "Publica 1 foto en 30 días (foto de colección o anuncio) para asegurar tu lugar.", steps: "Tres cosas para empezar:", s1: "Escanea un juguete: toca el botón azul y haz una foto. Añade la parte trasera, la caja o las marcas para mayor precisión.", s2: "Enseña tus estanterías: publica tus piezas favoritas en Showcase.", s3: "Cuéntame qué falla: Ajustes → Contactar con soporte. Leo todos los mensajes.", free: "Todo es gratis durante la beta. Sin tarjeta y sin cobros.", btn: "Abrir ToyScope", sign: "Sony, creador de ToyScope", foot: "Recibes este correo porque creaste una cuenta en ToyScope." },
};

export default async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return json({ error: "Forbidden" }, 403);
  if (req.headers.get("x-toyscope") !== "1") return json({ error: "Forbidden" }, 403);
  const authz = req.headers.get("authorization") || "";
  if (!authz.startsWith("Bearer ")) return json({ ok: false }, 401);
  const key = (Netlify.env.get("RESEND_API_KEY") || "").trim();
  if (!key) return json({ ok: false, reason: "email_off" }); // don't claim until email can actually go out

  let lang = "en";
  try { lang = String((await req.json()).lang || "en"); } catch { /* default */ }
  const t = TX[lang] || TX.en;

  const r = await fetch(`${SB_URL}/rest/v1/rpc/claim_welcome`, {
    method: "POST", headers: { apikey: SB_KEY, Authorization: authz, "Content-Type": "application/json" }, body: "{}",
  });
  const p = await r.json().catch(() => null) as { ok?: boolean; email?: string; handle?: string; name?: string; tier?: string | null; no?: number | null } | null;
  if (!r.ok || !p?.ok || !p.email) return json({ ok: false });

  const h = esc(p.handle || "");
  const n = esc((p.name || "").trim() || "@" + (p.handle || ""));
  const founder = p.tier === "lifetime" ? t.life : p.tier === "founding" ? t.half : "";
  const li = (s: string) => `<li style="margin:0 0 10px">${esc(s)}</li>`;
  const html = `<!doctype html><html><body style="margin:0;background:#F2F3F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans TC','Noto Sans JP',sans-serif;color:#141826">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
<div style="background:#ffffff;border-radius:18px;padding:28px 24px">
<img src="https://app.toyscope.app/brand/toyscope-logo-email.png" alt="ToyScope" width="160" style="display:block;height:auto;margin-bottom:20px">
<p style="font-size:16px;margin:0 0 8px">${t.hi.replace("{n}", n)}</p>
<p style="font-size:16px;line-height:1.55;margin:0 0 16px">${esc(t.intro)}</p>
${founder ? `<div style="background:#EEF1FB;border-radius:12px;padding:14px 16px;margin:0 0 18px"><p style="margin:0 0 6px;font-weight:700;color:#2C3F86">🎁 ${esc(founder.replace("{no}", String(p.no ?? "")))}</p><p style="margin:0;font-size:14px;line-height:1.5;color:#3B4256">${esc(t.lock)}</p></div>` : ""}
<p style="font-weight:700;margin:0 0 10px">${esc(t.steps)}</p>
<ol style="padding-left:20px;margin:0 0 18px;font-size:15px;line-height:1.5">${li(t.s1)}${li(t.s2)}${li(t.s3)}</ol>
<p style="font-size:14px;color:#1E7A45;margin:0 0 22px">✓ ${esc(t.free)}</p>
<a href="${APP}" style="display:inline-block;background:#3851A3;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:12px">${esc(t.btn)}</a>
<p style="margin:26px 0 0;font-size:15px">— ${esc(t.sign)}<br><a href="https://www.instagram.com/gatchafive" style="color:#3851A3;font-size:13px">IG @gatchafive</a></p>
</div>
<p style="font-size:12px;color:#6B7285;text-align:center;margin:16px 0 0">${esc(t.foot)}<br>ToyScope · Richmond, BC, Canada · <a href="https://toyscope.app/privacy" style="color:#6B7285">Privacy</a></p>
</div></body></html>`;

  const from = Netlify.env.get("WELCOME_FROM") || "Sony at ToyScope <hello@toyscope.app>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [p.email], reply_to: "support@toyscope.app", subject: t.subj.replace("{h}", h), html }),
  }).catch(() => null);
  return json({ ok: !!res?.ok });
};

export const config: Config = { path: "/api/welcome", method: "POST" };
