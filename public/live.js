/* ToyScope live mode: real accounts, listings, photos and messages through Supabase.
   Loaded after the prototype. Overrides prototype functions where data must be shared. */
(function () {
  if (!window.supabase || !window.TS_SERVER) return;
  const SB_URL = 'https://deknzrajghaatahmdrwn.supabase.co';
  const SB_KEY = 'sb_publishable_xOp7aSByxfPuyojXVo6-kg_F-aF4MB0';
  const sb = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'ts_auth' } });
  const L = (window.LIVE = {});
  window.sb = sb;
  let me = null; // my profile row
  const pub = (b, p) => `${SB_URL}/storage/v1/object/public/${b}/${p}`;
  const pathOf = (b, url) => (url || '').split(`/object/public/${b}/`)[1] || null;
  const isUuid = (x) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(x || ''));
  const COLORS = ['#3851A3', '#16A34A', '#DB2777', '#EA580C', '#C026D3', '#0891B2', '#4F46E5', '#DC2626', '#78716C', '#0F766E'];
  const colorOf = (id) => COLORS[parseInt(String(id).replace(/-/g, '').slice(0, 6), 16) % COLORS.length];
  const errMsg = (e) => { const m = (e && (e.message || e.error_description)) || 'Something went wrong. Try again.'; if (/account_suspended/.test(m)) return 'Your account is suspended. Email support@toyscope.app to appeal.'; if (/account_restricted/.test(m)) return 'You can’t share or list for 7 days because of a community rules strike.'; return /JWT|token/i.test(m) ? 'Please sign in again.' : m.replace(/^.*?:\s(?=[A-Z])/, ''); };
  const toBlob = async (dataUrl) => { // no fetch(): the page's security policy blocks data: URLs
    const [head, b64] = String(dataUrl).split(',');
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: mime });
  };
  const ART = ['giant', '#475569', '#E5E7EB', '#F1F5F9'];

  /* ---------- start: everything bundled with the prototype is sample data ---------- */
  ITEMS.forEach((i) => { i.demo = true; });
  Object.values(USERS).forEach((u) => { if (u.id !== 'me') u.demo = true; });
  for (let k = ITEMS.length - 1; k >= 0; k--) if (ITEMS[k].owner === 'me') ITEMS.splice(k, 1);
  ALBUMS.me = [];
  Object.keys(BM).forEach((k) => delete BM[k]);
  S.recent = []; S.signedIn = false; S.plan = (typeof BETA!=='undefined'&&BETA) ? 'pro' : 'free'; S.age = null; S.unread = false; S.inbox = [];
  Object.assign(USERS.me, { name: 'You', handle: 'guest', city: '', bio: '', collects: [], photo: null, followers: 0, following: 0, demo: false, uuid: null });

  function userFrom(p) {
    if (!p) return null;
    const id = me && p.id === me.id ? 'me' : p.id;
    const u = USERS[id] || (USERS[id] = { id, followers: 0, following: 0 });
    Object.assign(u, {
      id, uuid: p.id, handle: p.handle, name: p.name || p.handle, city: p.city || '', bio: p.bio || '',
      collects: p.collects || [], photo: p.avatar_url || null, private: !!p.is_private,
      allowContact: p.allow_contact !== false, founder: !!p.founder, founderNo: p.founder_no || null, founderTier: p.founder_tier || null, badges: p.badges || [], color: u.color || colorOf(p.id), demo: false,
    });
    return id;
  }
  const ownerKey = (uuid) => (me && uuid === me.id ? 'me' : uuid);

  function itemFrom(r) {
    if (r.owner) userFrom(r.owner);
    const ai = r.ai || {};
    const st = r.status === 'private' && ai._st ? ai._st : r.status;
    const x = {
      id: r.id, owner: ownerKey(r.owner_id), name: r.name, origin: r.name_origin || '', flag: r.country || '',
      brand: r.brand || '—', series: r.series || '—', year: r.year || '', grade: r.grade ?? 0,
      low: ai.low ?? null, high: ai.high ?? null, status: st, price: r.price != null ? +r.price : null, cur: r.currency || 'USD',
      title: r.title || '', desc: r.description || '', orig: ai._orig || null, owned: !!r.owned, folder: r.folder,
      photos: (r.item_photos || []).sort((a, b) => a.sort - b.sort).map((p) => pub('items', p.path)),
      art: ART, added: Date.parse(r.created_at) / 1000, saves: r.saves_count || 0, history: ai.history || '', ai, db: true, offers: !!r.open_to_offers,
    };
    const k = ITEMS.findIndex((i) => i.id === x.id);
    if (k >= 0) ITEMS[k] = Object.assign(ITEMS[k], x); else ITEMS.push(x);
    return x;
  }
  const ORIG = (o) => !o ? null : /^Original/.test(o) ? 'original' : /^Reissue/.test(o) ? 'reissue' : /^Repro/.test(o) ? 'repro' : 'unsure';
  function rowFrom(it) {
    const ai = Object.assign({}, it.ai || {});
    ['img', 'extra', 'ms'].forEach((k) => delete ai[k]);
    Object.assign(ai, { low: it.low ?? null, high: it.high ?? null, history: it.history || ai.history || '', _st: it.status, _orig: it.orig || null });
    const st = it.status === 'saved' ? 'private' : ['private', 'public', 'sale', 'sold'].includes(it.status) ? it.status : 'private';
    return {
      id: it.id, owner_id: me.id, status: st, name: String(it.name || 'Untitled').slice(0, 140), name_origin: it.origin || '',
      brand: it.brand && it.brand !== '—' ? it.brand : '', series: it.series && it.series !== '—' ? it.series : '',
      year: parseInt(it.year) || null, country: it.flag || '', grade: Number.isInteger(it.grade) ? it.grade : null,
      price: it.price || null, currency: it.price ? (it.cur || S.cur || 'USD') : null, title: it.title || '', description: it.desc || '', originality: ORIG(it.orig),
      declared_owner: st === 'sale' ? true : !!it.declared, owned: !!it.owned, folder: it.folder || null, ai, open_to_offers: st === 'public' && !!it.offers,
    };
  }

  /* ---------- loading ---------- */
  const PROFILE_COLS = 'id,handle,name,city,bio,collects,avatar_url,is_private,allow_contact,founder,founder_no,founder_tier,badges';
  const ITEM_COLS = `id,owner_id,status,name,name_origin,brand,series,year,country,grade,price,currency,title,description,originality,owned,folder,ai,saves_count,created_at,open_to_offers,item_photos(path,sort),owner:profiles!items_owner_id_fkey(${PROFILE_COLS})`;

  async function loadMarket() {
    const { data, error } = await sb.from('items').select(ITEM_COLS).in('status', ['sale', 'public']).order('created_at', { ascending: false }).limit(300);
    if (error) { console.error(error); return; }
    data.forEach(itemFrom);
    const real = ITEMS.filter((i) => i.db && i.status === 'sale').length;
    if (real >= 20) { // enough real listings: drop the samples
      for (let k = ITEMS.length - 1; k >= 0; k--) if (ITEMS[k].demo) ITEMS.splice(k, 1);
      Object.keys(USERS).forEach((k) => { if (USERS[k].demo) delete USERS[k]; });
    }
  }
  async function loadMe() {
    const { data, error } = await sb.rpc('my_profile');
    if (error || !data) { console.error(error); return false; }
    me = data;
    USERS.me.uuid = me.id;
    userFrom(me);
    S.signedIn = true;
    S.plan = (typeof BETA!=='undefined'&&BETA) || me.plan === 'pro' && (!me.pro_until || Date.parse(me.pro_until) > Date.now()) ? 'pro' : 'free';
    S.founder = me.founder; S.proUntil = me.pro_until; S.memberSince = me.created_at; S.founderTier = me.founder_tier; S.founderNo = me.founder_no;
    S.age = me.age_range;
    S.toggles.private = !!me.is_private; S.toggles.contact = me.allow_contact !== false; S.toggles.sensitive = !!me.show_sensitive && me.age_range === '18+';
    S.restrictedUntil = me.restricted_until && Date.parse(me.restricted_until) > Date.now() ? me.restricted_until : null; S.suspended = !!me.suspended;
    USERS.me.private = S.toggles.private; USERS.me.allowContact = S.toggles.contact;
    loadFp();
    // items owned by me that were mapped under my uuid before I signed in
    ITEMS.forEach((i) => { if (i.owner === me.id) i.owner = 'me'; });
    delete USERS[me.id];
    return true;
  }
  // Founder activation progress: 10 photos (collection + for sale) within 30 days
  async function loadFp() {
    const { data } = await sb.rpc('founder_progress');
    const was = S.fp && !S.fp.confirmed;
    S.fp = data || null;
    if (was && S.fp && S.fp.confirmed) toast(fpText('fp_done', { n: S.fp.no }));
    render();
  }
  L.refreshFp = loadFp;
  async function loadMine() {
    if (!me) return;
    const [mine, album, saves, follows, inbox] = await Promise.all([
      sb.from('items').select(ITEM_COLS).eq('owner_id', me.id).order('created_at', { ascending: false }),
      sb.from('album_photos').select('id,path,caption,rating,created_at').eq('owner_id', me.id).order('created_at', { ascending: false }),
      sb.from('saves').select('item_id,folder:folders(name)').eq('user_id', me.id),
      sb.from('follows').select('following_id,status').eq('follower_id', me.id),
      sb.from('contacts').select('id', { count: 'exact', head: true }).eq('to_id', me.id).is('read_at', null),
    ]);
    (mine.data || []).forEach(itemFrom);
    ALBUMS.me = (album.data || []).map((a) => ({ id: a.id, img: pub('albums', a.path), cap: a.caption || '', rating: a.rating || 'general' }));
    (saves.data || []).forEach((s) => { BM[s.item_id] = (s.folder && s.folder.name) || 'Saved'; });
    (follows.data || []).forEach((f) => S.follow.add(f.following_id));
    S.unread = (inbox.count || 0) > 0;
    const counts = await Promise.all([
      sb.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', me.id).eq('status', 'accepted'),
      sb.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', me.id),
    ]);
    USERS.me.followers = counts[0].count || 0; USERS.me.following = counts[1].count || 0;
  }
  async function loadProfileExtras(uuid) {
    if (!isUuid(uuid)) return;
    const [items, album, fr, fg] = await Promise.all([
      sb.from('items').select(ITEM_COLS).eq('owner_id', uuid).in('status', ['public', 'sale']).order('created_at', { ascending: false }),
      sb.from('album_photos').select('id,path,caption,rating').eq('owner_id', uuid).order('created_at', { ascending: false }),
      sb.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', uuid).eq('status', 'accepted'),
      sb.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', uuid),
    ]);
    (items.data || []).forEach(itemFrom);
    ALBUMS[uuid] = (album.data || []).map((a) => ({ id: a.id, img: pub('albums', a.path), cap: a.caption || '', rating: a.rating || 'general' }));
    if (USERS[uuid]) { USERS[uuid].followers = fr.count || 0; USERS[uuid].following = fg.count || 0; }
    const c = cur(); if (c.s === 'profile' && c.p && c.p.id === uuid) render();
  }

  /* ---------- sign in with a one-time email code ---------- */
  const _signupBlocked = window.signupBlocked;
  window.signup = function (title) {
    if (S.blocked) return _signupBlocked();
    S._auth = S._auth || { step: 'email', email: '', busy: false, title: title || 'Sign in or create an account' };
    sheet(() => {
      const A = S._auth;
      const head = `<div style="text-align:center;padding-top:4px"><div class="logo" style="font-size:26px">Toy<b>Scope</b></div><h3 style="margin-top:8px">${esc(A.title)}</h3></div>`;
      if (A.step === 'code') return head + `<div class="muted small" style="text-align:center;margin:4px 0 14px">We emailed a 6-digit code to <b>${esc(A.email)}</b>. It can take a minute — check spam too.</div>
        <input id="otp" class="field" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Code" style="text-align:center;font-size:22px;letter-spacing:.3em" oninput="if(this.value.replace(/\\D/g,'').length===(window.OTP_LEN||6))LIVE.verifyCode()">
        <button class="btn pri full" style="margin-top:12px" ${A.busy ? 'disabled' : ''} onclick="LIVE.verifyCode()">${A.busy ? 'Checking…' : 'Continue'}</button>
        <button class="btn full" style="margin-top:6px" onclick="S._auth.step='email';render()">Use a different email</button>`;
      return head + `<div class="muted small" style="text-align:center;margin:4px 0 14px">No password. We email you a one-time code.</div>
        <input id="em" class="field" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="${esc(A.email)}" onkeydown="if(event.key==='Enter')LIVE.sendCode()">
        <button class="btn pri full" style="margin-top:12px" ${A.busy ? 'disabled' : ''} onclick="LIVE.sendCode()">${A.busy ? 'Sending…' : 'Email me a code'}</button>
        <div class="muted xs" style="text-align:center;margin-top:12px">You must be 13 or older. ${legalLink('terms', 'Terms')} · ${legalLink('privacy', 'Privacy')}</div>`;
    });
  };
  L.sendCode = async function () {
    const A = S._auth; const email = ($('em').value || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Enter a valid email');
    A.email = email; S._lastEmail = email; A.busy = true; render();
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    A.busy = false;
    if (error) { render(); return toast(/rate|limit|seconds/i.test(error.message) ? 'Please wait a minute before asking for another code' : errMsg(error)); }
    A.step = 'code'; render(); setTimeout(() => { const o = $('otp'); if (o) o.focus(); }, 100);
  };
  L.verifyCode = async function () {
    const A = S._auth; if (A.busy) return; const token = ($('otp').value || '').replace(/\D/g, '');
    if (token.length < 6 || token.length > 8) return toast('Enter the code from your email');
    A.busy = true; render();
    const { error } = await sb.auth.verifyOtp({ email: A.email, token, type: 'email' });
    A.busy = false;
    if (error) { render(); return toast('That code didn’t work. Check it or ask for a new one.'); }
    S._auth = null;
    await afterSignIn();
  };
  async function afterSignIn() {
    if (!(await loadMe())) return toast('Could not load your account. Try again.');
    if (!me.age_range) return ageSheet();
    if (/^user_[0-9a-f]{10}$/.test(me.handle || '')) return setupProfile(() => afterSignIn());
    S.sheet = null; S.onboarded = true; LS.set('onboarded', true);
    await loadMine(); buildFeed();
    const fn = S.after; S.after = null; render(true);
    toast('Signed in as @' + me.handle);
    if (fn) setTimeout(fn, 60);
  }
  window.finishAge = async function () {
    const d = S._dob; if (!d || !d.m || !d.y) return toast('Choose your birth month and year');
    const { data, error } = await sb.rpc('set_age', { birth_month: +d.m, birth_year: +d.y });
    if (error) return toast(errMsg(error));
    if (data === 'under13') {
      await sb.auth.signOut(); me = null; S.signedIn = false; S.blocked = true; LS.set('blocked', true); S._dob = null; S.after = null;
      return sheet(() => `<h3>Sorry, you can’t create an account</h3><div class="muted small" style="margin:6px 0 16px">ToyScope is for people 13 and older. We’ve deleted the account.</div><button class="btn pri full" onclick="closeSheet()">OK</button>`);
    }
    if (d.news) sb.from('consents').insert({ user_id: me.id, kind: 'marketing', version: '2026-11' });
    sb.from('consents').insert([{ user_id: me.id, kind: 'terms', version: '2026-11-13' }, { user_id: me.id, kind: 'privacy', version: '2026-11-13' }]);
    S._dob = null; await loadMe(); await loadMine();
    if (/^user_[0-9a-f]{10}$/.test(me.handle || '')) { await new Promise((res) => setupProfile(res)); }
    S.sheet = null; const fn = S.after; S.after = null;
    toast(me.founder_tier ? fpText('fp_welcome', { n: me.founder_no }) : 'Account created');
    S.stack.push({ s: 'onboard' }); render(true); S._afterOnboard = fn;
  };
  // First-time profile: pick a username and display name
  function setupProfile(done) {
    S._setupDone = done;
    const email = (S._lastEmail || '').split('@')[0].replace(/\+.*/, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
    const sug = email.length >= 3 ? email : '';
    sheet(() => `<div style="text-align:center"><h3>Set up your profile</h3><div class="muted small" style="margin:4px 0 14px">This is how other collectors see you. You can change it later.</div></div>
      <label class="lbl">Username</label><input class="field" id="sp_h" value="${esc(sug)}" autocapitalize="none" autocorrect="off" placeholder="e.g. sentai_sony">
      <div class="muted xs" style="margin:4px 0 0">3–24 letters, numbers or _</div>
      <label class="lbl">Name</label><input class="field" id="sp_n" placeholder="Your name or nickname">
      <label class="lbl">City (optional)</label><input class="field" id="sp_c" placeholder="e.g. Vancouver, BC">
      <button class="btn pri full" style="margin-top:16px" onclick="LIVE.finishSetup()">Continue</button>`);
  }
  L.finishSetup = async function () {
    const handle = $('sp_h').value.trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(handle)) return toast('Username: 3–24 letters, numbers or _');
    const name = $('sp_n').value.trim().slice(0, 60);
    if (!name) return toast('Add your name or a nickname');
    const upd = { handle, name, city: $('sp_c').value.trim().slice(0, 60) };
    const { error } = await sb.from('profiles').update(upd).eq('id', me.id);
    if (error) return toast(/duplicate|unique/i.test(error.message) ? 'That username is taken — try another' : errMsg(error));
    Object.assign(me, upd); userFrom(me);
    const d = S._setupDone; S._setupDone = null; S.sheet = null; if (d) d();
  };
  window.SPOTS = null;
  sb.rpc('founding_spots').then(({ data }) => { if (data) { window.SPOTS = data; if (cur().s === 'explore' || S.sheet) render(); } });
  window.foundingLine = function () {
    const sp = window.SPOTS;
    if (sp && sp.lifetime_left > 0) return fpText('fp_line_life', { n: sp.lifetime_left });
    if (sp && sp.founding_left > 0) return fpText('fp_line_found', { n: sp.founding_left });
    return 'Create a free account to browse, save and message sellers.';
  };
  // Guests: the Pro sheet invites them to join instead of a trial
  const _paywall = window.paywall;
  window.paywall = function (why, after) {
    if (S.signedIn) return _paywall(why, after);
    const head = why === 'sell' ? 'Sign up to sell' : why === 'scan' ? 'Sign up to scan' : 'Join ToyScope';
    S._proAfter = after || null;
    sheet(() => `<div style="text-align:center;padding-top:4px"><div class="logo" style="font-size:26px">Toy<b>Scope</b></div><h3 style="margin-top:8px">${head}</h3>
      <div class="muted small" style="margin:6px 0 14px">${foundingLine()}</div></div>
      <button class="btn pri full" onclick="const f=S._proAfter;S._proAfter=null;S.sheet=null;need(f||(()=>{}))">Create free account</button>
      <button class="btn full" style="margin-top:6px" onclick="S._proAfter=null;closeSheet()">Keep browsing for free</button>`);
  };
  L.signOut = async function () {
    await sb.auth.signOut();
    try { localStorage.removeItem('ts_auth'); } catch (e) { }
    location.reload();
  };
  window.startTrial = function () {
    const after = S._proAfter; S._proAfter = null;
    const go2 = () => {
      if (S.plan === 'pro') { closeSheet(); toast(S.founderTier === 'lifetime' ? 'Founder · Pro is free for life' : S.founder ? 'Founding Collector · Pro is active' : 'Pro is active'); if (after) setTimeout(after, 60); }
      else { closeSheet(); toast('Founding spots are full. Paid Pro is coming soon.'); }
    };
    if (!S.signedIn) { S.sheet = null; return need(go2); }
    go2();
  };

  /* ---------- my items, photos, selling ---------- */
  async function saveItemRow(it) {
    const row = rowFrom(it);
    const { error } = await sb.from('items').upsert(row);
    if (error) { error.stage = 'row'; throw error; }
    // photos: upload any local ones, then rewrite the photo list
    const srcs = (it.photos && it.photos.length ? it.photos : it.img ? [it.img] : []).slice(0, 12);
    const urls = [];
    for (let k = 0; k < srcs.length; k++) {
      const p = srcs[k];
      if (/^https?:/.test(p)) { urls.push(p); continue; }
      const path = `${me.id}/${it.id}/${Date.now()}_${k}.jpg`;
      const bl = await toBlob(p);
      const up = await sb.storage.from('items').upload(path, bl, { contentType: bl.type, upsert: true });
      if (up.error) throw up.error;
      urls.push(pub('items', path));
    }
    await sb.from('item_photos').delete().eq('item_id', it.id);
    if (urls.length) {
      const { error: e2 } = await sb.from('item_photos').insert(urls.map((u, k) => ({ item_id: it.id, owner_id: me.id, path: pathOf('items', u), sort: k })));
      if (e2) throw e2;
    }
    it.photos = urls; it.img = null; it.db = true;
  }
  L.saveItem = async function (it) {
    if (!me) return;
    try { await saveItemRow(it); } catch (e) { console.error(e); toast('Couldn’t save to your account: ' + errMsg(e)); }
  };
  L.postSale = async function (it) {
    if (!me) return;
    it.declared = true; it.status = 'sale';
    try { await saveItemRow(it); toast('Your listing is live'); loadFp(); }
    catch (e) {
      console.error(e);
      if (e.stage === 'row') { it.status = 'private'; buildFeed(); render(); toast(errMsg(e)); }
      else toast('Listing is live, but a photo didn’t upload. Edit the listing to try again.');
    }
  };
  L.itemUpdate = async function (id) {
    const it = item(id); if (!it || !me || it.owner !== 'me') return;
    const { error } = await sb.from('items').update({ status: it.status === 'saved' ? 'private' : it.status, ai: Object.assign({}, it.ai || {}, { _st: it.status }) }).eq('id', id);
    if (error) toast(errMsg(error));
  };

  /* ---------- profile, avatar, collection photos ---------- */
  L.avatar = async function (dataUrl) {
    if (!me) return;
    const path = `${me.id}/avatar.jpg`;
    const up = await sb.storage.from('avatars').upload(path, await toBlob(dataUrl), { contentType: 'image/jpeg', upsert: true });
    if (up.error) return toast(errMsg(up.error));
    const url = pub('avatars', path) + '?v=' + Date.now();
    await sb.from('profiles').update({ avatar_url: url }).eq('id', me.id);
    USERS.me.photo = url;
  };
  // Checks a photo against the community rules before it is shared
  L.moderate = async function (dataUrl) {
    try {
      const res = await fetch('/api/moderate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-ToyScope': '1', Authorization: 'Bearer ' + (window._tok || '') }, body: JSON.stringify({ image: dataUrl }) });
      const d = await res.json(); return d.rating || 'unchecked';
    } catch (e) { return 'unchecked'; }
  };
  L.translate = async function (title, text, to) {
    if (!me) return { error: 'Sign in to translate' };
    try {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-ToyScope': '1', Authorization: 'Bearer ' + (window._tok || '') }, body: JSON.stringify({ title, text, to }) });
      const d = await res.json(); return res.ok ? d : { error: d.error || 'Translation is not available right now.' };
    } catch (e) { return { error: 'Translation is not available right now.' }; }
  };
  L.feedback = async function (f) {
    if (!me) return false;
    const { error } = await sb.from('feedback').insert(Object.assign({ user_id: me.id, app_version: 'web-beta' }, f));
    if (error) { toast(errMsg(error)); return false; } return true;
  };
  L.setSensitive = async function (on) { if (me) await sb.from('profiles').update({ show_sensitive: !!on }).eq('id', me.id); };
  L.album = async function (e2) {
    if (!me) return;
    const rating = /^data:/.test(e2.img || '') ? await L.moderate(e2.img) : 'general';
    if (rating === 'prohibited') { (ALBUMS.me || []).splice((ALBUMS.me || []).indexOf(e2) >>> 0, 1); render(); return blockedSheet(); }
    e2.rating = rating === 'sensitive' ? 'sensitive' : 'general';
    const path = `${me.id}/${e2.id}.jpg`;
    const up = await sb.storage.from('albums').upload(path, await toBlob(e2.img), { contentType: 'image/jpeg', upsert: true });
    if (up.error) return toast(errMsg(up.error));
    const { error } = await sb.from('album_photos').insert({ id: e2.id, owner_id: me.id, path, caption: e2.cap || '', rating: e2.rating });
    if (error) return toast(errMsg(error));
    e2.img = pub('albums', path);
    loadFp();
  };
  L.albumDelete = async function (id) {
    if (!me || !isUuid(id)) return;
    await sb.from('album_photos').delete().eq('id', id);
    await sb.storage.from('albums').remove([`${me.id}/${id}.jpg`]);
  };
  window.editProfile = function () {
    sheet(() => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:6px"><div onclick="$('avatarin').click()" style="cursor:pointer">${av('me', 84)}</div><button class="link small" onclick="$('avatarin').click()">Change profile photo</button></div><h3>Edit profile</h3>
      <label class="lbl">Username</label><input class="field" id="ep_h" value="${esc(USERS.me.handle)}" autocapitalize="none" placeholder="letters, numbers, _">
      <label class="lbl">Name</label><input class="field" value="${esc(USERS.me.name)}" id="ep_n">
      <label class="lbl">Bio — what do you collect?</label><textarea class="field" rows="3" id="ep_b">${esc(USERS.me.bio)}</textarea>
      <label class="lbl">City (we never show more than the city)</label><input class="field" value="${esc(USERS.me.city)}" id="ep_c">
      <button class="btn pri full" style="margin-top:16px" onclick="LIVE.saveProfile()">Save</button>`);
  };
  L.saveProfile = async function () {
    if (!me) return need(() => editProfile());
    const handle = $('ep_h').value.trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(handle)) return toast('Username: 3–24 letters, numbers or _');
    const upd = { handle, name: $('ep_n').value.trim().slice(0, 60), bio: $('ep_b').value.trim().slice(0, 300), city: $('ep_c').value.trim().slice(0, 60) };
    const { error } = await sb.from('profiles').update(upd).eq('id', me.id);
    if (error) return toast(/duplicate|unique/i.test(error.message) ? 'That username is taken' : errMsg(error));
    Object.assign(me, upd); userFrom(me); closeSheet(); toast('Profile updated');
  };
  const _flip = window.flip;
  window.flip = function (k) {
    _flip(k);
    if (me && (k === 'private' || k === 'contact')) {
      sb.from('profiles').update({ is_private: S.toggles.private, allow_contact: S.toggles.contact }).eq('id', me.id).then(({ error }) => {
        if (error) { toast('Under-18 accounts stay private'); _flip(k); }
      });
    }
  };

  /* ---------- social: follow, bookmarks ---------- */
  L.follow = async function (id, on) {
    const U = USERS[id]; if (!me || !U || U.demo) return;
    if (on) { const { error } = await sb.from('follows').insert({ follower_id: me.id, following_id: U.uuid }); if (error && !/duplicate/i.test(error.message)) toast(errMsg(error)); }
    else await sb.from('follows').delete().eq('follower_id', me.id).eq('following_id', U.uuid);
  };
  async function folderId(name) {
    const { data } = await sb.from('folders').select('id').eq('owner_id', me.id).eq('name', name).maybeSingle();
    if (data) return data.id;
    const ins = await sb.from('folders').insert({ owner_id: me.id, name }).select('id').single();
    return ins.data && ins.data.id;
  }
  L.bookmark = async function (itemId, folder) {
    const it = item(itemId); if (!me || !it || it.demo) return;
    const fid = await folderId(folder || 'Saved');
    const { error } = await sb.from('saves').upsert({ user_id: me.id, item_id: itemId, folder_id: fid });
    if (error) toast(errMsg(error));
  };
  L.unbookmark = async function (itemId) {
    if (!me || !isUuid(itemId)) return;
    await sb.from('saves').delete().eq('user_id', me.id).eq('item_id', itemId);
  };

  /* ---------- messages to sellers (in-app inbox) ---------- */
  window.sendContact = async function () {
    const msg = $('msg').value.trim();
    if (msg.length < 10) return toast('Write a short message first');
    S._draft = $('msg').value;
    if (!S.signedIn) return need(() => setTimeout(sendContact, 80));
    const p = cur().p; const U = USERS[p.u];
    if (!U || U.demo) return toast('This is a sample collector. Contact a real listing.');
    if (isMinor()) return needAdult(() => { }, 'Contact');
    const offerRaw = parseFloat((($('offer') || {}).value || '').replace(/[^0-9.]/g, '')) || null;
    const offer = offerRaw ? Math.round(toUSD(offerRaw, S.cur) * 100) / 100 : null;
    const { error } = await sb.from('contacts').insert({ from_id: me.id, to_id: U.uuid, item_id: isUuid(p.item) ? p.item : null, body: msg, offer });
    if (error) return toast(errMsg(error));
    S._draft = null; S.contactsLeft = Math.max(0, S.contactsLeft - 1); p.sent = true; render(true);
  };
  async function loadInbox() {
    if (!me) return;
    const { data, error } = await sb.from('contacts')
      .select(`id,from_id,to_id,item_id,body,offer,read_at,created_at,sender:profiles!contacts_from_id_fkey(${PROFILE_COLS}),receiver:profiles!contacts_to_id_fkey(${PROFILE_COLS}),item:items(id,name,title)`)
      .or(`to_id.eq.${me.id},from_id.eq.${me.id}`).order('created_at', { ascending: false }).limit(100);
    if (error) { console.error(error); return; }
    data.forEach((m) => { userFrom(m.sender); userFrom(m.receiver); });
    S.inbox = data; S.unread = data.some((m) => m.to_id === me.id && !m.read_at);
  }
  const ago = (t) => { const s = (Date.now() - Date.parse(t)) / 1000; return s < 3600 ? Math.max(1, Math.round(s / 60)) + 'm' : s < 86400 ? Math.round(s / 3600) + 'h' : Math.round(s / 86400) + 'd'; };
  const _notifs = SCR.notifs;
  SCR.notifs = function () {
    if (!S.signedIn) return `<div class="hdr"><h1>Activity</h1></div><div class="empty" style="padding:40px 24px">Sign in to see messages from buyers and sellers.<br><button class="btn pri" style="margin-top:14px" onclick="need(()=>tab('notifs'))">Sign in</button></div>`;
    const box = S.inbox || [];
    const row = (m) => {
      const inb = m.to_id === me.id; const other = inb ? ownerKey(m.from_id) : ownerKey(m.to_id); const U = USERS[other] || { handle: '?' };
      return `<div class="li" style="border-bottom:1px solid var(--border);align-items:flex-start;cursor:pointer;${inb && !m.read_at ? 'background:var(--accentSoft)' : ''}" onclick="LIVE.openMsg('${m.id}')">${av(other, 40)}<div class="grow small" style="min-width:0"><div><b>${esc(U.handle)}</b> <span class="muted">· ${inb ? 'to you' : 'you sent'} · ${ago(m.created_at)}</span></div>${m.item ? `<div class="muted xs ell">About: ${esc(m.item.title || m.item.name)}</div>` : ''}<div class="ell">${m.offer ? `<b>Offer ${money(+m.offer)}</b> · ` : ''}${esc(m.body)}</div></div></div>`;
    };
    return `<div class="hdr"><h1>Activity</h1><button class="ib" onclick="LIVE.refreshInbox()" aria-label="Refresh">${ic('bolt', 1.8)}</button></div>
      <div class="sec"><h3>Messages</h3></div>${box.length ? box.map(row).join('') : `<div class="pad muted small">No messages yet. When a buyer contacts you about a listing, it shows up here.</div>`}
      <div class="pad muted xs" style="padding-top:14px">Your email address is never shown to other collectors.</div>`;
  };
  L.refreshInbox = async function () { await loadInbox(); render(); };
  L.openMsg = function (id) {
    const m = (S.inbox || []).find((x) => x.id === id); if (!m) return;
    const inb = m.to_id === me.id; const other = inb ? ownerKey(m.from_id) : ownerKey(m.to_id); const U = USERS[other];
    if (inb && !m.read_at) { m.read_at = new Date().toISOString(); sb.from('contacts').update({ read_at: m.read_at }).eq('id', id); S.unread = (S.inbox || []).some((x) => x.to_id === me.id && !x.read_at); }
    sheet(() => `<div class="row" style="gap:10px;margin-bottom:10px">${av(other, 44)}<div class="grow"><b>@${esc(U.handle)}</b><div class="muted xs">${new Date(m.created_at).toLocaleString()}</div></div></div>
      ${m.item ? `<div class="muted small" style="margin-bottom:8px">About: <a class="link" onclick="closeSheet();openItem('${m.item.id}')">${esc(m.item.title || m.item.name)}</a></div>` : ''}
      ${m.offer ? `<div style="font-weight:700;margin-bottom:6px">Offer: ${money(+m.offer)}</div>` : ''}
      <div class="card" style="padding:12px;white-space:pre-wrap">${esc(m.body)}</div>
      <div class="warn b xs" style="margin-top:12px">${ic('info', 2, 'width="16" height="16" style="flex:none"')}<div>Never pay by wire transfer or gift card. Meet in a public place for pickup.</div></div>
      ${inb ? `<button class="btn pri full" style="margin-top:12px" onclick="closeSheet();contactFor('${other}'${m.item_id ? `,'${m.item_id}'` : ''})">Reply</button>` : ''}
      <button class="btn full" style="margin-top:6px" onclick="openUser('${other}');closeSheet()">View profile</button>`);
  };

  /* ---------- report, block, delete, export ---------- */
  window.postMenu = function () {
    const c = cur(); let t = null;
    if (c.s === 'item') { const it = item(c.p.id); if (it && it.owner !== 'me') t = { type: 'item', id: it.id, user: it.owner, demo: it.demo }; }
    else if (c.s === 'profile') { const U = USERS[c.p.id]; if (U && c.p.id !== 'me') t = { type: 'user', id: U.uuid, user: c.p.id, demo: U.demo }; }
    S._rep = t;
    sheet(() => `<div class="list" style="margin:0">${t ? `<div class="li" onclick="LIVE.reportSheet()">${ic('flag', 1.8)}<span class="grow">Report ${t.type === 'item' ? 'listing' : 'collector'}</span></div><div class="li" onclick="LIVE.block()">${ic('block', 1.8)}<span class="grow">Block @${esc((USERS[t.user] || {}).handle || '')}</span></div>` : ''}<div class="li" onclick="closeSheet();copy(location.origin)">${ic('copy', 1.8)}<span class="grow">Copy link</span></div></div><button class="btn sec2 full" style="margin-top:12px" onclick="closeSheet()">Cancel</button>`);
  };
  L.reportSheet = function () {
    const t = S._rep; if (!t) return;
    sheet(() => `<h3>Why are you reporting this?</h3><div class="list" style="margin:10px 0 0">${['Sold as original but looks fake or reproduced', 'Scam or suspicious', 'Stolen photos', 'Offensive or not a toy', 'Something else'].map((r) => `<div class="li" onclick="LIVE.report(${esc(JSON.stringify(r))})">${esc(r)}</div>`).join('')}</div>`);
  };
  L.report = function (reason) {
    const t = S._rep; if (!t) return closeSheet();
    need(async () => {
      if (!t.demo) { const { error } = await sb.from('reports').insert({ reporter_id: me.id, target_type: t.type, target_id: t.id, reason }); if (error) return toast(errMsg(error)); }
      closeSheet(); toast('Thanks — we review reports within 24 hours');
    });
  };
  L.block = function () {
    const t = S._rep; if (!t) return closeSheet();
    need(async () => {
      const U = USERS[t.user];
      if (!t.demo && U) { const { error } = await sb.from('blocks').insert({ user_id: me.id, blocked_id: U.uuid }); if (error && !/duplicate/i.test(error.message)) return toast(errMsg(error)); }
      for (let k = ITEMS.length - 1; k >= 0; k--) if (ITEMS[k].owner === t.user) ITEMS.splice(k, 1);
      closeSheet(); S.stack = []; S.tab = 'explore'; buildFeed(); render(true); toast('Blocked. You won’t see them again.');
    });
  };
  window.deleteAccount = async function () {
    if (me) { const { error } = await sb.rpc('delete_my_account'); if (error) return toast(errMsg(error)); await sb.auth.signOut(); }
    try { Object.keys(localStorage).filter((k) => k.startsWith('ts_')).forEach((k) => localStorage.removeItem(k)); } catch (e) { }
    location.reload();
  };
  const _export = window.exportData;
  window.exportData = async function () {
    if (!me) return _export();
    const [items, album, saves, follows, msgs, consents] = await Promise.all([
      sb.from('items').select('*,item_photos(path)').eq('owner_id', me.id), sb.from('album_photos').select('*').eq('owner_id', me.id),
      sb.from('saves').select('*').eq('user_id', me.id), sb.from('follows').select('*').eq('follower_id', me.id),
      sb.from('contacts').select('*').or(`to_id.eq.${me.id},from_id.eq.${me.id}`), sb.from('consents').select('*').eq('user_id', me.id),
    ]);
    S._export = JSON.stringify({ account: me, items: items.data, collection_photos: album.data, saved: saves.data, following: follows.data, messages: msgs.data, consents: consents.data }, null, 2);
    sheet(() => `<h3>Your data</h3><div class="muted small" style="margin-bottom:10px">Everything ToyScope holds about you.</div><textarea class="field" rows="10" style="font-family:monospace;font-size:11.5px" readonly>${esc(S._export)}</textarea><button class="btn pri full" style="margin-top:12px" onclick="copy(S._export)">Copy</button>`);
  };

  /* ---------- screens that differ for signed-out visitors ---------- */
  const _me = SCR.me;
  SCR.me = function (p) {
    if (!S.signedIn) return `<div class="hdr"><h1>Me</h1><button class="ib" onclick="go('settings')">${ic('gear', 1.8)}</button></div><div class="empty" style="padding:40px 24px">Create a free account to keep your collection, follow collectors and message sellers.<br><button class="btn pri" style="margin-top:14px" onclick="need(()=>tab('me'))">Sign in or sign up</button></div>`;
    return _me(p);
  };
  const _go = window.go;
  window.go = function (s, p) { if (s === 'profile' && p && isUuid(p.id)) loadProfileExtras(p.id); return _go(s, p); };
  const _tab = window.tab;
  window.tab = function (n) { _tab(n); if (n === 'notifs' && me) loadInbox().then(() => { if (cur().s === 'notifs') render(); }); };

  /* ---------- boot ---------- */
  sb.auth.onAuthStateChange((_e, session) => { window._tok = session ? session.access_token : null; });
  (async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    window._tok = session ? session.access_token : null;
    if (session && (await loadMe())) await loadMine();
    await loadMarket();
    buildFeed(); render();
    // signed in but never finished setup (e.g. signed up on an older version)
    if (me && !me.age_range) ageSheet();
    else if (me && /^user_[0-9a-f]{10}$/.test(me.handle || '')) setupProfile(() => { render(); toast('Profile saved'); });
  })();
})();
