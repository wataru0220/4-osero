// ===== 栗駒見積帳 画面 =====
// window.MQ_ROLE = "staff"（index.html＝担当者）/ "admin"（admin.html＝管理者）
(function () {
  "use strict";
  const CFG = window.MITSUMORI_CONFIG || {};
  const ROLE = window.MQ_ROLE || "staff";
  const ADMIN = ROLE === "admin";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const yen = (n) => (Math.round(Number(n) || 0)).toLocaleString("ja-JP");
  const pct = (r) => (isFinite(r) ? (r * 100).toFixed(1) : "-") + "%";
  const today = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const { num, has } = MQ;
  const STATUS = ["見積中", "提出済", "受注", "失注", "完了"];
  const STATUS_CLS = { 見積中: "st-draft", 提出済: "st-sent", 受注: "st-won", 失注: "st-lost", 完了: "st-done" };

  const S = { ck: null, base: "", profile: {}, settings: {}, staff: {}, prices: {}, projects: {}, invoices: {}, me: "", route: [], images: {}, ready: false };
  const main = () => $("#main");

  // ---------- トースト・モーダル ----------
  function toast(msg, ms) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), ms || 2600); }
  function modal(html, onMount) {
    const m = $("#modal"); m.innerHTML = `<div class="modal-box">${html}</div>`; m.hidden = false;
    m.onclick = (e) => { if (e.target === m || e.target.closest("[data-close]")) closeModal(); };
    onMount && onMount(m);
    return m;
  }
  function closeModal() { const m = $("#modal"); m.hidden = true; m.innerHTML = ""; }
  function ask(title, label, val, cb) {
    modal(`<h3>${esc(title)}</h3><label class="fld">${esc(label)}<input id="askv" value="${esc(val || "")}" inputmode="decimal"></label>
      <div class="row-end"><button class="btn" data-close>やめる</button><button class="btn pri" id="askok">OK</button></div>`, (m) => {
      const i = $("#askv", m); i.focus(); i.select();
      const ok = () => { const v = i.value; closeModal(); cb(v); };
      $("#askok", m).onclick = ok; i.onkeydown = (e) => { if (e.key === "Enter") ok(); };
    });
  }

  // ---------- 起動 ----------
  async function boot() {
    const qs = new URLSearchParams(location.search);
    if (DB.demo) S.ck = "demo";
    else if (DB.mode === "local") S.ck = "local";
    else S.ck = qs.get("c") || localStorage.getItem("mq_company") || "";
    if (S.ck && DB.mode === "firebase") localStorage.setItem("mq_company", S.ck);
    $("#modeBadge").textContent = DB.demo ? "体験版" : DB.mode === "local" ? "お試し（この端末だけ）" : "共有";
    if (!S.ck) return renderSetup();
    S.base = "companies/" + S.ck;
    await DB.ready;
    if (DB.demo || DB.mode === "local") {
      const p = await DB.get(S.base + "/profile");
      if (!p) await seed(DB.demo);
    }
    S.me = localStorage.getItem("mq_me_" + S.ck) || "";
    let first = true;
    const onAny = () => { if (!S.ready) return; scheduleRender(); };
    DB.on(S.base + "/profile", (v) => { S.profile = v || {}; onAny(); if (first && v != null) { first = false; } });
    DB.on(S.base + "/settings", (v) => { S.settings = Object.assign({}, MQ.DEFAULT_SETTINGS, v || {}); onAny(); });
    DB.on(S.base + "/staff", (v) => { S.staff = v || {}; onAny(); });
    DB.on(S.base + "/prices", (v) => { S.prices = v || {}; onAny(); });
    DB.on(S.base + "/projects", (v) => { mergeProjects(v || {}); onAny(); });
    DB.on(S.base + "/invoices", (v) => { S.invoices = v || {}; onAny(); });
    await DB.get(S.base + "/profile");
    setTimeout(async () => {
      S.ready = true;
      if (!S.profile || !S.profile.name) { if (ADMIN) return renderCompanyCreate(); return renderNoCompany(); }
      if (ADMIN && S.profile.pinHash && sessionStorage.getItem("mq_pin_" + S.ck) !== S.profile.pinHash) return renderPin();
      if (!ADMIN && !S.me) return renderWho();
      startRouter();
    }, DB.mode === "firebase" ? 600 : 0);
  }
  // 自分が編集中の案件は、保存待ちの間だけ手元を優先
  function mergeProjects(v) {
    const pend = savePending;
    Object.keys(v).forEach((id) => { if (!(pend[id])) S.projects[id] = normProject(v[id]); });
    Object.keys(S.projects).forEach((id) => { if (!v[id] && !pend[id]) delete S.projects[id]; });
  }
  function normProject(p) {
    p.lines = Array.isArray(p.lines) ? p.lines : p.lines ? Object.values(p.lines) : [];
    p.subsidy = Array.isArray(p.subsidy) ? p.subsidy : p.subsidy ? Object.values(p.subsidy) : [];
    p.drawings = p.drawings || {};
    ["genkyo", "kansei"].forEach((k) => { const d = p.drawings[k]; if (d) d.shapes = Array.isArray(d.shapes) ? d.shapes : d.shapes ? Object.values(d.shapes) : []; });
    p.margin = p.margin || { mode: "std", rate: S.settings.targetMargin || 0.25 };
    return p;
  }

  // ---------- 保存 ----------
  const savePending = {};
  let saveTimer = null;
  function saveProject(p, now) {
    p.updated = Date.now();
    S.projects[p.id] = p;
    savePending[p.id] = true;
    clearTimeout(saveTimer);
    const go = () => {
      const ids = Object.keys(savePending);
      ids.forEach((id) => { delete savePending[id]; const pp = S.projects[id]; if (pp) DB.set(S.base + "/projects/" + id, JSON.parse(JSON.stringify(pp))).catch((e) => toast("保存できません：" + (e.code || e.message))); });
      setSaved();
    };
    if (now) go(); else saveTimer = setTimeout(go, 700);
    $("#saveState") && ($("#saveState").textContent = "保存中…");
  }
  function setSaved() { const s = $("#saveState"); if (s) s.textContent = "保存済み"; }

  // ---------- 描画の予約（入力中は待つ） ----------
  let renderQ = false;
  function scheduleRender() {
    if (renderQ) return; renderQ = true;
    requestAnimationFrame(() => {
      renderQ = false;
      const a = document.activeElement;
      if (a && main() && main().contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { a.addEventListener("blur", scheduleRender, { once: true }); return; }
      if (S.route[0] === "p" && S.route[2] === "zumen") { refreshZumenSide(); return; } // 図面のキャンバスは作り直さない
      render();
    });
  }

  // ---------- ルーター ----------
  function startRouter() { window.addEventListener("hashchange", render); renderNav(); render(); }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  function renderNav() {
    const items = ADMIN
      ? [["#/dash", "📊 一括管理"], ["#/list", "📁 案件"], ["#/bills", "💰 請求・入金"], ["#/inv", "🧾 業者請求・原価"], ["#/prices", "💴 単価表・学習"], ["#/settings", "⚙ 設定"]]
      : [["#/list", "📁 案件"], ["#/bills", "💰 請求・入金"], ["#/inv", "🧾 業者の請求書"], ["#/prices", "💴 単価表"], ["#/me", "👤 " + esc(S.me || "担当者")]];
    $("#nav").innerHTML = items.map(([h, t]) => `<a href="${h}" data-h="${h}">${t}</a>`).join("");
    $("#coName").textContent = S.profile.name || "";
  }
  function render() {
    const h = location.hash || (ADMIN ? "#/dash" : "#/list");
    S.route = h.replace(/^#\//, "").split("/");
    $$("#nav a").forEach((a) => a.classList.toggle("on", h.indexOf(a.dataset.h) === 0 || (S.route[0] === "p" && a.dataset.h === "#/list")));
    $("#coName").textContent = S.profile.name || "";
    const r = S.route[0];
    if (r === "p") return renderProject(S.route[1], S.route[2] || "info");
    if (r === "inv") return renderInvoices();
    if (r === "prices") return renderPrices();
    if (r === "settings" && ADMIN) return renderSettings();
    if (r === "me") return renderWho(true);
    if (r === "bills") return renderBills();
    if (r === "dash" && ADMIN) return renderDash();
    return renderList();
  }

  // ---------- 会社の登録・担当者の選択 ----------
  function renderSetup() {
    main().innerHTML = `<div class="card narrow"><h2>栗駒見積帳</h2>
      ${ADMIN ? `<p>会社を登録すると、管理リンク（この画面）と担当者用リンクが発行されます。</p><button class="btn pri" id="mk">会社を登録する</button>`
        : `<p>管理者から届いた<b>会社リンク</b>を開いてください。</p>`}
      <p class="muted">試しに使うだけなら <a href="?demo=1">体験版（サンプル入り）</a></p></div>`;
    $("#mk") && ($("#mk").onclick = () => { S.ck = randKey(); localStorage.setItem("mq_company", S.ck); history.replaceState(null, "", "?c=" + S.ck); boot(); });
  }
  function randKey() { const a = new Uint8Array(15); crypto.getRandomValues(a); return Array.from(a, (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join(""); }
  function renderNoCompany() { main().innerHTML = `<div class="card narrow"><h2>会社が見つかりません</h2><p>リンクが正しいか管理者に確認してください。</p><p><a href="?demo=1">体験版</a></p></div>`; }
  function renderCompanyCreate() {
    main().innerHTML = `<div class="card narrow"><h2>会社の登録</h2>
      <label class="fld">会社名<input id="cn" value="有限会社栗駒建業"></label>
      <label class="fld">あなた（管理者）の名前<input id="an" placeholder="例：高橋"></label>
      <label class="fld">管理者の暗証番号（4〜8桁・任意）<input id="pin" inputmode="numeric" maxlength="8"></label>
      <p class="muted">暗証番号は管理画面を開くときの簡易な鍵です（担当者用の画面には不要）。</p>
      <button class="btn pri" id="ok">登録</button></div>`;
    $("#ok").onclick = async () => {
      const name = $("#cn").value.trim(), an = $("#an").value.trim() || "管理者", pin = $("#pin").value.trim();
      if (!name) return toast("会社名を入れてください");
      const pinHash = pin ? await sha(S.ck + pin) : "";
      await DB.set(S.base + "/profile", { name, created: Date.now(), pinHash, address: "", tel: "", regNo: "", rep: "", bank: "" });
      await DB.set(S.base + "/settings", MQ.DEFAULT_SETTINGS);
      await DB.set(S.base + "/prices", MQ.defaultPrices());
      await DB.set(S.base + "/staff/" + MQ.uid("s"), { name: an, role: "admin" });
      if (pinHash) sessionStorage.setItem("mq_pin_" + S.ck, pinHash);
      localStorage.setItem("mq_me_" + S.ck, an); S.me = an;
      toast("登録しました"); setTimeout(() => { startRouter(); go("#/settings"); }, 300);
    };
  }
  async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join(""); }
  function renderPin() {
    main().innerHTML = `<div class="card narrow"><h2>管理者の暗証番号</h2><input id="pin" inputmode="numeric" type="password" class="big"><button class="btn pri" id="ok">開く</button></div>`;
    const ok = async () => { if ((await sha(S.ck + $("#pin").value.trim())) === S.profile.pinHash) { sessionStorage.setItem("mq_pin_" + S.ck, S.profile.pinHash); startRouter(); } else toast("暗証番号が違います"); };
    $("#ok").onclick = ok; $("#pin").onkeydown = (e) => e.key === "Enter" && ok(); $("#pin").focus();
  }
  function renderWho(again) {
    const list = Object.values(S.staff).map((s) => s.name);
    main().innerHTML = `<div class="card narrow"><h2>${again ? "担当者の切り替え" : "あなたはどなたですか？"}</h2>
      <div class="chips">${list.map((n) => `<button class="chip ${n === S.me ? "on" : ""}" data-n="${esc(n)}">${esc(n)}</button>`).join("") || '<p class="muted">担当者が未登録です。管理者に登録してもらうか、下に名前を入れてください。</p>'}</div>
      <label class="fld">名簿にない場合<input id="nn" placeholder="名前"></label><button class="btn" id="ok">この名前で使う</button></div>`;
    const set = (n) => { if (!n) return; S.me = n; localStorage.setItem("mq_me_" + S.ck, n); if (!list.includes(n)) DB.set(S.base + "/staff/" + MQ.uid("s"), { name: n, role: "staff" }); if (!S.route.length || !again) startRouter(); else { renderNav(); go("#/list"); } };
    $$(".chip[data-n]").forEach((b) => (b.onclick = () => set(b.dataset.n)));
    $("#ok").onclick = () => set($("#nn").value.trim());
  }

  // ---------- 案件一覧 ----------
  function projList() { return Object.values(S.projects).sort((a, b) => (b.updated || 0) - (a.updated || 0)); }
  function renderList() {
    const mineOnly = !ADMIN && localStorage.getItem("mq_mine") !== "0";
    const q = (sessionStorage.getItem("mq_q") || "").trim();
    const ps = projList().filter((p) => (!mineOnly || p.staff === S.me) && (!q || (p.name + p.client + p.no).indexOf(q) >= 0));
    main().innerHTML = `<div class="bar"><h2>案件</h2><input id="q" placeholder="検索（工事名・施主・番号）" value="${esc(q)}">
      ${ADMIN ? "" : `<label class="sw"><input type="checkbox" id="mine" ${mineOnly ? "checked" : ""}> 自分の案件だけ</label>`}
      <button class="btn pri" id="new">＋ 新しい見積</button></div>
      <div class="cards">${ps.map(projCard).join("") || '<p class="muted pad">案件はまだありません。「＋ 新しい見積」から始めます。</p>'}</div>`;
    $("#new").onclick = newProject;
    $("#q").oninput = (e) => { sessionStorage.setItem("mq_q", e.target.value); clearTimeout(renderList.t); renderList.t = setTimeout(() => { renderList(); const i = $("#q"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
    $("#mine") && ($("#mine").onchange = (e) => { localStorage.setItem("mq_mine", e.target.checked ? "1" : "0"); renderList(); });
  }
  function projCard(p) {
    const c = MQ.calc(p, S.settings);
    const tg = S.settings.targetMargin;
    return `<a class="pcard" href="#/p/${p.id}/est"><div class="pc-top"><span class="st ${STATUS_CLS[p.status] || ""}">${esc(p.status || "見積中")}</span><span class="muted">${esc(p.no || "")}</span></div>
      <div class="pc-name">${esc(p.name || "（無題）")}</div><div class="muted">${esc(p.client || "")} ／ 担当 ${esc(p.staff || "-")}</div>
      <div class="pc-amt">¥${yen(c.total)}<small>税込</small></div>
      <div class="pc-foot">粗利 ${pct(c.grossRate)} <span class="judge ${judge(c.grossRate, tg)}">${judgeMark(c.grossRate, tg)}</span>${c.subsidy ? ` ／ 補助金 ¥${yen(c.subsidy)}` : ""}</div></a>`;
  }
  const judge = (r, t) => (r >= t ? "ok" : r >= t - 0.1 ? "mid" : "ng");
  const judgeMark = (r, t) => (r >= t ? "◎" : r >= t - 0.1 ? "△" : "×");
  function newProject() {
    const y = new Date().getFullYear();
    const n = Object.values(S.projects).reduce((m, p) => { const mt = String(p.no || "").match(new RegExp("^M-" + y + "-(\\d+)")); return mt ? Math.max(m, +mt[1]) : m; }, 0) + 1;
    const p = normProject({ id: MQ.uid("P"), no: `M-${y}-${String(n).padStart(4, "0")}`, name: "", client: "", address: "", site: "", kind: "リフォーム", date: today(), validDays: 30, start: "", end: "",
      summary: "", staff: S.me || "", status: "見積中", created: Date.now(), lines: [], subsidy: [], nebiki: 0, margin: { mode: "std", rate: S.settings.targetMargin }, pay: [0.3, 0.4, 0.3], drawings: {} });
    saveProject(p, true);
    go(`#/p/${p.id}/info`);
  }

  // ---------- 案件の編集 ----------
  const TABS = [["info", "基本情報"], ["zumen", "① 図面から計算"], ["est", "② 見積明細"], ["kin", "⑤ 金額・利益率"], ["doc", "見積書"], ["keiyaku", "契約書"], ["seikyu", "請求書"], ["cost", "④ 原価実行"]];
  function renderProject(id, tab) {
    const p = S.projects[id];
    if (!p) { main().innerHTML = `<div class="card narrow"><p>案件が見つかりません。</p><a href="#/list">一覧へ</a></div>`; return; }
    const c = MQ.calc(p, S.settings);
    main().innerHTML = `<div class="phead"><a href="#/list" class="back">← 一覧</a><div class="ph-title"><b>${esc(p.name || "（無題）")}</b><span class="muted">${esc(p.no)} ${esc(p.client ? "／" + p.client + " 様" : "")}</span></div>
      <div class="ph-sum"><span>税込 <b>¥${yen(c.total)}</b></span><span>粗利 <b class="judge ${judge(c.grossRate, S.settings.targetMargin)}">${pct(c.grossRate)}</b></span><span id="saveState" class="muted">保存済み</span></div></div>
      <nav class="tabs">${TABS.map(([k, t]) => `<a href="#/p/${id}/${k}" class="${k === tab ? "on" : ""}">${t}</a>`).join("")}</nav><div id="pbody"></div>`;
    const body = $("#pbody");
    ({ info: tabInfo, zumen: tabZumen, est: tabEst, kin: tabKin, doc: tabDoc, keiyaku: tabKeiyaku, seikyu: tabSeikyu, cost: tabCost }[tab] || tabInfo)(p, body);
  }
  function refreshHead(p) {
    const c = MQ.calc(p, S.settings), s = $(".ph-sum");
    if (s) s.innerHTML = `<span>税込 <b>¥${yen(c.total)}</b></span><span>粗利 <b class="judge ${judge(c.grossRate, S.settings.targetMargin)}">${pct(c.grossRate)}</b></span><span id="saveState" class="muted">${Object.keys(savePending).length ? "保存中…" : "保存済み"}</span>`;
  }

  // 基本情報
  function tabInfo(p, el) {
    const f = (k, label, type, extra) => `<label class="fld">${label}<input data-f="${k}" type="${type || "text"}" value="${esc(p[k] == null ? "" : p[k])}" ${extra || ""}></label>`;
    const staffNames = Object.values(S.staff).map((s) => s.name);
    el.innerHTML = `<div class="card grid2">
      ${f("name", "工事名")}${f("no", "見積番号")}${f("client", "施主名（様は不要）")}${f("address", "施主住所")}${f("site", "工事場所")}
      <label class="fld">区分<select data-f="kind">${["リフォーム", "新築", "その他"].map((k) => `<option ${p.kind === k ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      ${f("date", "見積日", "date")}${f("validDays", "有効期限（日数）", "number")}${f("start", "着工予定", "date")}${f("end", "完成予定", "date")}
      <label class="fld">担当者<select data-f="staff">${staffNames.concat(staffNames.includes(p.staff) || !p.staff ? [] : [p.staff]).map((n) => `<option ${p.staff === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <label class="fld">状況<select data-f="status">${STATUS.map((s) => `<option ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
      <label class="fld wide">工事概要<textarea data-f="summary" rows="2">${esc(p.summary || "")}</textarea></label>
      <label class="fld">支払：契約時 %<input data-pay="0" type="number" value="${Math.round((p.pay || [])[0] * 100) || 0}"></label>
      <label class="fld">支払：中間時 %<input data-pay="1" type="number" value="${Math.round((p.pay || [])[1] * 100) || 0}"></label>
      <label class="fld">支払：完成時 %<input data-pay="2" type="number" value="${Math.round((p.pay || [])[2] * 100) || 0}"></label>
      </div>
      <div class="row-end"><button class="btn" id="dup">この案件を複製</button>${ADMIN || p.staff === S.me ? '<button class="btn danger" id="del">削除</button>' : ""}<a class="btn pri" href="#/p/${p.id}/zumen">次へ：図面 →</a></div>`;
    el.onchange = (e) => {
      const t = e.target;
      if (t.dataset.f) { p[t.dataset.f] = t.type === "number" ? num(t.value) : t.value; saveProject(p); refreshHead(p); }
      if (t.dataset.pay) { p.pay = p.pay || [0.3, 0.4, 0.3]; p.pay[+t.dataset.pay] = num(t.value) / 100; saveProject(p); const sm = p.pay.reduce((a, b) => a + b, 0); if (Math.abs(sm - 1) > 0.001) toast("支払割合の合計が100%になっていません（" + Math.round(sm * 100) + "%）"); }
    };
    $("#dup").onclick = () => { const q = JSON.parse(JSON.stringify(p)); q.id = MQ.uid("P"); q.no = p.no + "-2"; q.name = p.name + "（複製）"; q.status = "見積中"; q.staff = S.me || p.staff; q.created = Date.now(); saveProject(normProject(q), true); copyImages(p.id, q.id); go(`#/p/${q.id}/info`); };
    $("#del") && ($("#del").onclick = () => { if (!confirm("この案件を削除します。よろしいですか？（元に戻せません）")) return; DB.remove(S.base + "/projects/" + p.id); DB.remove(S.base + "/images/" + p.id); delete S.projects[p.id]; go("#/list"); });
  }
  async function copyImages(from, to) { const im = await DB.get(S.base + "/images/" + from); if (im) DB.set(S.base + "/images/" + to, im); }

  // ---------- ① 図面 ----------
  let pad = null, padSide = "kansei", padPid = "";
  async function getImage(pid, side) {
    const k = pid + "/" + side;
    if (S.images[k] === undefined) S.images[k] = (await DB.get(S.base + "/images/" + k)) || null;
    return S.images[k];
  }
  function tabZumen(p, el) {
    if (padPid !== p.id) { padSide = p.drawings.kansei ? "kansei" : p.drawings.genkyo ? "genkyo" : "genkyo"; padPid = p.id; }
    el.innerHTML = `<div class="zumen">
      <div class="z-left">
        <div class="z-side">${[["genkyo", "現況図"], ["kansei", "完成図"]].map(([k, t]) => `<button class="seg ${padSide === k ? "on" : ""}" data-side="${k}">${t}${p.drawings[k] ? " ✓" : ""}</button>`).join("")}
          <button class="btn sm" id="zAlign" title="現況図と完成図を重ね合わせて、変わった所を色付け">🔍 位置合わせ・変更箇所</button></div>
        <div class="z-tools" id="zTools">
          ${[["select", "✋ 選択・移動"], ["room", "▱ 部屋"], ["wall", "┃ 壁"], ["pt", "● 建具・設備"], ["scale", "📏 縮尺"], ["origin", "✚ 基準点"]].map(([k, t]) => `<button class="tool" data-tool="${k}">${t}</button>`).join("")}
          <select id="ptKind">${Object.entries(MQ.PT_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
          <span class="sp"></span><button class="tool" id="zUndo" title="元に戻す (Ctrl+Z)">↶</button><button class="tool" id="zIn">＋</button><button class="tool" id="zOut">－</button><button class="tool" id="zFit">全体</button>
        </div>
        <div class="z-canvas" id="zWrap"><canvas id="zc"></canvas>
          <div class="drop" id="zDrop"><div><b id="zDropT"></b><p>PDF・画像をここにドロップ<br>（またはタップして選ぶ）</p><p class="muted">PDF は縮尺（S=1/100 など）と部屋の帖数を自動で読み取ります</p></div></div>
          <input type="file" id="zFile" accept=".pdf,image/*" hidden></div>
        <div class="z-hint" id="zHint"></div>
      </div>
      <div class="z-right" id="zSide"></div></div>`;
    const cv = $("#zc");
    pad = Drawing.Pad(cv, {
      isActive: () => S.route[2] === "zumen" && $("#modal").hidden,
      onChange: (what) => { onShapes(p, what); },
      onSelect: () => refreshZumenSide(),
      askLength: (cb) => ask("縮尺を合わせる", "いま引いた線の実際の長さ（mm）", "", (v) => cb(num(v))),
      nextRoomName: () => { const n = (cur(p).shapes || []).filter((s) => s.type === "room").length + 1; return "部屋" + n; }
    });
    $$(".seg[data-side]").forEach((b) => (b.onclick = () => { padSide = b.dataset.side; tabZumen(p, el); }));
    $$("[data-tool]").forEach((b) => (b.onclick = () => { setTool(b.dataset.tool); }));
    $("#ptKind").onchange = (e) => { pad.setPtKind(e.target.value); setTool("pt"); };
    $("#zUndo").onclick = () => pad.undo(); $("#zIn").onclick = () => pad.zoom(1.25); $("#zOut").onclick = () => pad.zoom(0.8); $("#zFit").onclick = () => pad.fit();
    $("#zAlign").onclick = () => alignAndDiff(p);
    const drop = $("#zDrop"), file = $("#zFile");
    drop.onclick = () => file.click();
    file.onchange = () => file.files[0] && loadDrawingFile(p, file.files[0]);
    const wrap = $("#zWrap");
    wrap.addEventListener("dragover", (e) => { e.preventDefault(); wrap.classList.add("over"); });
    wrap.addEventListener("dragleave", () => wrap.classList.remove("over"));
    wrap.addEventListener("drop", (e) => { e.preventDefault(); wrap.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) loadDrawingFile(p, f); });
    loadPad(p);
  }
  const cur = (p) => p.drawings[padSide] || { shapes: [] };
  function setTool(t) { pad.setTool(t); $$("[data-tool]").forEach((b) => b.classList.toggle("on", b.dataset.tool === t)); hint(t); }
  function hint(t) {
    const H = {
      select: "図形をタップで選択（ドラッグで移動）。何もない所をドラッグで画面移動、ホイール／2本指で拡大。",
      room: "部屋の角を順にクリック → 最初の点をクリック（またはダブルクリック／Enter）で閉じる。水平・垂直に自動で揃います。",
      wall: "壁の端から端へクリック（折れ線可）→ ダブルクリック／Enter で確定。現況図にあって完成図にない壁＝撤去、逆＝新設として計算。",
      pt: "建具・設備の位置をクリック。完成図で既存と同じ場所（60cm以内）なら「既存」、無ければ「新設」。交換するものは右の欄で「交換」に。",
      scale: "長さの分かる2点（例：通り芯 3,640mm）をクリック → 実際の長さを入力。PDF なら右の欄で縮尺を選ぶだけでも OK。",
      origin: "両方の図面で同じ場所（建物の角など）をクリック。自動位置合わせがずれたときの手直し用。"
    };
    $("#zHint").textContent = H[t] || "";
  }
  async function loadPad(p) {
    const d = p.drawings[padSide];
    const url = d ? await getImage(p.id, padSide) : null;
    $("#zDrop").hidden = !!url; $("#zDropT").textContent = padSide === "genkyo" ? "現況図（いまの状態）" : "完成図（工事後）";
    if (!url) { await pad.load({ shapes: [] }, null, padSide); refreshZumenSide(); return; }
    await pad.load(d, url, padSide);
    const other = p.drawings[padSide === "genkyo" ? "kansei" : "genkyo"];
    pad.setGhost(Drawing.mapShapes(other, d));
    if (S.diff && S.diff.pid === p.id) pad.setOverlay(diffFor(p, padSide));
    setTool("select"); refreshZumenSide();
  }
  async function loadDrawingFile(p, file) {
    toast("図面を読み込み中…", 8000);
    try {
      const r = await Drawing.importDrawing(file);
      const d = { file: file.name, w: r.w, h: r.h, ppm: r.ppm, scaleDen: r.scaleDen, pdfZ: r.paperPpm || 0, isPdf: /pdf/i.test(file.type) || /\.pdf$/i.test(file.name),
        origin: { x: 0, y: 0 }, ch: S.settings.defaultCh || 2400, shapes: [] };
      // 帖数から部屋を概算で置く（なぞると正確な面積に置き換わる）
      r.rooms.forEach((rm) => d.shapes.push({ type: "room", est: true, name: rm.name, jo: rm.jo, area: rm.area, x: rm.x, y: rm.y, floor: true, wall: true, ceil: true }));
      const old = p.drawings[padSide];
      if (old && old.shapes && old.shapes.some((s) => !s.est) && !confirm("今の図面となぞった図形を置き換えます。よろしいですか？")) return;
      p.drawings[padSide] = d;
      S.images[p.id + "/" + padSide] = r.dataUrl;
      await DB.set(S.base + "/images/" + p.id + "/" + padSide, r.dataUrl);
      S.diff = null;
      saveProject(p, true);
      const msg = [];
      msg.push(r.scaleDen ? `縮尺 1/${r.scaleDen} を読み取りました` : "縮尺は未設定です（📏で合わせてください）");
      if (r.rooms.length) msg.push(`部屋 ${r.rooms.length} 室を帖数から概算`);
      toast(msg.join("／"), 4500);
      const otherSide = padSide === "genkyo" ? "kansei" : "genkyo";
      if (p.drawings[otherSide]) await alignAndDiff(p, true);
      onShapes(p, "load");
      loadPad(p);
    } catch (e) { console.error(e); toast("読み込めませんでした：" + e.message, 5000); }
  }
  async function alignAndDiff(p, quiet) {
    const g = p.drawings.genkyo, k = p.drawings.kansei;
    if (!g || !k) return toast("現況図と完成図の両方を入れてください");
    const gu = await getImage(p.id, "genkyo"), ku = await getImage(p.id, "kansei");
    if (!quiet) toast("位置合わせ中…", 6000);
    if (!(k.originSet && g.originSet)) await Drawing.autoAlign(g, gu, k, ku);
    const df = await Drawing.diffOverlay(g, gu, k, ku);
    S.diff = { pid: p.id, df };
    saveProject(p);
    toast(`変更箇所：撤去（赤）${df.red > 50 ? "あり" : "なし"}／新設（青）${df.blue > 50 ? "あり" : "なし"}。色の所をなぞってください`, 5000);
    if (pad) { pad.setOverlay(diffFor(p, padSide)); pad.setGhost(Drawing.mapShapes(p.drawings[padSide === "genkyo" ? "kansei" : "genkyo"], p.drawings[padSide])); }
    onShapes(p, "align");
  }
  function diffFor(p, side) {
    if (!S.diff || S.diff.pid !== p.id || !S.showDiff) return null;
    const { df } = S.diff, g = p.drawings.genkyo, k = p.drawings.kansei;
    if (side === "genkyo") return { canvas: df.canvas, k: 1 / df.scale, x: 0, y: 0 };
    const s = g.ppm > 0 && k.ppm > 0 ? g.ppm / k.ppm : 1, og = g.origin || { x: 0, y: 0 }, ok = k.origin || { x: 0, y: 0 };
    const d = { x: og.x - ok.x * s, y: og.y - ok.y * s };
    return { canvas: df.canvas, k: 1 / df.scale / s, x: -d.x / s, y: -d.y / s };
  }
  S.showDiff = true;

  // 図形が変わるたびに数量を計算し直し、見積明細に自動で反映（担当者の補正は残す）
  let measureT = null;
  function onShapes(p) {
    saveProject(p);
    clearTimeout(measureT);
    measureT = setTimeout(() => {
      const r = MQ.measure(p.drawings.genkyo, p.drawings.kansei, S.settings);
      p.measure = { metrics: r.metrics, warnings: r.warnings, at: Date.now() };
      p.lines = MQ.autoLines(r.metrics, S.prices, p.lines);
      saveProject(p);
      refreshHead(p); refreshZumenSide();
    }, 250);
  }
  function refreshZumenSide() {
    const p = S.projects[S.route[1]]; const el = $("#zSide");
    if (!p || !el || !pad) return;
    const d = p.drawings[padSide];
    const sel = pad.P.sel >= 0 && pad.P.d && pad.P.d.shapes ? pad.P.d.shapes[pad.P.sel] : null;
    const r = MQ.measure(p.drawings.genkyo, p.drawings.kansei, S.settings);
    const dens = [20, 30, 50, 100, 200];
    let h = "";
    if (d) {
      h += `<div class="card sm"><h4>${padSide === "genkyo" ? "現況図" : "完成図"}：${esc(d.file || "")}</h4>
        <div class="kv"><span>縮尺</span><b>${d.ppm > 0 ? (d.scaleDen ? "1/" + d.scaleDen : "2点で設定済") : '<span class="ng">未設定</span>'}</b></div>
        ${d.isPdf && d.pdfZ ? `<label class="fld inline">縮尺を選ぶ<select id="zDen"><option value="">—</option>${dens.map((n) => `<option value="${n}" ${d.scaleDen === n ? "selected" : ""}>1/${n}</option>`).join("")}</select></label>` : ""}
        <label class="fld inline">標準の天井高 mm<input type="number" id="zCh" value="${d.ch || 2400}"></label>
        <label class="sw"><input type="checkbox" id="zGhost" ${pad.P.showGhost ? "checked" : ""}> もう一方の図面の図形を薄く表示</label>
        ${S.diff && S.diff.pid === p.id ? `<label class="sw"><input type="checkbox" id="zDiff" ${S.showDiff ? "checked" : ""}> 変更箇所の色（赤＝撤去・青＝新設）</label>` : ""}
        <button class="btn sm" id="zRe">図面を差し替え</button></div>`;
    }
    if (sel) h += selPanel(sel);
    h += `<div class="card sm"><h4>自動計算の結果 <small class="muted">→ ② 見積明細に自動で反映</small></h4>
      ${r.warnings.map((w) => `<p class="warn">⚠ ${esc(w)}</p>`).join("")}
      ${Object.keys(r.metrics).length ? `<table class="mini">${Object.entries(r.metrics).filter(([k]) => k !== "lump").map(([k, v]) => `<tr><td>${esc(MQ.AUTO_KEYS[k] || k)}</td><td class="r"><b>${v}</b></td></tr><tr class="det"><td colspan="2">${esc((r.detail[k] || []).slice(0, 6).join("、"))}${(r.detail[k] || []).length > 6 ? " …" : ""}</td></tr>`).join("")}</table>`
        : '<p class="muted">図面を入れて、部屋・壁・建具をなぞると数量が出ます。</p>'}
      <a class="btn pri sm" href="#/p/${p.id}/est">見積明細を見る →</a></div>`;
    el.innerHTML = h;
    const on = (id, ev, fn) => { const x = $("#" + id); if (x) x[ev] = fn; };
    on("zDen", "onchange", (e) => { const n = num(e.target.value); if (n) { d.scaleDen = n; d.ppm = d.pdfZ / n; pad.draw(); onShapes(p); } });
    on("zCh", "onchange", (e) => { d.ch = num(e.target.value) || 2400; onShapes(p); });
    on("zGhost", "onchange", (e) => pad.toggleGhost(e.target.checked));
    on("zDiff", "onchange", (e) => { S.showDiff = e.target.checked; pad.setOverlay(diffFor(p, padSide)); });
    on("zRe", "onclick", () => $("#zFile").click());
    if (sel) bindSel(p, sel);
  }
  function selPanel(s) {
    const kinds = Object.entries(MQ.PT_KINDS).map(([k, v]) => `<option value="${k}" ${s.kind === k ? "selected" : ""}>${v}</option>`).join("");
    if (s.type === "room") return `<div class="card sm sel"><h4>部屋${s.est ? "（帖数から概算）" : ""}</h4>
      <label class="fld inline">室名<input data-s="name" value="${esc(s.name || "")}"></label>
      ${s.est ? `<label class="fld inline">面積 ㎡<input data-s="area" type="number" step="0.01" value="${s.area}"></label><p class="muted">「▱ 部屋」でなぞると正確な面積・周長に置き換えられます（この概算は削除）。</p>` : ""}
      <label class="fld inline">天井高 mm<input data-s="ch" type="number" placeholder="図面の標準" value="${s.ch || ""}"></label>
      <div class="chips">${[["floor", "床を張替"], ["wall", "壁を張替"], ["ceil", "天井を張替"]].map(([k, t]) => `<label class="sw"><input type="checkbox" data-s="${k}" ${s[k] !== false ? "checked" : ""}> ${t}</label>`).join("")}</div>
      <button class="btn danger sm" id="sDel">この図形を削除</button></div>`;
    if (s.type === "wall") return `<div class="card sm sel"><h4>壁</h4><label class="fld inline">高さ mm<input data-s="ch" type="number" placeholder="図面の標準" value="${s.ch || ""}"></label><button class="btn danger sm" id="sDel">この図形を削除</button></div>`;
    return `<div class="card sm sel"><h4>建具・設備</h4><label class="fld inline">種類<select data-s="kind">${kinds}</select></label>
      <label class="sw"><input type="checkbox" data-s="replace" ${s.replace ? "checked" : ""}> 交換・改修する（内窓の取付もこれ）</label>
      <label class="sw"><input type="checkbox" data-s="keep" ${s.keep ? "checked" : ""}> 既存のまま（費用なし）</label>
      <button class="btn danger sm" id="sDel">この図形を削除</button></div>`;
  }
  function bindSel(p, s) {
    $$("[data-s]", $("#zSide")).forEach((i) => (i.onchange = () => {
      const k = i.dataset.s;
      s[k] = i.type === "checkbox" ? i.checked : i.type === "number" ? (i.value === "" ? null : num(i.value)) : i.value;
      if (k === "area") s.jo = Math.round((s.area / MQ.JO_M2) * 10) / 10;
      pad.changed();
    }));
    const del = $("#sDel"); if (del) del.onclick = () => pad.remove(pad.P.sel);
  }

  // ---------- ② 見積明細 ----------
  function tabEst(p, el) {
    const c = MQ.calc(p, S.settings);
    const priceOpts = Object.entries(S.prices).sort((a, b) => MQ.KOUSHU.indexOf(a[1].koushu) - MQ.KOUSHU.indexOf(b[1].koushu) || num(a[1].order) - num(b[1].order))
      .map(([id, x]) => `<option value="${id}">${esc(x.koushu)}｜${esc(x.name)} ${esc(x.spec)}（${yen(x.std)}/${esc(x.unit)}）</option>`).join("");
    let lastK = "";
    const rows = c.rows.map((r, i) => {
      const l = r.line, head = l.koushu !== lastK ? `<tr class="kh"><td colspan="11">${esc(l.koushu)}<span class="muted"> 小計 ¥${yen((c.byKoushu[l.koushu] || {}).amount)}</span></td></tr>` : "";
      lastK = l.koushu;
      const qAuto = MQ.num(l.qtyAuto), pAuto = MQ.unitPrice(Object.assign({}, l, { price: null }), p.margin);
      return head + `<tr data-i="${i}" class="${r.corrected ? "corr" : ""}">
        <td><select data-lf="koushu" class="k">${MQ.KOUSHU.map((k) => `<option ${k === l.koushu ? "selected" : ""}>${k}</option>`).join("")}</select></td>
        <td><input data-lf="name" value="${esc(l.name)}"><input data-lf="spec" class="spec" value="${esc(l.spec)}" placeholder="仕様"></td>
        <td class="num"><input data-lf="qty" type="number" step="any" value="${has(l.qty) ? l.qty : ""}" placeholder="${qAuto || 0}">${has(l.qty) && l.src === "図面" ? `<small class="was">図面 ${qAuto}</small>` : ""}</td>
        <td><input data-lf="unit" class="u" value="${esc(l.unit)}"></td>
        <td class="num"><input data-lf="price" type="number" step="any" value="${has(l.price) ? l.price : ""}" placeholder="${yen(pAuto)}">${has(l.price) ? `<small class="was">標準 ${yen(pAuto)}</small>` : ""}</td>
        <td class="r amt">${yen(r.amount)}</td>
        <td class="num"><input data-lf="cost" type="number" step="any" value="${has(l.cost) ? l.cost : ""}" placeholder="${yen(l.costStd)}"></td>
        <td class="r">${yen(r.costAmt)}</td>
        <td class="r ${judge(r.rate, S.settings.targetMargin)}">${r.amount ? pct(r.rate) : "-"}</td>
        <td><span class="src src-${esc(l.src)}">${esc(l.src)}</span>${r.corrected ? '<button class="lnk" data-reset title="補正を取り消して自動の値に戻す">↺</button>' : ""}</td>
        <td><button class="lnk del" data-del title="行を削除">✕</button></td></tr>`;
    }).join("");
    el.innerHTML = `<div class="card">
      <div class="bar"><h3>見積明細</h3><span class="muted">空欄＝自動（図面・単価表・利益率）。数字を入れると<b>補正</b>として残ります。</span></div>
      <div class="tscroll"><table class="est"><thead><tr><th>工種</th><th>名称・仕様</th><th>数量</th><th>単位</th><th>単価</th><th>金額</th><th>原価単価</th><th>原価</th><th>粗利率</th><th>出所</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="11" class="muted pad">明細はまだありません。「① 図面から計算」で図面を入れるか、下から項目を足してください。</td></tr>'}</tbody></table></div>
      <div class="addrow"><select id="addP"><option value="">＋ 単価表から項目を追加…</option>${priceOpts}</select><button class="btn" id="addFree">＋ 自由入力の行</button><button class="btn" id="addSup">📄 仕入見積を取り込む</button></div>
      </div>${sumCard(p, c)}`;
    el.onchange = (e) => {
      const t = e.target, tr = t.closest("tr[data-i]");
      if (t.id === "addP") { const id = t.value; if (!id) return; const x = S.prices[id]; p.lines.push(MQ.newLine({ priceId: id, koushu: x.koushu, name: x.name, spec: x.spec, unit: x.unit, priceStd: num(x.std), costStd: num(x.cost), qtyAuto: 1, src: "手入力" })); p.lines = MQ.sortLines(p.lines); saveProject(p); tabEst(p, el); refreshHead(p); return; }
      if (!tr || !t.dataset.lf) return;
      const l = c.rows[+tr.dataset.i].line, f = t.dataset.lf;
      if (f === "qty" || f === "price" || f === "cost") l[f] = t.value === "" ? null : num(t.value);
      else l[f] = t.value;
      if (f === "koushu") p.lines = MQ.sortLines(p.lines);
      saveProject(p); tabEst(p, el); refreshHead(p);
    };
    el.onclick = (e) => {
      const tr = e.target.closest("tr[data-i]");
      if (tr && e.target.closest("[data-del]")) { const l = c.rows[+tr.dataset.i].line; if (l.src === "図面" && !confirm("図面から出た行です。消しても図面を変えるとまた出てきます。数量0にするなら数量に 0 を入れてください。削除しますか？")) return; p.lines = p.lines.filter((x) => x !== l); saveProject(p); tabEst(p, el); refreshHead(p); }
      if (tr && e.target.closest("[data-reset]")) { const l = c.rows[+tr.dataset.i].line; l.qty = null; l.price = null; l.cost = null; saveProject(p); tabEst(p, el); refreshHead(p); }
    };
    $("#addFree").onclick = () => { p.lines.push(MQ.newLine({ name: "（項目名）", qtyAuto: 1 })); saveProject(p); tabEst(p, el); };
    $("#addSup").onclick = () => importDoc({ projectId: p.id, kind: "仕入見積" });
  }
  function sumCard(p, c) {
    const tg = S.settings.targetMargin;
    return `<div class="card sumcard"><div class="sumgrid">
      <div><span>直接工事費</span><b>¥${yen(c.direct)}</b></div><div><span>諸経費（${pct(c.keihiRate)}）</span><b>¥${yen(c.keihi)}</b></div>
      <div><span>値引き</span><b>−¥${yen(c.nebiki)}</b></div><div><span>工事価格（税抜）</span><b>¥${yen(c.net)}</b></div>
      <div><span>消費税（${pct(c.taxRate)}）</span><b>¥${yen(c.tax)}</b></div><div class="big"><span>御見積金額（税込）</span><b>¥${yen(c.total)}</b></div>
      <div><span>原価</span><b>¥${yen(c.cost)}</b></div><div><span>粗利</span><b>¥${yen(c.gross)}</b></div>
      <div><span>粗利率（目標 ${pct(tg)}）</span><b class="judge ${judge(c.grossRate, tg)}">${pct(c.grossRate)} ${judgeMark(c.grossRate, tg)}</b></div>
      ${c.subsidy ? `<div><span>補助金（予定）</span><b>−¥${yen(c.subsidy)}</b></div><div class="big"><span>お客様の実質負担</span><b>¥${yen(c.burden)}</b></div>` : ""}
      </div><a class="btn sm" href="#/p/${p.id}/kin">⑤ 利益率を調整 →</a></div>`;
  }

  // ---------- ⑤ 金額・利益率 ----------
  function tabKin(p, el) {
    const mg = p.margin;
    const c = MQ.calc(p, S.settings), cStd = MQ.calc(p, S.settings, { mode: "std" });
    const ks = Array.from(new Set(p.lines.map((l) => l.koushu)));
    el.innerHTML = `<div class="kin"><div class="card">
      <h3>見積金額の決め方</h3>
      <div class="chips"><label class="radio"><input type="radio" name="mm" value="std" ${mg.mode !== "rate" ? "checked" : ""}> 単価表の標準単価どおり</label>
        <label class="radio"><input type="radio" name="mm" value="rate" ${mg.mode === "rate" ? "checked" : ""}> 利益率を決めて、原価から単価を出す</label></div>
      <div id="rateBox" ${mg.mode === "rate" ? "" : "hidden"}>
        <div class="slider"><label>利益率（案件全体）<b id="rv">${pct(num(mg.rate))}</b></label>
          <input type="range" id="rate" min="0" max="50" step="0.5" value="${(num(mg.rate) * 100).toFixed(1)}"><input type="number" id="rateN" step="0.5" value="${(num(mg.rate) * 100).toFixed(1)}">%</div>
        <p class="muted">単価＝原価単価 ÷（1 − 利益率）を10円単位で切り上げ。単価を手で補正した行はそのまま。</p>
        <details ${Object.keys(mg.byKoushu || {}).length ? "open" : ""}><summary>工種ごとに利益率を変える</summary>
          <table class="mini">${ks.map((k) => `<tr><td>${esc(k)}</td><td><input type="number" step="0.5" data-k="${esc(k)}" placeholder="${(num(mg.rate) * 100).toFixed(1)}" value="${mg.byKoushu && has(mg.byKoushu[k]) ? (mg.byKoushu[k] * 100).toFixed(1) : ""}">%</td></tr>`).join("")}</table></details>
        <div class="solve"><label class="fld inline">税込の目標金額から逆算<input type="number" id="tgt" placeholder="例 1000000"></label><button class="btn sm" id="solve">利益率を計算</button></div>
      </div>
      <hr><div class="grid2">
        <label class="fld">諸経費率 %<input type="number" step="0.1" id="keihi" value="${(c.keihiRate * 100).toFixed(1)}"></label>
        <label class="fld">値引き 円<input type="number" id="nebiki" value="${num(p.nebiki)}"></label></div>
      <h4>補助金（予定）</h4><table class="mini" id="subs">${p.subsidy.map((s, i) => `<tr><td><input data-sb="${i}" data-sf="name" value="${esc(s.name)}"></td><td><input type="number" data-sb="${i}" data-sf="amount" value="${num(s.amount)}"></td><td><button class="lnk del" data-sbdel="${i}">✕</button></td></tr>`).join("")}</table>
      <button class="btn sm" id="addSub">＋ 補助金を追加</button> <span class="muted">例：先進的窓リノベ、子育てエコホーム、市の補助 など（見積書に参考で載ります）</span>
      </div>
      <div id="kinSum">${kinSummary(p, c, cStd)}</div></div>`;
    const upd = () => { const c2 = MQ.calc(p, S.settings), cs = MQ.calc(p, S.settings, { mode: "std" }); $("#kinSum").innerHTML = kinSummary(p, c2, cs); $("#rv").textContent = pct(num(p.margin.rate)); refreshHead(p); };
    $$("input[name=mm]").forEach((r) => (r.onchange = () => { mg.mode = r.value; if (!has(mg.rate)) mg.rate = S.settings.targetMargin; $("#rateBox").hidden = mg.mode !== "rate"; saveProject(p); upd(); }));
    const setRate = (v) => { mg.rate = Math.min(0.9, Math.max(-0.5, num(v) / 100)); $("#rate").value = (mg.rate * 100).toFixed(1); $("#rateN").value = (mg.rate * 100).toFixed(1); saveProject(p); upd(); };
    $("#rate").oninput = (e) => setRate(e.target.value);
    $("#rateN").onchange = (e) => setRate(e.target.value);
    $$("[data-k]").forEach((i) => (i.onchange = () => { mg.byKoushu = mg.byKoushu || {}; if (i.value === "") delete mg.byKoushu[i.dataset.k]; else mg.byKoushu[i.dataset.k] = num(i.value) / 100; saveProject(p); upd(); }));
    $("#solve").onclick = () => { const t = num($("#tgt").value); if (!t) return; setRate(MQ.solveRate(p, S.settings, t) * 100); toast("税込 ¥" + yen(MQ.calc(p, S.settings).total) + " になりました（10円単位の切り上げのため少し差が出ます）"); };
    $("#keihi").onchange = (e) => { p.keihiRate = num(e.target.value) / 100; saveProject(p); upd(); };
    $("#nebiki").onchange = (e) => { p.nebiki = num(e.target.value); saveProject(p); upd(); };
    $("#addSub").onclick = () => { p.subsidy.push({ name: "補助金", amount: 0 }); saveProject(p); tabKin(p, el); };
    el.onchange = (e) => { const t = e.target; if (t.dataset.sb != null) { const s = p.subsidy[+t.dataset.sb]; s[t.dataset.sf] = t.dataset.sf === "amount" ? num(t.value) : t.value; saveProject(p); upd(); } };
    el.onclick = (e) => { const b = e.target.closest("[data-sbdel]"); if (b) { p.subsidy.splice(+b.dataset.sbdel, 1); saveProject(p); tabKin(p, el); } };
  }
  function kinSummary(p, c, cStd) {
    const tg = S.settings.targetMargin;
    const diff = c.total - cStd.total;
    return `${sumCard(p, c)}<div class="card sm"><h4>工種別</h4><table class="mini wide"><tr><th>工種</th><th>見積額</th><th>原価</th><th>粗利率</th></tr>
      ${Object.entries(c.byKoushu).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">¥${yen(v.amount)}</td><td class="r">¥${yen(v.cost)}</td><td class="r ${judge(v.amount ? (v.amount - v.cost) / v.amount : 0, tg)}">${v.amount ? pct((v.amount - v.cost) / v.amount) : "-"}</td></tr>`).join("")}</table>
      ${p.margin.mode === "rate" ? `<p class="muted">標準単価どおりなら 税込 ¥${yen(cStd.total)}（粗利 ${pct(cStd.grossRate)}）→ 差 <b>${diff >= 0 ? "+" : "−"}¥${yen(Math.abs(diff))}</b></p>` : ""}</div>`;
  }

  // ---------- 見積書（印刷） ----------
  function tabDoc(p, el) {
    const c = MQ.calc(p, S.settings), pr = S.profile;
    const valid = p.date ? new Date(Date.parse(p.date) + num(p.validDays || 30) * 86400000).toISOString().slice(0, 10) : "";
    const jd = (s) => (s ? s.replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => `${y}年${+m}月${+d}日`) : "");
    const pay = p.pay || [0.3, 0.4, 0.3];
    let lastK = "";
    const detail = c.rows.filter((r) => r.qty).map((r) => {
      const l = r.line, h = l.koushu !== lastK ? `<tr class="kh"><td colspan="6">${esc(l.koushu)}</td></tr>` : ""; lastK = l.koushu;
      return h + `<tr><td>${esc(l.name)}</td><td>${esc(l.spec)}</td><td class="r">${r.qty}</td><td>${esc(l.unit)}</td><td class="r">${yen(r.unitPrice)}</td><td class="r">${yen(r.amount)}</td></tr>`;
    }).join("");
    el.innerHTML = `<div class="row-end noprint"><button class="btn" id="csv">明細をCSVで保存</button><button class="btn pri" id="prt">🖨 印刷・PDF保存</button></div>
    <div class="paper" id="paper">
      <section class="sheet"><h1>御 見 積 書</h1>
        <div class="doc-top"><div><div class="to">${esc(p.client || "")}　様</div><p>下記のとおり御見積申し上げます。</p>
          <div class="amount">御見積金額<b>¥${yen(c.total)}－</b></div><p class="small">（税込　うち消費税額 ¥${yen(c.tax)}）</p></div>
          <div class="from"><div>見積番号　${esc(p.no)}</div><div>見積日　${jd(p.date)}</div><div class="co">${esc(pr.name || "")}</div>
            ${pr.rep ? `<div>代表者　${esc(pr.rep)}</div>` : ""}<div>${esc(pr.address || "")}</div><div>${pr.tel ? "TEL " + esc(pr.tel) : ""}</div>
            <div class="small">登録番号　${esc(pr.regNo || "T－－－－－－－－－－－－－")}</div><div class="small">担当　${esc(p.staff || "")}</div></div></div>
        <table class="dt"><tr><th>工事名</th><td>${esc(p.name)}</td></tr><tr><th>工事場所</th><td>${esc(p.site || p.address || "")}</td></tr>
          <tr><th>工期</th><td>${jd(p.start)} ～ ${jd(p.end)}</td></tr><tr><th>有効期限</th><td>${jd(valid)}</td></tr>
          <tr><th>お支払</th><td>契約時${Math.round(pay[0] * 100)}%・中間${Math.round(pay[1] * 100)}%・完成時${Math.round(pay[2] * 100)}%</td></tr></table>
        <table class="dt sum"><tr><th>工種</th><th class="r">金額</th></tr>
          ${Object.entries(c.byKoushu).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${yen(v.amount)}</td></tr>`).join("")}
          <tr class="t"><td>直接工事費 計</td><td class="r">${yen(c.direct)}</td></tr><tr><td>諸経費（${pct(c.keihiRate)}）</td><td class="r">${yen(c.keihi)}</td></tr>
          ${c.nebiki ? `<tr><td>値引き</td><td class="r">−${yen(c.nebiki)}</td></tr>` : ""}
          <tr class="t"><td>工事価格（税抜）10%対象</td><td class="r">${yen(c.net)}</td></tr><tr><td>消費税（${pct(c.taxRate)}）</td><td class="r">${yen(c.tax)}</td></tr>
          <tr class="t big"><td>合計（税込）</td><td class="r">${yen(c.total)}</td></tr></table>
        ${c.subsidy ? `<table class="dt sum sub"><tr><th colspan="2">補助金のご案内（予定・参考）</th></tr>${p.subsidy.map((s) => `<tr><td>${esc(s.name)}</td><td class="r">−${yen(s.amount)}</td></tr>`).join("")}<tr class="t"><td>補助金を差し引いた実質のご負担（目安）</td><td class="r">${yen(c.burden)}</td></tr></table><p class="small">※補助金は申請・審査の結果により変わります。お支払は上記御見積金額で、補助金は交付後のお受け取りとなります。</p>` : ""}
        <p class="small">※ 図面・現地調査に基づく御見積です。解体後に下地の腐朽等が見つかった場合は、別途御見積させていただきます。</p></section>
      <section class="sheet"><h2>内 訳 明 細 書</h2><p>工事名：${esc(p.name)}</p>
        <table class="dt det"><tr><th>名称</th><th>仕様・規格</th><th class="r">数量</th><th>単位</th><th class="r">単価</th><th class="r">金額</th></tr>${detail}
        <tr class="t"><td colspan="5">直接工事費 計</td><td class="r">${yen(c.direct)}</td></tr></table></section></div>`;
    $("#prt").onclick = () => window.print();
    $("#csv").onclick = () => downloadCsv(`${p.no}_${p.name}_明細.csv`, [["工種", "名称", "仕様", "数量", "単位", "単価", "金額", "原価単価", "原価", "出所", "補正"]].concat(c.rows.map((r) => [r.line.koushu, r.line.name, r.line.spec, r.qty, r.line.unit, r.unitPrice, r.amount, r.unitCost, r.costAmt, r.line.src, r.corrected ? "補正" : ""])));
  }
  // ---------- 契約書 ----------
  const DEFAULT_CLAUSES = [
    ["総則", "甲と乙は、この契約書及び添付の見積書・図面に基づき、信義に従い誠実にこの契約を履行する。"],
    ["工事の変更", "甲は必要があるときは工事内容の変更を求めることができる。これにより請負代金額又は工期に変更が生じるときは、甲乙協議して書面で定める。"],
    ["不可抗力・隠れた損傷", "天災その他甲乙いずれの責にも帰さない事由、又は着工後に判明した既存部分の腐朽・損傷により工事の変更が必要になったときは、甲乙協議のうえ工期及び請負代金額を変更する。"],
    ["検査及び引渡し", "乙は工事完成後、甲の立会いのもと完成検査を行い、合格後に目的物を引き渡す。"],
    ["契約不適合責任", "引き渡した目的物が契約の内容に適合しないとき、甲は引渡しから1年以内（構造耐力上主要な部分等は法令の定めによる）にその旨を乙に通知し、修補等を請求できる。"],
    ["履行遅滞", "乙の責に帰すべき事由により工期内に完成できないとき、又は甲が請負代金の支払いを遅延したときは、遅延日数に応じ年3%の割合で計算した額を遅延損害金として相手方に支払う。"],
    ["協議", "この契約に定めのない事項又は疑義が生じた事項は、民法その他の法令及び民間建設工事標準請負契約約款に従い、甲乙誠意をもって協議し解決する。"]
  ];
  const clauses = () => (Array.isArray(S.profile.clauses) && S.profile.clauses.length ? S.profile.clauses : DEFAULT_CLAUSES);
  const clausesText = (cl) => cl.map((c, i) => `第${i + 1}条（${c[0]}）\n${c[1]}`).join("\n\n");
  function parseClauses(t) {
    const out = [];
    String(t).split(/\r?\n/).forEach((ln) => {
      const m = ln.trim().match(/^第\s*[0-9０-９一二三四五六七八九十]+\s*条\s*[（(](.+?)[）)]\s*(.*)$/);
      if (m) out.push([m[1], m[2] || ""]);
      else if (ln.trim() && out.length) out[out.length - 1][1] += (out[out.length - 1][1] ? "\n" : "") + ln.trim();
    });
    return out;
  }
  const jdate = (s) => (s ? String(s).replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => `${y}年${+m}月${+d}日`) : "　　年　　月　　日");
  const addDays = (s, n) => (s ? new Date(Date.parse(s) + n * 86400000).toISOString().slice(0, 10) : "");
  function payWarn(p) { return MQ.billStages(p, S.settings).payOk ? "" : `<p class="warn">⚠ 支払割合の合計が100%になっていません（基本情報で直してください）</p>`; }
  function partyBlock(pr) {
    return `${esc(pr.name || "")}${pr.rep ? `<br>代表者　${esc(pr.rep)}` : ""}<br>${esc(pr.address || "")}${pr.tel ? `<br>TEL ${esc(pr.tel)}` : ""}`;
  }

  function tabKeiyaku(p, el) {
    const k = (p.contract = p.contract || {});
    const pr = S.profile, b = MQ.billStages(p, S.settings), c = b.calc;
    const date = k.date || "", stamp = MQ.stampDuty(c.net, date || today());
    const handover = k.handover || pr.handover || "完成の日から7日以内";
    const payDays = num(k.payDays) || 30;
    const payRows = [["契約時", "契約金"], ["中間時", "中間金"], ["完成引渡時", "完成金"]].filter(([, kk]) => b.stages[kk].rate > 0);
    el.innerHTML = `<div class="card noprint"><div class="grid2">
        <label class="fld">契約日<input type="date" data-k="date" value="${esc(date)}"></label>
        <label class="fld">引渡しの時期<input data-k="handover" value="${esc(handover)}"></label>
        <label class="fld">支払：請求後の日数<input type="number" data-k="payDays" value="${payDays}"></label>
        <label class="fld wide">特約（この案件だけの取り決め・任意）<textarea data-k="special" rows="2">${esc(k.special || "")}</textarea></label></div>
        ${payWarn(p)}
        <p class="muted">条文は管理者の「設定」で全案件共通に編集できます。印紙税は工事価格（税抜 ¥${yen(c.net)}）にあてはめた参考額です。</p>
        <div class="row-end">${p.status === "受注" || p.status === "完了" ? '<span class="muted">受注済みの案件です</span>' : '<button class="btn" id="won">契約したので「受注」にする</button>'}<button class="btn pri" id="prt">🖨 印刷・PDF保存（2通）</button></div></div>
      <div class="paper" id="paper">${[1, 2].map((n) => `<section class="sheet contract">
        <div class="stamp">収入印紙<br><b>${stamp.tax ? yen(stamp.tax) + "円" : "非課税"}</b><br><small>（参考${stamp.reduced ? "・軽減税率" : ""}）</small></div>
        <div class="copy">${n === 1 ? "甲（発注者）保管" : "乙（請負者）保管"}</div>
        <h1>工事請負契約書</h1>
        <p>発注者 ${esc(p.client || "　　　　")}（以下「甲」という）と請負者 ${esc(pr.name || "")}（以下「乙」という）は、次の工事について請負契約を締結する。</p>
        <table class="dt"><tr><th>1. 工事名</th><td>${esc(p.name)}</td></tr><tr><th>2. 工事場所</th><td>${esc(p.site || p.address || "")}</td></tr>
          <tr><th>3. 工事内容</th><td>${esc(p.summary || "別紙見積書のとおり")}（見積番号 ${esc(p.no)}）</td></tr>
          <tr><th>4. 工期</th><td>着工　${jdate(p.start)}　／　完成　${jdate(p.end)}</td></tr>
          <tr><th>5. 引渡しの時期</th><td>${esc(handover)}</td></tr>
          <tr><th>6. 請負代金額</th><td><b class="big">金 ${yen(c.total)} 円也（税込）</b><br>うち工事価格 ¥${yen(c.net)}　取引に係る消費税額 ¥${yen(c.tax)}（${pct(c.taxRate)}）</td></tr>
          <tr><th>7. 支払方法</th><td><table class="pay">${payRows.map(([lab, kk]) => `<tr><td>${lab}</td><td class="r">${Math.round(b.stages[kk].rate * 100)}%</td><td class="r">¥${yen(b.stages[kk].total)}</td></tr>`).join("")}</table>
            いずれも乙の請求後${payDays}日以内に乙の指定口座へ振り込む。</td></tr></table>
        <div class="clauses">${clauses().map((cl, i) => `<p><b>第${i + 1}条（${esc(cl[0])}）</b><br>${esc(cl[1]).replace(/\n/g, "<br>")}</p>`).join("")}
          ${k.special ? `<p><b>特約</b><br>${esc(k.special).replace(/\n/g, "<br>")}</p>` : ""}</div>
        <p>この契約の証として本書2通を作成し、甲乙記名押印のうえ各1通を保有する。</p>
        <p class="r">${jdate(date)}</p>
        <div class="sign"><div><b>発注者（甲）</b><br>住所　${esc(p.address || "")}<br>氏名　${esc(p.client || "")}<span class="in">印</span></div>
          <div><b>請負者（乙）</b><br>${partyBlock(pr)}<span class="in">印</span>${pr.license ? `<br><small>建設業許可 ${esc(pr.license)}</small>` : ""}</div></div>
        <p class="small">※ 本書式は参考例です。印紙税額は建設工事請負契約書の${stamp.reduced ? "軽減税率（令和9年3月31日まで）" : "本則の税率"}を工事価格（税抜）にあてはめた参考額です。実際の契約前に約款の内容と税額を専門家にご確認ください。</p>
      </section>`).join("")}</div>`;
    el.onchange = (e) => { const t = e.target; if (!t.dataset.k) return; k[t.dataset.k] = t.type === "number" ? num(t.value) : t.value; saveProject(p); tabKeiyaku(p, el); };
    el.onclick = null;
    $("#prt").onclick = () => window.print();
    $("#won") && ($("#won").onclick = () => { p.status = "受注"; if (!k.date) k.date = today(); saveProject(p, true); toast("「受注」にしました"); tabKeiyaku(p, el); });
  }

  // ---------- 請求書（お客様への請求） ----------
  function nextBillNo() {
    const y = new Date().getFullYear(); let m = 0;
    Object.values(S.projects).forEach((p) => bills(p).forEach((b) => { const mt = String(b.no || "").match(new RegExp("^I-" + y + "-(\\d+)")); if (mt) m = Math.max(m, +mt[1]); }));
    return `I-${y}-${String(m + 1).padStart(4, "0")}`;
  }
  function bills(p) { p.bills = Array.isArray(p.bills) ? p.bills : p.bills ? Object.values(p.bills) : []; return p.bills; }
  function tabSeikyu(p, el) {
    const bs = bills(p), st = MQ.billStages(p, S.settings), c = st.calc;
    const sel = bs.find((b) => b.id === S.billSel) || bs[bs.length - 1];
    const done = (kind) => bs.some((b) => b.kind === kind);
    const amt = (b) => MQ.billAmount(b, p, S.settings);
    const billed = bs.reduce((s, b) => s + amt(b).total, 0), paid = bs.filter((b) => b.paid).reduce((s, b) => s + amt(b).total, 0);
    const kinds = MQ.BILL_KINDS.filter((k) => !(k in st.stages) || k === "全額" || st.stages[k].rate > 0);
    el.innerHTML = `<div class="card noprint">${payWarn(p)}
      <div class="bar"><h3>請求書</h3><span class="muted">請負代金 ¥${yen(c.total)}（税込）／請求済 ¥${yen(billed)}／入金済 ¥${yen(paid)}</span></div>
      <div class="row">${kinds.map((k) => { const made = done(k) && k !== "追加・その他";
        return `<button class="btn ${made ? "" : "pri"} sm" data-newbill="${k}">＋ ${k}${k in st.stages ? `（¥${yen(st.stages[k].total)}）` : ""}${made ? " 作成済" : ""}</button>`; }).join("")}</div>
      ${bs.length ? `<div class="tscroll"><table class="mini wide"><tr><th>請求番号</th><th>区分</th><th>請求日</th><th>お支払期限</th><th>税込</th><th>入金</th><th></th></tr>${bs.map((b) => { const late = !b.paid && b.due && b.due < today();
        return `<tr class="${b === sel ? "selrow" : ""}"><td><button class="lnk" data-bsel="${b.id}">${esc(b.no)}</button></td><td>${esc(b.kind)}</td><td>${esc(b.date)}</td><td class="${late ? "ng" : ""}">${esc(b.due)}${late ? " 期限切れ" : ""}</td><td class="r">¥${yen(amt(b).total)}</td>
          <td><label class="sw"><input type="checkbox" data-paid="${b.id}" ${b.paid ? "checked" : ""}> ${b.paid ? "入金済 " + esc(b.paidDate || "") : "未入金"}</label></td><td><button class="lnk del" data-bdel="${b.id}">✕</button></td></tr>`; }).join("")}</table></div>`
        : '<p class="muted">まだ請求書はありません。上のボタンから作ります（金額は見積の請負代金と支払割合から自動で入ります）。</p>'}
      </div>${sel ? billEditor(sel) + billSheet(p, sel) : ""}`;
    el.onclick = (e) => {
      const nb = e.target.closest("[data-newbill]"), bsel = e.target.closest("[data-bsel]"), bdel = e.target.closest("[data-bdel]");
      if (nb) {
        const kind = nb.dataset.newbill;
        if (kind !== "追加・その他" && done(kind) && !confirm(`${kind}の請求書はもうあります。もう1枚作りますか？`)) return;
        const d = today(), b = { id: MQ.uid("B"), no: nextBillNo(), kind, date: d, due: addDays(d, num(S.settings.billDueDays) || 30), paid: false, paidDate: "", memo: "", net: 0, title: kind === "追加・その他" ? "追加工事" : "" };
        bs.push(b); S.billSel = b.id; saveProject(p, true); tabSeikyu(p, el);
      }
      if (bsel) { S.billSel = bsel.dataset.bsel; tabSeikyu(p, el); }
      if (bdel && confirm("この請求書を削除しますか？")) { p.bills = bs.filter((b) => b.id !== bdel.dataset.bdel); saveProject(p, true); tabSeikyu(p, el); }
      if (e.target.id === "bprt") window.print();
    };
    el.onchange = (e) => {
      const t = e.target;
      if (t.dataset.paid) {
        const b = bs.find((x) => x.id === t.dataset.paid); b.paid = t.checked; b.paidDate = t.checked ? today() : "";
        if (t.checked && bs.every((x) => x.paid) && billed >= c.total && p.status === "受注" && confirm("請負代金の全額が入金済みです。案件を「完了」にしますか？")) p.status = "完了";
        saveProject(p, true); tabSeikyu(p, el); return;
      }
      if (t.dataset.bf && sel) { sel[t.dataset.bf] = t.type === "number" ? num(t.value) : t.value; if (t.dataset.bf === "date") sel.due = addDays(t.value, num(S.settings.billDueDays) || 30); saveProject(p); tabSeikyu(p, el); }
    };
  }
  function billEditor(b) {
    const reg = String(S.profile.regNo || "").replace(/[\s-]/g, "");
    return `<div class="card noprint"><div class="grid3">
      <label class="fld">請求番号<input data-bf="no" value="${esc(b.no)}"></label>
      <label class="fld">請求日<input type="date" data-bf="date" value="${esc(b.date)}"></label>
      <label class="fld">お支払期限<input type="date" data-bf="due" value="${esc(b.due)}"></label>
      ${b.kind === "追加・その他" ? `<label class="fld">摘要<input data-bf="title" value="${esc(b.title || "")}"></label><label class="fld">金額（税抜）<input type="number" data-bf="net" value="${num(b.net)}"></label>` : ""}
      <label class="fld wide">備考（請求書に載ります・任意）<input data-bf="memo" value="${esc(b.memo || "")}"></label></div>
      ${S.profile.bank ? "" : '<p class="warn">⚠ 振込先が未登録です（管理者の「設定」→会社情報）</p>'}
      ${/^T\d{13}$/.test(reg) ? "" : '<p class="warn">⚠ インボイス登録番号（T＋13桁）が未登録か形式が違います（管理者の「設定」）。適格請求書には必須です</p>'}
      <div class="row-end"><button class="btn pri" id="bprt">🖨 印刷・PDF保存</button></div></div>`;
  }
  function billSheet(p, b) {
    const pr = S.profile, st = MQ.billStages(p, S.settings), c = st.calc, a = MQ.billAmount(b, p, S.settings);
    const desc = b.kind === "追加・その他" ? `${p.name}　${b.title || "追加工事"}` : `${p.name}　${b.kind}${b.kind === "全額" ? "" : `（請負代金の${Math.round(a.rate * 100)}%）`}`;
    return `<div class="paper"><section class="sheet bill"><h1>請　求　書</h1>
      <div class="doc-top"><div><div class="to">${esc(p.client || "")}　様</div><p>下記のとおりご請求申し上げます。</p>
        <div class="amount">ご請求金額<b>¥${yen(a.total)}－</b></div><p class="small">（10%対象 ¥${yen(a.net)}　消費税 ¥${yen(a.tax)}）</p></div>
        <div class="from"><div>請求番号　${esc(b.no)}</div><div>請求日　${jdate(b.date)}</div><div class="co">${esc(pr.name || "")}</div>
          ${pr.rep ? `<div>代表者　${esc(pr.rep)}</div>` : ""}<div>${esc(pr.address || "")}</div><div>${pr.tel ? "TEL " + esc(pr.tel) : ""}</div>
          <div class="small">登録番号　${esc(pr.regNo || "T－－－－－－－－－－－－－")}</div></div></div>
      <table class="dt"><tr><th>工事名</th><td>${esc(p.name)}</td></tr><tr><th>工事場所</th><td>${esc(p.site || p.address || "")}</td></tr><tr><th>請求区分</th><td>${esc(b.kind)}</td></tr><tr><th>お支払期限</th><td>${jdate(b.due)}</td></tr></table>
      <table class="dt sum"><tr><th>摘要</th><th class="r">金額（税抜）</th><th class="r">税率</th><th class="r">消費税</th></tr>
        <tr><td>${esc(desc)}</td><td class="r">${yen(a.net)}</td><td class="r">${pct(c.taxRate)}</td><td class="r">${yen(a.tax)}</td></tr>
        <tr class="t"><td>10%対象 小計</td><td class="r">${yen(a.net)}</td><td></td><td></td></tr><tr><td>消費税（${pct(c.taxRate)}）</td><td class="r">${yen(a.tax)}</td><td></td><td></td></tr>
        <tr class="t big"><td>今回ご請求額（税込）</td><td class="r" colspan="3">${yen(a.total)}</td></tr></table>
      ${b.kind !== "追加・その他" ? `<table class="dt sum"><tr><th colspan="3">お支払予定（参考）</th></tr><tr><th>区分</th><th class="r">割合</th><th class="r">金額（税込）</th></tr>
        ${["契約金", "中間金", "完成金"].filter((k) => st.stages[k].rate > 0).map((k) => `<tr${k === b.kind ? ' class="t"' : ""}><td>${k}</td><td class="r">${Math.round(st.stages[k].rate * 100)}%</td><td class="r">${yen(st.stages[k].total)}</td></tr>`).join("")}
        <tr class="t"><td>請負代金額</td><td></td><td class="r">${yen(c.total)}</td></tr></table>` : ""}
      <table class="dt"><tr><th>お振込先</th><td>${esc(pr.bank || "（設定で振込先を入力してください）").replace(/\n/g, "<br>")}</td></tr>${b.memo ? `<tr><th>備考</th><td>${esc(b.memo)}</td></tr>` : ""}</table>
      <p class="small">※ 振込手数料はご負担くださいますようお願いいたします。本書は適格請求書（インボイス）の記載事項に対応しています。</p></section></div>`;
  }

  // ---------- 請求・入金の一覧（全案件） ----------
  function renderBills() {
    const f = sessionStorage.getItem("mq_bf") || "unpaid";
    const mineOnly = !ADMIN && localStorage.getItem("mq_mine") !== "0";
    const ps = projList().filter((p) => !mineOnly || p.staff === S.me);
    const rows = [];
    ps.forEach((p) => bills(p).forEach((b) => rows.push({ p, b, a: MQ.billAmount(b, p, S.settings) })));
    const late = (r) => !r.b.paid && r.b.due && r.b.due < today();
    const list = rows.filter((r) => f === "all" || (f === "unpaid" ? !r.b.paid : f === "late" ? late(r) : r.b.paid)).sort((x, y) => String(x.b.due).localeCompare(String(y.b.due)));
    const sum = (fn) => rows.filter(fn).reduce((s, r) => s + r.a.total, 0);
    const notBilled = ps.filter((p) => (p.status === "受注" || p.status === "完了") && !bills(p).length);
    main().innerHTML = `<div class="bar"><h2>請求・入金</h2>${[["unpaid", "未入金"], ["late", "期限切れ"], ["paid", "入金済"], ["all", "すべて"]].map(([k, t]) => `<button class="chip ${f === k ? "on" : ""}" data-bf="${k}">${t}</button>`).join("")}${mineOnly ? '<span class="muted">自分の案件だけ表示中</span>' : ""}</div>
      <div class="kpis"><div><span>未入金（税込）</span><b>¥${yen(sum((r) => !r.b.paid))}</b></div><div><span>うち期限切れ</span><b class="${sum(late) ? "ng" : ""}">¥${yen(sum(late))}</b></div><div><span>入金済（税込）</span><b>¥${yen(sum((r) => r.b.paid))}</b></div><div><span>受注で請求書なし</span><b>${notBilled.length}件</b></div></div>
      <div class="card"><div class="tscroll"><table class="mini wide"><tr><th>お支払期限</th><th>請求番号</th><th>案件</th><th>施主</th><th>担当</th><th>区分</th><th>税込</th><th>状況</th></tr>
      ${list.map((r) => `<tr><td class="${late(r) ? "ng" : ""}">${esc(r.b.due)}</td><td>${esc(r.b.no)}</td><td><a href="#/p/${r.p.id}/seikyu" data-open="${r.b.id}">${esc(r.p.name)}</a></td><td>${esc(r.p.client || "")}</td><td>${esc(r.p.staff || "")}</td><td>${esc(r.b.kind)}</td><td class="r">¥${yen(r.a.total)}</td><td>${r.b.paid ? "入金済 " + esc(r.b.paidDate || "") : late(r) ? '<b class="ng">期限切れ</b>' : "未入金"}</td></tr>`).join("") || '<tr><td colspan="8" class="muted">該当なし</td></tr>'}</table></div>
      <p class="muted">入金の記録は各案件の「請求書」タブで付けます（このアプリは記録だけで、振込・入出金の操作はしません）。</p></div>
      ${notBilled.length ? `<div class="card"><h4>受注済みで請求書がまだの案件</h4>${notBilled.map((p) => `<a class="chip" href="#/p/${p.id}/seikyu">${esc(p.name)}</a>`).join(" ")}</div>` : ""}`;
    $$("[data-bf]").forEach((b) => (b.onclick = () => { sessionStorage.setItem("mq_bf", b.dataset.bf); renderBills(); }));
    $$("[data-open]").forEach((a) => (a.onclick = () => { S.billSel = a.dataset.open; }));
  }

  function downloadCsv(name, rows) {
    const t = "﻿" + rows.map((r) => r.map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type: "text/csv" })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- ④ 原価実行（案件ごと） ----------
  function tabCost(p, el) {
    const c = MQ.calc(p, S.settings);
    const invs = Object.entries(S.invoices).filter(([, v]) => v.projectId === p.id && v.kind !== "仕入見積");
    const act = MQ.actuals(Object.fromEntries(invs), S.prices)[p.id] || { total: 0, byKoushu: {} };
    const ks = Array.from(new Set(Object.keys(c.byKoushu).concat(Object.keys(act.byKoushu))));
    const realGross = c.net - act.total;
    el.innerHTML = `<div class="card"><div class="bar"><h3>原価実行（実行予算 と 請求書の実績）</h3><button class="btn pri" id="imp">🧾 この案件の請求書を読み込む</button></div>
      <table class="mini wide"><tr><th>工種</th><th>見積額</th><th>実行予算（見積原価）</th><th>実行金額（請求書）</th><th>差（予算−実行）</th></tr>
      ${ks.map((k) => { const b = (c.byKoushu[k] || {}).cost || 0, a = act.byKoushu[k] || 0; return `<tr><td>${esc(k)}</td><td class="r">¥${yen((c.byKoushu[k] || {}).amount)}</td><td class="r">¥${yen(b)}</td><td class="r">¥${yen(a)}</td><td class="r ${b - a < 0 ? "ng" : ""}">${b - a < 0 ? "−" : ""}¥${yen(Math.abs(b - a))}</td></tr>`; }).join("")}
      <tr class="t"><td>合計</td><td class="r">¥${yen(c.direct)}</td><td class="r">¥${yen(c.cost)}</td><td class="r">¥${yen(act.total)}</td><td class="r ${c.cost - act.total < 0 ? "ng" : ""}">¥${yen(c.cost - act.total)}</td></tr></table>
      <p>工事価格（税抜）¥${yen(c.net)} − 実行金額 ¥${yen(act.total)} ＝ <b>実行粗利 ¥${yen(realGross)}（${pct(c.net ? realGross / c.net : 0)}）</b>　<span class="muted">見積時の粗利率 ${pct(c.grossRate)}</span></p></div>
      <div class="card"><h4>読み込んだ請求書</h4>${invTable(invs)}</div>`;
    $("#imp").onclick = () => importDoc({ projectId: p.id, kind: "請求書" });
    bindInvTable(el);
  }

  // ---------- ④ 請求書・仕入見積の読み込み ----------
  function invTable(invs) {
    if (!invs.length) return '<p class="muted">まだありません。</p>';
    return `<table class="mini wide"><tr><th>日付</th><th>種類</th><th>業者</th><th>案件</th><th>明細</th><th>金額（税抜）</th><th></th></tr>${invs.sort((a, b) => String(b[1].date).localeCompare(String(a[1].date))).map(([id, v]) => {
      const t = (v.lines || []).reduce((s, l) => s + num(l.amount), 0), pj = S.projects[v.projectId];
      return `<tr><td>${esc(v.date || "")}</td><td>${esc(v.kind || "請求書")}</td><td>${esc(v.vendor || "")}</td><td>${pj ? `<a href="#/p/${pj.id}/cost">${esc(pj.name)}</a>` : '<span class="muted">（案件なし）</span>'}</td><td class="r">${(v.lines || []).length}行</td><td class="r">¥${yen(t)}</td>
        <td><button class="lnk" data-inv="${id}">開く</button>${ADMIN || v.by === S.me ? `<button class="lnk del" data-invdel="${id}">✕</button>` : ""}</td></tr>`;
    }).join("")}</table>`;
  }
  function bindInvTable(el) {
    $$("[data-inv]", el).forEach((b) => (b.onclick = () => editDoc(Object.assign({ id: b.dataset.inv }, S.invoices[b.dataset.inv]))));
    $$("[data-invdel]", el).forEach((b) => (b.onclick = () => { if (confirm("この請求書の取り込みを削除しますか？")) DB.remove(S.base + "/invoices/" + b.dataset.invdel); }));
  }
  function renderInvoices() {
    const invs = Object.entries(S.invoices);
    const act = MQ.actuals(S.invoices, S.prices);
    main().innerHTML = `<div class="bar"><h2>請求書・原価</h2><button class="btn pri" id="imp">🧾 請求書を読み込む</button><button class="btn" id="imp2">📄 仕入見積を読み込む</button></div>
      <div class="card drop-inline" id="invDrop">ここに請求書（PDF・写真・CSV）をドロップ → 明細を読み取り、単価表の項目に結び付けて原価実行と単価の学習に使います。<br><span class="muted">文字の入ったPDFはそのまま、スキャンや写真は文字認識（ブラウザ内で処理・外部に送りません）。読み取り結果は必ず確認・修正してから保存します。</span></div>
      <div class="card"><h4>案件別の実行金額</h4><table class="mini wide"><tr><th>案件</th><th>担当</th><th>工事価格（税抜）</th><th>実行予算</th><th>実行金額</th><th>実行粗利率</th></tr>
      ${Object.entries(act).filter(([k]) => k !== "_none").map(([pid, a]) => { const p = S.projects[pid]; if (!p) return ""; const c = MQ.calc(p, S.settings); return `<tr><td><a href="#/p/${pid}/cost">${esc(p.name)}</a></td><td>${esc(p.staff || "")}</td><td class="r">¥${yen(c.net)}</td><td class="r">¥${yen(c.cost)}</td><td class="r">¥${yen(a.total)}</td><td class="r ${judge(c.net ? (c.net - a.total) / c.net : 0, S.settings.targetMargin)}">${pct(c.net ? (c.net - a.total) / c.net : 0)}</td></tr>`; }).join("")}</table></div>
      <div class="card"><h4>読み込んだ書類</h4>${invTable(invs)}</div>`;
    $("#imp").onclick = () => importDoc({ kind: "請求書" });
    $("#imp2").onclick = () => importDoc({ kind: "仕入見積" });
    const d = $("#invDrop");
    d.ondragover = (e) => { e.preventDefault(); d.classList.add("over"); }; d.ondragleave = () => d.classList.remove("over");
    d.ondrop = (e) => { e.preventDefault(); d.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) readDoc(f, { kind: "請求書" }); };
    bindInvTable(main());
  }
  function importDoc(opt) {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".pdf,image/*,.csv,.txt";
    inp.onchange = () => inp.files[0] && readDoc(inp.files[0], opt); inp.click();
  }
  async function readDoc(file, opt) {
    modal(`<h3>読み取り中…</h3><p id="prog">${esc(file.name)}</p><p class="muted">文字認識は初回に辞書を読み込むため少し時間がかかります。</p>`);
    try {
      const r = await Importer.readFile(file, (m) => { const e = $("#prog"); if (e) e.textContent = m; });
      const parsed = MQ.parseDocText(r.text, S.profile.name);
      parsed.lines.forEach((l) => { const m = MQ.matchPrice(l.name, S.prices); l.priceId = m.id; l.koushu = m.id ? S.prices[m.id].koushu : (opt.projectId ? "その他" : "その他"); });
      editDoc({ kind: opt.kind, projectId: opt.projectId || "", vendor: parsed.vendor, date: parsed.date || today(), lines: parsed.lines, fileName: file.name, method: r.method, raw: r.text.slice(0, 20000), detectedTotal: parsed.total }, opt);
    } catch (e) { console.error(e); closeModal(); toast("読み取れませんでした：" + e.message, 5000); }
  }
  function editDoc(doc, opt) {
    doc.lines = Array.isArray(doc.lines) ? doc.lines : doc.lines ? Object.values(doc.lines) : [];
    const priceSel = (id) => `<option value="">（結び付けない）</option>` + Object.entries(S.prices).map(([k, x]) => `<option value="${k}" ${k === id ? "selected" : ""}>${esc(x.koushu)}｜${esc(x.name)} ${esc(x.spec)}</option>`).join("");
    const draw = () => {
      const sup = doc.kind === "仕入見積";
      const sum = doc.lines.reduce((s, l) => s + num(l.amount), 0);
      const m = modal(`<h3>${esc(doc.kind)}の内容を確認 <small class="muted">${esc(doc.fileName || "")} ${doc.method ? "／" + esc(doc.method) : ""}</small></h3>
        <div class="grid3"><label class="fld">種類<select id="dk">${["請求書", "仕入見積"].map((k) => `<option ${doc.kind === k ? "selected" : ""}>${k}</option>`).join("")}</select></label>
          <label class="fld">業者名<input id="dv" value="${esc(doc.vendor || "")}"></label><label class="fld">日付<input id="dd" type="date" value="${esc(doc.date || "")}"></label>
          <label class="fld wide">案件<select id="dp"><option value="">（案件なし：単価の学習だけに使う）</option>${projList().map((p) => `<option value="${p.id}" ${p.id === doc.projectId ? "selected" : ""}>${esc(p.no)} ${esc(p.name)}</option>`).join("")}</select></label></div>
        <div class="tscroll"><table class="est doc"><thead><tr><th>名称</th><th>数量</th><th>単位</th><th>単価</th><th>金額</th>${sup ? "<th>上代</th>" : ""}<th>単価表の項目（学習先）</th><th>工種</th><th></th></tr></thead><tbody>
        ${doc.lines.map((l, i) => `<tr data-i="${i}" class="${l.guess ? "guess" : ""}"><td><input data-lf="name" value="${esc(l.name)}"></td><td><input data-lf="qty" type="number" step="any" value="${l.qty}"></td><td><input data-lf="unit" class="u" value="${esc(l.unit)}"></td>
          <td><input data-lf="unitPrice" type="number" step="any" value="${l.unitPrice}"></td><td><input data-lf="amount" type="number" step="any" value="${l.amount}"></td>${sup ? `<td><input data-lf="listPrice" type="number" value="${num(l.listPrice)}"></td>` : ""}
          <td><select data-lf="priceId">${priceSel(l.priceId)}</select></td><td><select data-lf="koushu">${MQ.KOUSHU.map((k) => `<option ${k === l.koushu ? "selected" : ""}>${k}</option>`).join("")}</select></td><td><button class="lnk del" data-del>✕</button></td></tr>`).join("")}
        </tbody></table></div>
        <div class="row"><button class="btn sm" id="addL">＋ 行を追加</button><span class="sp"></span>明細の合計（税抜）<b>¥${yen(sum)}</b>${doc.detectedTotal ? `<span class="muted">／書類の合計表示 ¥${yen(doc.detectedTotal)}（税込の場合あり）</span>` : ""}</div>
        ${doc.raw ? `<details><summary>読み取った文字を見る（確認用）</summary><pre class="raw">${esc(doc.raw)}</pre></details>` : ""}
        <div class="row-end"><button class="btn" data-close>やめる</button>${sup && doc.projectId ? '<button class="btn" id="toEst">見積明細に追加</button>' : ""}<button class="btn pri" id="save">保存（原価・学習に使う）</button></div>`);
      m.querySelector(".modal-box").classList.add("wide");
      $("#dk").onchange = (e) => { doc.kind = e.target.value; draw(); };
      $("#dv").onchange = (e) => (doc.vendor = e.target.value);
      $("#dd").onchange = (e) => (doc.date = e.target.value);
      $("#dp").onchange = (e) => { doc.projectId = e.target.value; draw(); };
      m.querySelector("tbody").onchange = (e) => {
        const tr = e.target.closest("tr[data-i]"); if (!tr) return;
        const l = doc.lines[+tr.dataset.i], f = e.target.dataset.lf, v = e.target.value;
        l[f] = /qty|unitPrice|amount|listPrice/.test(f) ? num(v) : v;
        if (f === "qty" || f === "unitPrice") l.amount = Math.round(num(l.qty) * num(l.unitPrice));
        if (f === "amount" && num(l.qty)) l.unitPrice = Math.round((num(l.amount) / num(l.qty)) * 100) / 100;
        if (f === "priceId" && v) l.koushu = S.prices[v].koushu;
        l.guess = false; draw();
      };
      m.querySelector("tbody").onclick = (e) => { const tr = e.target.closest("tr[data-i]"); if (tr && e.target.closest("[data-del]")) { doc.lines.splice(+tr.dataset.i, 1); draw(); } };
      $("#addL").onclick = () => { doc.lines.push({ name: "", qty: 1, unit: "式", unitPrice: 0, amount: 0, priceId: "", koushu: "その他" }); draw(); };
      $("#save").onclick = async () => {
        const o = { kind: doc.kind, vendor: doc.vendor || "", date: doc.date || "", projectId: doc.projectId || "", fileName: doc.fileName || "", method: doc.method || "", by: doc.by || S.me || "", created: doc.created || Date.now(),
          lines: doc.lines.filter((l) => l.name || l.amount).map((l) => ({ name: l.name, qty: num(l.qty), unit: l.unit || "", unitPrice: num(l.unitPrice), amount: num(l.amount), listPrice: num(l.listPrice), priceId: l.priceId || "", koushu: l.koushu || "その他" })) };
        if (doc.id) await DB.set(S.base + "/invoices/" + doc.id, o); else await DB.push(S.base + "/invoices", o);
        closeModal(); toast("保存しました。原価実行と単価の学習に反映されます");
      };
      $("#toEst") && ($("#toEst").onclick = () => {
        const p = S.projects[doc.projectId]; if (!p) return;
        doc.lines.forEach((l) => p.lines.push(Object.assign(MQ.supplierLine(l, S.settings, l.koushu), { priceId: l.priceId || "" })));
        p.lines = MQ.sortLines(p.lines); saveProject(p, true); closeModal();
        toast(`${doc.lines.length} 行を見積明細に追加しました（原価＝仕切、売価は${S.settings.listRate > 0 ? "上代×掛率" : "目標粗利率から"}）`); go(`#/p/${p.id}/est`);
      });
    };
    draw();
  }

  // ---------- 単価表と学習 ----------
  function renderPrices() {
    const L = MQ.learn(S.prices, S.invoices, S.projects, S.settings);
    const ids = Object.keys(S.prices).sort((a, b) => MQ.KOUSHU.indexOf(S.prices[a].koushu) - MQ.KOUSHU.indexOf(S.prices[b].koushu) || num(S.prices[a].order) - num(S.prices[b].order));
    const autoSel = (v) => `<option value="">（手入力）</option>` + Object.entries(MQ.AUTO_KEYS).map(([k, t]) => `<option value="${k}" ${k === v ? "selected" : ""}>${esc(t)}</option>`).join("") + (v && !MQ.AUTO_KEYS[v] ? `<option selected value="${esc(v)}">${esc(v)}</option>` : "");
    const ro = ADMIN ? "" : "disabled";
    const learnable = ids.filter((id) => L[id].n >= 2 && (Math.abs(L[id].cost - num(S.prices[id].cost)) >= 1 || Math.abs(L[id].suggestedStd - num(S.prices[id].std)) >= 1));
    main().innerHTML = `<div class="bar"><h2>単価表${ADMIN ? "・学習" : ""}</h2>${ADMIN ? `<button class="btn" id="addPr">＋ 項目を追加</button><button class="btn pri" id="applyAll" ${learnable.length ? "" : "disabled"}>学習結果をまとめて反映（${learnable.length}件）</button>` : '<span class="muted">単価表の変更は管理者が行います。見積ごとの補正は「② 見積明細」で。</span>'}</div>
      <div class="card"><p class="muted">学習原価＝請求書の実際の単価を、新しいほど重く平均（半減期 ${S.settings.halfLifeDays}日・極端な値は除外）。提案標準単価＝学習原価 ÷（1 − 目標粗利率 ${pct(S.settings.targetMargin)}）を100円単位で切り上げ。担当者補正＝見積で単価を手直しした平均の倍率。</p>
      <div class="tscroll"><table class="est prices"><thead><tr><th>工種</th><th>名称</th><th>仕様</th><th>単位</th><th>標準単価</th><th>原価単価</th><th>粗利率</th><th>図面連動</th><th class="lrn">請求書</th><th class="lrn">学習原価</th><th class="lrn">提案標準単価</th><th class="lrn">担当者補正</th><th></th></tr></thead><tbody>
      ${ids.map((id) => { const x = S.prices[id], l = L[id], m = x.std ? (x.std - x.cost) / x.std : 0;
        return `<tr data-id="${id}"><td><select data-pf="koushu" ${ro}>${MQ.KOUSHU.map((k) => `<option ${k === x.koushu ? "selected" : ""}>${k}</option>`).join("")}</select></td>
        <td><input data-pf="name" value="${esc(x.name)}" ${ro}></td><td><input data-pf="spec" value="${esc(x.spec)}" ${ro}></td><td><input data-pf="unit" class="u" value="${esc(x.unit)}" ${ro}></td>
        <td><input data-pf="std" type="number" value="${num(x.std)}" ${ro}></td><td><input data-pf="cost" type="number" value="${num(x.cost)}" ${ro}></td><td class="r ${judge(m, S.settings.targetMargin)}">${pct(m)}</td>
        <td><select data-pf="auto" ${ro}>${autoSel(x.auto)}</select></td>
        <td class="r lrn">${l.n ? l.n + "件" + (l.excluded ? `<small class="muted">（除外${l.excluded}）</small>` : "") : "-"}</td>
        <td class="r lrn">${l.n ? `¥${yen(l.cost)}<small class="muted"> ${yen(l.min)}〜${yen(l.max)}</small>` : "-"}</td>
        <td class="r lrn">${l.n ? `<b>¥${yen(l.suggestedStd)}</b>` : "-"}</td>
        <td class="r lrn">${l.corrN ? `${l.corrAvg >= 1 ? "+" : "−"}${(Math.abs(l.corrAvg - 1) * 100).toFixed(1)}%<small class="muted">（${l.corrN}件）</small>` : "-"}</td>
        <td>${ADMIN && l.n ? `<button class="btn sm" data-apply="${id}">反映</button>` : ""}${ADMIN ? `<button class="lnk del" data-pdel="${id}">✕</button>` : ""}</td></tr>`; }).join("")}
      </tbody></table></div></div>`;
    if (!ADMIN) return;
    const tb = main().querySelector("tbody");
    tb.onchange = (e) => { const tr = e.target.closest("tr[data-id]"), f = e.target.dataset.pf; if (!tr || !f) return; DB.set(`${S.base}/prices/${tr.dataset.id}/${f}`, /std|cost/.test(f) ? num(e.target.value) : e.target.value); };
    tb.onclick = (e) => {
      const a = e.target.closest("[data-apply]"), d = e.target.closest("[data-pdel]");
      if (a) { const l = L[a.dataset.apply]; DB.update(`${S.base}/prices/${a.dataset.apply}`, { cost: l.cost, std: l.suggestedStd, learnedAt: Date.now() }); toast("反映しました（これからの見積に使われます。作成済みの見積は明細を開き直すと標準単価が更新されます）", 4000); }
      if (d && confirm("この単価項目を削除しますか？")) DB.remove(`${S.base}/prices/${d.dataset.pdel}`);
    };
    $("#addPr").onclick = () => DB.set(`${S.base}/prices/${MQ.uid("p")}`, { koushu: "その他", name: "新しい項目", spec: "", unit: "式", std: 0, cost: 0, auto: "", order: 999 });
    $("#applyAll").onclick = () => { if (!confirm(`${learnable.length} 件の原価単価・標準単価を学習結果に置き換えます。よろしいですか？`)) return; const u = {}; learnable.forEach((id) => { u[id + "/cost"] = L[id].cost; u[id + "/std"] = L[id].suggestedStd; u[id + "/learnedAt"] = Date.now(); }); DB.update(`${S.base}/prices`, u); toast("反映しました"); };
  }

  // 単価表を更新したら、作成中の見積の「標準単価・原価単価」も追従させる（補正した値はそのまま）
  function syncLinePrices(p) {
    let ch = false;
    p.lines.forEach((l) => { const x = S.prices[l.priceId]; if (!x || l.src === "仕入見積") return; if (l.priceStd !== num(x.std) || l.costStd !== num(x.cost)) { l.priceStd = num(x.std); l.costStd = num(x.cost); ch = true; } });
    if (ch && (p.status === "見積中")) saveProject(p);
  }

  // ---------- 管理者：一括管理 ----------
  function renderDash() {
    const f = JSON.parse(sessionStorage.getItem("mq_dash") || "{}");
    const act = MQ.actuals(S.invoices, S.prices);
    const all = projList().filter((p) => (!f.staff || p.staff === f.staff) && (!f.status || p.status === f.status) && (!f.ym || String(p.date || "").slice(0, 7) === f.ym));
    const rows = all.map((p) => ({ p, c: MQ.calc(p, S.settings), a: (act[p.id] || {}).total || 0 }));
    const sum = (fn) => rows.reduce((s, r) => s + fn(r), 0);
    const won = rows.filter((r) => r.p.status === "受注" || r.p.status === "完了");
    const decided = rows.filter((r) => ["受注", "完了", "失注"].includes(r.p.status));
    const staffNames = Array.from(new Set(Object.values(S.staff).map((s) => s.name).concat(Object.values(S.projects).map((p) => p.staff)).filter(Boolean)));
    const tg = S.settings.targetMargin;
    const byStaff = {};
    rows.forEach((r) => { const k = r.p.staff || "-"; const b = (byStaff[k] = byStaff[k] || { n: 0, total: 0, net: 0, gross: 0, won: 0 }); b.n++; b.total += r.c.total; b.net += r.c.net; b.gross += r.c.gross; if (r.p.status === "受注" || r.p.status === "完了") b.won += r.c.net; });
    main().innerHTML = `<div class="bar"><h2>一括管理</h2>
      <select id="fs"><option value="">担当者：全員</option>${staffNames.map((n) => `<option ${f.staff === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>
      <select id="ft"><option value="">状況：すべて</option>${STATUS.map((s) => `<option ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      <input type="month" id="fm" value="${esc(f.ym || "")}"><button class="btn" id="csv">CSVで保存</button><button class="btn" id="bk">バックアップ</button></div>
      <div class="kpis"><div><span>案件数</span><b>${rows.length}</b></div><div><span>見積総額（税込）</span><b>¥${yen(sum((r) => r.c.total))}</b></div>
        <div><span>受注額（税抜）</span><b>¥${yen(won.reduce((s, r) => s + r.c.net, 0))}</b></div><div><span>受注率</span><b>${decided.length ? pct(won.length / decided.length) : "-"}</b></div>
        <div><span>見積粗利率（平均）</span><b class="judge ${judge(sum((r) => r.c.gross) / (sum((r) => r.c.net) || 1), tg)}">${pct(sum((r) => r.c.gross) / (sum((r) => r.c.net) || 1))}</b></div>
        <div><span>実行金額（請求書）</span><b>¥${yen(sum((r) => r.a))}</b></div></div>
      <div class="card"><div class="tscroll"><table class="mini wide dash"><tr><th>見積番号</th><th>工事名</th><th>施主</th><th>担当</th><th>見積日</th><th>状況</th><th>税込</th><th>粗利率</th><th>利益率設定</th><th>補正</th><th>実行金額</th><th>実行粗利率</th></tr>
      ${rows.map(({ p, c, a }) => `<tr><td>${esc(p.no)}</td><td><a href="#/p/${p.id}/est">${esc(p.name || "（無題）")}</a></td><td>${esc(p.client || "")}</td><td>${esc(p.staff || "")}</td><td>${esc(p.date || "")}</td>
        <td><select data-st="${p.id}" class="st ${STATUS_CLS[p.status] || ""}">${STATUS.map((s) => `<option ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td>
        <td class="r">¥${yen(c.total)}</td><td class="r ${judge(c.grossRate, tg)}">${pct(c.grossRate)}</td><td>${p.margin && p.margin.mode === "rate" ? pct(num(p.margin.rate)) : "標準"}</td>
        <td class="r">${c.rows.filter((r) => r.corrected).length || ""}</td><td class="r">${a ? "¥" + yen(a) : "-"}</td><td class="r ${a ? judge(c.net ? (c.net - a) / c.net : 0, tg) : ""}">${a ? pct(c.net ? (c.net - a) / c.net : 0) : "-"}</td></tr>`).join("")}
      </table></div></div>
      <div class="card"><h4>担当者別</h4><table class="mini wide"><tr><th>担当</th><th>案件</th><th>見積総額（税込）</th><th>受注額（税抜）</th><th>見積粗利率</th></tr>
      ${Object.entries(byStaff).map(([k, b]) => `<tr><td>${esc(k)}</td><td class="r">${b.n}</td><td class="r">¥${yen(b.total)}</td><td class="r">¥${yen(b.won)}</td><td class="r ${judge(b.net ? b.gross / b.net : 0, tg)}">${pct(b.net ? b.gross / b.net : 0)}</td></tr>`).join("")}</table></div>`;
    const setF = (k, v) => { f[k] = v; sessionStorage.setItem("mq_dash", JSON.stringify(f)); renderDash(); };
    $("#fs").onchange = (e) => setF("staff", e.target.value); $("#ft").onchange = (e) => setF("status", e.target.value); $("#fm").onchange = (e) => setF("ym", e.target.value);
    $$("[data-st]").forEach((s) => (s.onchange = () => { const p = S.projects[s.dataset.st]; p.status = s.value; saveProject(p, true); }));
    $("#csv").onclick = () => downloadCsv(`見積一覧_${today()}.csv`, [["見積番号", "工事名", "施主", "担当", "見積日", "状況", "税抜", "消費税", "税込", "原価", "粗利", "粗利率", "補助金", "実行金額"]].concat(rows.map(({ p, c, a }) => [p.no, p.name, p.client, p.staff, p.date, p.status, c.net, c.tax, c.total, c.cost, c.gross, (c.grossRate * 100).toFixed(1) + "%", c.subsidy, a])));
    $("#bk").onclick = backup;
  }
  async function backup() {
    const all = await DB.get(S.base);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(all)], { type: "application/json" })); a.download = `見積帳バックアップ_${today()}.json`; a.click();
  }

  // ---------- 管理者：設定 ----------
  function renderSettings() {
    const pr = S.profile, st = S.settings;
    const link = (page) => location.origin + location.pathname.replace(/[^/]*$/, page) + (DB.mode === "firebase" ? "?c=" + S.ck : DB.demo ? "?demo=1" : "");
    main().innerHTML = `<div class="bar"><h2>設定</h2></div>
      <div class="card"><h4>リンク</h4><p>担当者用：<input readonly class="link" value="${esc(link("index.html"))}"></p><p>管理者用：<input readonly class="link" value="${esc(link("admin.html"))}"></p>
        <p class="muted">${DB.mode === "firebase" ? "担当者には担当者用リンクを送ってください。リンクを知っている人は会社の見積を見られるので、社外に出さないでください。" : "いまは" + (DB.demo ? "体験版" : "この端末だけのお試しモード") + "です。"}</p></div>
      <div class="card grid2"><h4 class="wide">会社情報（見積書に載ります）</h4>
        ${[["name", "会社名"], ["rep", "代表者名"], ["address", "所在地"], ["tel", "電話番号"], ["regNo", "インボイス登録番号（T＋13桁）"], ["license", "建設業許可番号"], ["bank", "振込先（銀行・支店・種別・番号・名義）"]].map(([k, t]) => `<label class="fld">${t}<input data-pr="${k}" value="${esc(pr[k] || "")}"></label>`).join("")}
        <label class="fld">管理者の暗証番号を変える<input id="pin" inputmode="numeric" maxlength="8" placeholder="新しい暗証番号（空で解除）"></label><button class="btn sm" id="pinOk">暗証番号を保存</button></div>
      <div class="card grid2"><h4 class="wide">計算の設定</h4>
        <label class="fld">諸経費率 %<input data-se="keihiRate" data-pc="1" type="number" step="0.1" value="${(st.keihiRate * 100).toFixed(1)}"></label>
        <label class="fld">消費税率 %<input data-se="taxRate" data-pc="1" type="number" value="${(st.taxRate * 100).toFixed(0)}"></label>
        <label class="fld">目標粗利率 %<input data-se="targetMargin" data-pc="1" type="number" step="0.5" value="${(st.targetMargin * 100).toFixed(1)}"></label>
        <label class="fld">学習の半減期（日）<input data-se="halfLifeDays" type="number" value="${st.halfLifeDays}"></label>
        <label class="fld">仕入品の掛率（上代×掛率＝売価。0なら目標粗利率から）<input data-se="listRate" type="number" step="0.01" value="${st.listRate}"></label>
        <label class="fld">廃材量の目安（㎥／解体㎡）<input data-se="wastePerM2" type="number" step="0.005" value="${st.wastePerM2}"></label>
        <label class="fld">標準の天井高 mm<input data-se="defaultCh" type="number" value="${st.defaultCh}"></label></div>
      <div class="card"><h4>契約書の条文（全案件の共通の書式）</h4>
        <p class="muted">「第◯条（見出し）」で始まる行ごとに1条。案件ごとの特約は各案件の「契約書」タブで足せます。</p>
        <textarea id="clauses" rows="14" style="width:100%">${esc(clausesText(clauses()))}</textarea>
        <div class="row-end"><button class="btn sm" id="clReset">初期の文面に戻す</button><button class="btn pri sm" id="clSave">条文を保存</button></div>
        <div class="grid2"><label class="fld">引渡しの時期（初期値）<input data-pr="handover" value="${esc(pr.handover || "完成の日から7日以内")}"></label>
        <label class="fld">請求書のお支払期限（請求日から日数）<input data-se="billDueDays" type="number" value="${num(st.billDueDays) || 30}"></label></div></div>
      <div class="card"><h4>担当者</h4><div class="chips">${Object.entries(S.staff).map(([id, s]) => `<span class="chip">${esc(s.name)}${s.role === "admin" ? "（管理）" : ""} <button class="lnk del" data-sdel="${id}">✕</button></span>`).join("")}</div>
        <div class="row"><input id="sn" placeholder="担当者の名前"><button class="btn sm" id="sAdd">追加</button></div></div>
      <div class="card"><h4>バックアップ</h4><button class="btn" id="bk">全データを保存（JSON）</button> <label class="btn">読み込んで復元<input type="file" id="rs" accept=".json" hidden></label></div>`;
    main().onchange = (e) => {
      const t = e.target;
      if (t.dataset.pr) DB.set(`${S.base}/profile/${t.dataset.pr}`, t.value);
      if (t.dataset.se) DB.set(`${S.base}/settings/${t.dataset.se}`, t.dataset.pc ? num(t.value) / 100 : num(t.value));
    };
    $("#pinOk").onclick = async () => { const v = $("#pin").value.trim(); const h = v ? await sha(S.ck + v) : ""; await DB.set(`${S.base}/profile/pinHash`, h); if (h) sessionStorage.setItem("mq_pin_" + S.ck, h); toast(v ? "暗証番号を保存しました" : "暗証番号を解除しました"); };
    $("#sAdd").onclick = () => { const n = $("#sn").value.trim(); if (n) DB.set(`${S.base}/staff/${MQ.uid("s")}`, { name: n, role: "staff" }); };
    $$("[data-sdel]").forEach((b) => (b.onclick = () => confirm("名簿から外しますか？（案件は残ります）") && DB.remove(`${S.base}/staff/${b.dataset.sdel}`)));
    $("#bk").onclick = backup;
    $("#clSave").onclick = () => { DB.set(`${S.base}/profile/clauses`, parseClauses($("#clauses").value)); toast("条文を保存しました"); };
    $("#clReset").onclick = () => { if (confirm("条文を初期の文面に戻しますか？")) { DB.set(`${S.base}/profile/clauses`, null); $("#clauses").value = clausesText(DEFAULT_CLAUSES); } };
    $("#rs").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; if (!confirm("いまのデータを、ファイルの内容で置き換えます。よろしいですか？")) return; const j = JSON.parse(await f.text()); await DB.set(S.base, j); toast("復元しました"); location.reload(); };
    $$(".link").forEach((i) => (i.onclick = () => { i.select(); navigator.clipboard && navigator.clipboard.writeText(i.value).then(() => toast("コピーしました")); }));
  }

  // ---------- 体験版・お試しの初期データ ----------
  async function seed(demo) {
    const base = S.base;
    const prices = MQ.defaultPrices();
    await DB.set(base + "/profile", { name: "有限会社栗駒建業（サンプル）", address: "宮城県栗原市", tel: "", regNo: "", rep: "", bank: "サンプル銀行 栗原支店 普通 0000000 ユ）クリコマケンギョウ", created: Date.now(), pinHash: "" });
    await DB.set(base + "/settings", MQ.DEFAULT_SETTINGS);
    await DB.set(base + "/prices", prices);
    await DB.set(base + "/staff", { s1: { name: "高橋", role: "admin" }, s2: { name: "佐藤", role: "staff" }, s3: { name: "鈴木", role: "staff" } });
    if (!demo) return;
    // 1) LDK 改修：自動で作った現況図・完成図
    const plan = demoPlans();
    const g = { file: "現況図（サンプル）.png", w: plan.w, h: plan.h, ppm: plan.ppm, scaleDen: 100, origin: { x: 0, y: 0 }, originSet: true, ch: 2400, shapes: plan.gShapes };
    const k = { file: "完成図（サンプル）.png", w: plan.w, h: plan.h, ppm: plan.ppm, scaleDen: 100, origin: { x: 0, y: 0 }, originSet: true, ch: 2400, shapes: plan.kShapes };
    const p1 = normProject({ id: "Pdemo1", no: "M-2026-0142", name: "サンプル様邸 LDK改修工事", client: "サンプル 一郎", address: "宮城県仙台市青葉区○○町1-2-3", site: "宮城県仙台市青葉区○○町1-2-3", kind: "リフォーム",
      date: "2026-10-05", validDays: 30, start: "2026-11-09", end: "2026-11-27", summary: "LDKの床・壁・天井の内装改修、パントリー間仕切壁の新設、照明・コンセント工事、室内ドア交換", staff: "佐藤", status: "提出済",
      created: Date.now() - 86400000 * 3, lines: [], subsidy: [], nebiki: 0, margin: { mode: "std", rate: 0.25 }, pay: [0.3, 0.4, 0.3], drawings: { genkyo: g, kansei: k } });
    const r = MQ.measure(g, k, MQ.DEFAULT_SETTINGS);
    p1.lines = MQ.autoLines(r.metrics, prices, []);
    const lab = MQ.newLine({ priceId: "p008", koushu: "木工事", name: "大工手間", spec: "造作工事", unit: "人工", qtyAuto: 2, priceStd: 28000, costStd: 20000, src: "手入力" });
    p1.lines = MQ.sortLines(p1.lines.concat([lab]));
    await DB.set(base + "/images/Pdemo1", { genkyo: plan.gUrl, kansei: plan.kUrl });
    // 2) 内窓工事：仕入見積（上代・仕切）から作った見積と補助金
    const W = [["1F 和室1 東 インプラス 2枚建 1720×1210", 48000, 120000, 34000], ["1F 和室1 南 インプラス 2枚建テラス 1718×1743", 83280, 208200, 52000], ["1F リビング 南 インプラス 4枚建テラス 2564×2163", 155600, 389000, 76000],
      ["1F 和室2 東 インプラス 2枚建テラス 1713×1800", 80400, 201000, 52000], ["1F 和室2 西 インプラス 2枚建 1718×905", 38800, 97000, 0], ["1F 浴室 北 サーモスII-H 2枚建 1540×970", 58600, 146500, 29000]];
    const p2 = normProject({ id: "Pdemo2", no: "M-2026-0150", name: "サンプル様邸 内窓工事", client: "サンプル 花子", site: "宮城県仙台市泉区○○", kind: "リフォーム", date: "2026-10-02", validDays: 30, staff: "鈴木", status: "見積中",
      created: Date.now() - 86400000, subsidy: [{ name: "先進的窓リノベ（概算）", amount: 243000 }], nebiki: 0, margin: { mode: "rate", rate: 0.22 }, pay: [0, 0, 1], drawings: {},
      lines: W.map(([n, cost, list]) => MQ.newLine({ koushu: "建具工事", name: n, unit: "箇所", qtyAuto: 1, costStd: cost, priceStd: MQ.ceilTo(cost / 0.75, 10), listPrice: list, src: "仕入見積" }))
        .concat([MQ.newLine({ priceId: "p015", koushu: "建具工事", name: "内窓取付手間", spec: "樹脂内窓", unit: "箇所", qtyAuto: 6, priceStd: 8000, costStd: 5000, src: "手入力" })]) });
    // 3) 完了済み（請求書で原価実行）
    const p3 = normProject(JSON.parse(JSON.stringify(p1))); p3.id = "Pdemo3"; p3.no = "M-2026-0098"; p3.name = "サンプル様邸 洋室改修工事"; p3.client = "見本 太郎"; p3.status = "完了"; p3.staff = "高橋"; p3.date = "2026-06-10"; p3.drawings = {};
    p3.lines.forEach((l) => { l.src = "手入力"; l.qty = l.qtyAuto; }); p3.lines[0] && (p3.lines[0].price = 25000);
    p3.start = "2026-07-01"; p3.end = "2026-07-20"; p3.contract = { date: "2026-06-20" };
    p3.bills = [["I-2026-0031", "契約金", "2026-06-20", "2026-07-20", "2026-07-08"], ["I-2026-0040", "中間金", "2026-07-10", "2026-08-09", "2026-07-31"], ["I-2026-0052", "完成金", "2026-07-25", "2026-08-24", ""]]
      .map(([no, kind, date, due, paidDate], i) => ({ id: "Bd" + i, no, kind, date, due, paid: !!paidDate, paidDate, memo: "", net: 0 }));
    await DB.set(base + "/projects", { Pdemo1: p1, Pdemo2: p2, Pdemo3: p3 });
    const inv = (date, vendor, pid, lines) => ({ kind: "請求書", date, vendor, projectId: pid, by: "高橋", created: Date.parse(date), fileName: "サンプル", lines: lines.map(([priceId, name, qty, unit, up]) => ({ priceId, name, qty, unit, unitPrice: up, amount: Math.round(qty * up), koushu: prices[priceId].koushu })) });
    await DB.set(base + "/invoices", {
      i1: inv("2026-07-10", "株式会社サンプル内装", "Pdemo3", [["p009", "フローリング張り（材工）", 28.98, "㎡", 6600], ["p010", "壁クロス貼り", 52.4, "㎡", 1000], ["p011", "天井クロス貼り", 28.98, "㎡", 1000], ["p012", "巾木", 21.8, "m", 750]]),
      i2: inv("2026-07-12", "サンプル電設", "Pdemo3", [["p016", "DL取付", 4, "箇所", 4200], ["p017", "コンセント増設", 3, "箇所", 5500]]),
      i3: inv("2026-07-15", "サンプル解体", "Pdemo3", [["p003", "床解体", 28.98, "㎡", 1600], ["p002", "産廃処分", 2, "㎥", 13000], ["p001", "養生", 1, "式", 20000]]),
      i4: inv("2025-11-20", "株式会社サンプル内装", "", [["p009", "フローリング張り", 40, "㎡", 6300], ["p010", "クロス", 120, "㎡", 960], ["p011", "天井クロス", 40, "㎡", 960]]),
      i5: inv("2026-03-02", "サンプル電設", "", [["p016", "ダウンライト取付", 8, "箇所", 4000], ["p017", "コンセント", 5, "箇所", 5200]])
    });
  }
  // 体験版の図面（現況：LDK＋和室、中央の壁あり／完成：中央の壁を撤去しパントリー壁を新設）
  function demoPlans() {
    const ppm = 0.08, W = 1100, H = 760; // 1px = 12.5mm（1/100の図面を約200dpiで読んだ程度）
    const mm = (v) => v * ppm, X0 = 120, Y0 = 110;
    const mk = (variant) => {
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d");
      c.fillStyle = "#fff"; c.fillRect(0, 0, W, H); c.strokeStyle = "#111"; c.lineWidth = 4;
      c.strokeRect(X0, Y0, mm(9100), mm(5460));
      c.lineWidth = 3; c.beginPath();
      if (variant === "g") { c.moveTo(X0 + mm(6370), Y0); c.lineTo(X0 + mm(6370), Y0 + mm(5460)); }
      else { c.moveTo(X0 + mm(6370), Y0); c.lineTo(X0 + mm(6370), Y0 + mm(5460)); c.moveTo(X0 + mm(1820), Y0); c.lineTo(X0 + mm(1820), Y0 + mm(1820)); c.lineTo(X0, Y0 + mm(1820)); }
      c.stroke();
      c.fillStyle = "#111"; c.font = "22px sans-serif"; c.fillText(variant === "g" ? "現況 1階平面図" : "完成 1階平面図", X0, 60); c.font = "16px sans-serif"; c.fillText("S=1/100", W - 140, 60);
      c.font = "18px sans-serif"; c.fillText("LDK 18帖", X0 + mm(3000), Y0 + mm(3000)); c.fillText("和室 6帖", X0 + mm(7200), Y0 + mm(2800));
      if (variant === "k") c.fillText("パントリー", X0 + mm(300), Y0 + mm(1000));
      for (let i = 0; i < (variant === "g" ? 1 : 4); i++) { c.beginPath(); c.arc(X0 + mm(1500 + 1100 * i), Y0 + mm(3600), 7, 0, 7); c.stroke(); }
      return cv.toDataURL("image/png");
    };
    const R = (x, y, w, h) => [{ x: X0 + mm(x), y: Y0 + mm(y) }, { x: X0 + mm(x + w), y: Y0 + mm(y) }, { x: X0 + mm(x + w), y: Y0 + mm(y + h) }, { x: X0 + mm(x), y: Y0 + mm(y + h) }];
    const P = (x, y) => ({ x: X0 + mm(x), y: Y0 + mm(y) });
    const ldk = { type: "room", name: "LDK", pts: R(0, 0, 6370, 4550), floor: true, wall: true, ceil: true };
    const gShapes = [ldk, { type: "wall", pts: [P(6370, 0), P(6370, 5460)] }, { type: "pt", kind: "door", ...P(6370, 4900) }, { type: "pt", kind: "light", ...P(1500, 3600) }];
    const kShapes = [JSON.parse(JSON.stringify(ldk)), { type: "wall", pts: [P(6370, 0), P(6370, 5460)] }, { type: "wall", pts: [P(1820, 0), P(1820, 1820)] }, { type: "wall", pts: [P(1820, 1820), P(0, 1820)] },
      { type: "pt", kind: "door", replace: true, ...P(6370, 4900) }, { type: "pt", kind: "light", replace: true, ...P(1500, 3600) },
      ...[1, 2, 3].map((i) => ({ type: "pt", kind: "light", ...P(1500 + 1100 * i, 3600) })), ...[0, 1, 2].map((i) => ({ type: "pt", kind: "outlet", ...P(300 + 600 * i, 4400) }))];
    return { w: W, h: H, ppm, gUrl: mk("g"), kUrl: mk("k"), gShapes, kShapes };
  }

  // 単価表が変わったら、開いている見積の標準単価を追従
  const _render = render;
  render = function () { if (S.route[0] === "p" && S.projects[S.route[1]]) syncLinePrices(S.projects[S.route[1]]); _render(); };

  window.addEventListener("load", boot);
  window.MQApp = { S, go };
})();
