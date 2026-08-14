// ===== 匠協コネクト 共通ヘルパー =====
(function (global) {
  const CFG = global.GYOUSHA_CONFIG || {};
  const H = {};
  H.cfg = CFG;
  H.appName = CFG.appName || "匠協コネクト";
  H.trades = CFG.trades || [];
  H.tradeMap = {};
  H.trades.forEach((t) => { H.tradeMap[t.key] = t; });
  const OTHER = { key: "other", label: "その他", icon: "📌", color: "#64748b", free: true };

  // 業者レコードの業種表示（アイコン・色・ラベル）。その他は自由記述の業種名を使う。
  H.tradeInfo = (item) => {
    const t = H.tradeMap[item && item.trade] || OTHER;
    let label = t.label;
    if (item && item.trade === "other") label = (item.tradeOther && String(item.tradeOther).trim()) || "その他";
    return { icon: t.icon, color: t.color, label };
  };

  H.esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // src/href に入れる前の安全化（http(s) と data:image/pdf のみ許可）
  H.safeUrl = (u) => {
    u = String(u == null ? "" : u).trim();
    if (/^https?:\/\//i.test(u)) return H.esc(u);
    if (/^data:(image\/|application\/pdf)/i.test(u)) return H.esc(u);
    return "";
  };

  // 本文をエスケープしつつ URL だけリンク化（XSS安全）
  H.linkify = (raw) => {
    raw = String(raw == null ? "" : raw);
    const re = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
    let out = "", last = 0, m;
    while ((m = re.exec(raw))) {
      out += H.esc(raw.slice(last, m.index));
      let url = m[0], trail = "";
      const tm = url.match(/[)\]\.,。、！？!?）」]+$/);
      if (tm) { trail = tm[0]; url = url.slice(0, url.length - trail.length); }
      const href = /^www\./i.test(url) ? "https://" + url : url;
      out += '<a href="' + H.esc(href) + '" target="_blank" rel="noopener">' + H.esc(url) + "</a>" + H.esc(trail);
      last = m.index + m[0].length;
    }
    out += H.esc(raw.slice(last));
    return out;
  };

  H.toArr = (obj) => (obj ? Object.keys(obj).map((k) => Object.assign({ _key: k }, obj[k])) : []);

  // 体験版（?demo=1）の初期データ。管理(admin)・利用者(index)どちらも同じ端末内サンドボックスを共有する。
  // 会社 DEMO ＋ 協力業者4社。R1は既に「受ける」返信済み、R2は未返信（利用者側で返信を体験できる）。
  H.DEMO_CK = "DEMO";
  H.DEMO_BK = "P2"; // 利用者体験は田中大工（未返信の依頼R2あり）に紐づける
  H.demoSeed = function () {
    const now = Date.now();
    const _d = new Date();
    const ymd = (off) => { const d = new Date(_d); d.setDate(d.getDate() + off); return d.getFullYear() + "-" + H.pad2(d.getMonth() + 1) + "-" + H.pad2(d.getDate()); };
    return { companies: { DEMO: {
      profile: { name: "（体験）山田工務店", createdAt: now, terms: { defectYears: "2", court: "注文者の主たる営業所の所在地を管轄する地方裁判所" } },
      partners: {
        P1: { trade: "denki", name: "丸山電気工事", tel: "090-1111-2222", contact: "丸山", area: "市内全域", note: "急ぎ対応可。分電盤の増設が得意。", fav: true, createdAt: now - 5000, avail: { [ymd(2)]: "free", [ymd(3)]: "free", [ymd(9)]: "maybe" } },
        P2: { trade: "daiku", name: "田中大工", tel: "080-3333-4444", contact: "田中", area: "", note: "", fav: false, createdAt: now - 4000, avail: { [ymd(4)]: "free", [ymd(5)]: "free", [ymd(6)]: "maybe" } },
        P3: { trade: "tosou", name: "佐藤塗装", tel: "070-5555-6666", contact: "佐藤", area: "△△市周辺", note: "外壁塗装が得意", fav: false, createdAt: now - 3000, avail: { [ymd(8)]: "free" } },
        P4: { trade: "other", tradeOther: "解体", name: "北解体興業", tel: "090-7777-8888", contact: "", area: "", note: "", fav: false, createdAt: now - 2000 }
      },
      requests: {
        R1: { partnerKey: "P1", partnerName: "丸山電気工事", title: "○○邸 新築工事", site: "市内△△町3-1", dateText: "来週 月〜水", body: "分電盤の設置と各部屋の配線をお願いします。", createdAt: now - 100000, reply: "accept", replyNote: "月曜から入れます。よろしくお願いします。", repliedAt: now - 90000 },
        R2: { partnerKey: "P2", partnerName: "田中大工", title: "△△マンション 改修", site: "□□市 本町", dateText: "今週 金曜", body: "内部造作の応援をお願いできますか？", createdAt: now - 50000, reply: null }
      },
      announcements: {
        A1: { body: "年末年始は12/29〜1/4を休業とします。ご協力よろしくお願いします。", targetTrade: "", createdAt: now - 30000 }
      },
      contracts: {
        C1: { partnerKey: "P2", partnerName: "田中大工", title: "△△マンション 改修 内装工事", site: "□□市 本町2-5", content: "内部造作・ボード張り一式（1〜2階）", amount: 350000, taxRate: 10, payTerm: "完成・引渡し後、翌月末支払い（銀行振込）", workDates: [ymd(3), ymd(4), ymd(7)], startDate: ymd(3), endDate: ymd(7), handover: "完成後、注文者立会いで検査のうえ引渡し", advance: "", nowork: "日曜・祝日は施工しない", note: "", fromSign: null, toSign: { companyName: "田中大工", name: "田中 一郎", at: now - 40000 }, createdAt: now - 45000, updatedAt: now - 40000 },
        C2: { partnerKey: "P2", partnerName: "田中大工", title: "◇◇邸 造作工事（先行の成立案件）", site: "市内 桜町1-2", content: "造作工事一式", amount: 200000, taxRate: 10, taxMode: "incl", payTerm: "完成・引渡し後、翌月末支払い", workDates: [ymd(5), ymd(6)], startDate: ymd(5), endDate: ymd(6), handover: "", advance: "", nowork: "", note: "", fromSign: { companyName: "（体験）山田工務店", name: "山田 太郎", at: now - 60000 }, toSign: { companyName: "田中大工", name: "田中 一郎", at: now - 55000 }, createdAt: now - 65000, updatedAt: now - 55000 },
        C3: { partnerKey: "P1", partnerName: "丸山電気工事", title: "□□店舗 配線改修（完了）", site: "市内 中央2-8", content: "配線改修一式", amount: 80000, taxRate: 10, taxMode: "excl", payTerm: "翌月末 銀行振込", workDates: [ymd(-20), ymd(-19)], startDate: ymd(-20), endDate: ymd(-19), handover: "", advance: "", nowork: "", note: "", fromSign: { companyName: "（体験）山田工務店", name: "山田 太郎", at: now - 210000 }, toSign: { companyName: "丸山電気工事", name: "丸山", at: now - 215000 }, completedAt: now - 100000, createdAt: now - 220000, updatedAt: now - 100000 },
        C4: { partnerKey: "P3", partnerName: "佐藤塗装", title: "◎◎邸 外壁塗装（工期経過→自動完了）", site: "市内 東町4-1", content: "外壁塗装一式", amount: 300000, taxRate: 10, taxMode: "excl", payTerm: "完成・引渡し後、翌月末支払い", workDates: [ymd(-3), ymd(-2)], startDate: ymd(-3), endDate: ymd(-2), handover: "", advance: "", nowork: "", note: "", fromSign: { companyName: "（体験）山田工務店", name: "山田 太郎", at: now - 300000 }, toSign: { companyName: "佐藤塗装", name: "佐藤", at: now - 305000 }, createdAt: now - 320000, updatedAt: now - 300000 }
      }
    } } };
  };
  H.telDigits = (t) => String(t || "").replace(/[^\d+]/g, "");

  H.pad2 = (n) => String(n).padStart(2, "0");
  H.ymd = (d) => { d = d || new Date(); return d.getFullYear() + "-" + H.pad2(d.getMonth() + 1) + "-" + H.pad2(d.getDate()); };
  H.fmtDate = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${H.pad2(d.getHours())}:${H.pad2(d.getMinutes())}`;
  };
  // "YYYY-MM-DD" を「YYYY年M月D日」に。日付形式でなければそのまま返す（旧・自由入力対応）。
  H.fmtYmd = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    return m ? (+m[1] + "年" + (+m[2]) + "月" + (+m[3]) + "日") : (s || "");
  };
  // 工期などの範囲表示。同年は末尾の年を、同年同月はさらに月も省いて短く。
  H.fmtDateRange = (start, end) => {
    const s = String(start || "").trim(), e = String(end || "").trim();
    const ms = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s), me = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e);
    const fs = H.fmtYmd(s), fe = H.fmtYmd(e);
    if (ms && me) {
      if (ms[1] === me[1] && ms[2] === me[2]) return fs + "〜" + (+me[3]) + "日";
      if (ms[1] === me[1]) return fs + " 〜 " + (+me[2]) + "月" + (+me[3]) + "日";
      return fs + " 〜 " + fe;
    }
    return (fs + (fe ? " 〜 " + fe : "")).trim();
  };
  // 契約の工事日（YYYY-MM-DD の配列）。新: workDates、旧: startDate〜endDate を展開。
  H.contractDates = (c) => {
    const iso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
    if (c && c.workDates && c.workDates.length) return c.workDates.filter(iso);
    if (c && iso(c.startDate) && iso(c.endDate)) {
      const out = []; const d = new Date(c.startDate + "T00:00:00"), e = new Date(c.endDate + "T00:00:00");
      for (; d <= e; d.setDate(d.getDate() + 1)) out.push(H.ymd(d));
      return out;
    }
    if (c && iso(c.startDate)) return [c.startDate];
    return [];
  };
  // 複数日をまとめて表示（連続はまとめて範囲に）。例：2026年8月17日〜18日・20日
  H.fmtDates = (arr) => {
    const ds = (arr || []).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)).slice().sort();
    if (!ds.length) return "";
    const runs = []; let run = [ds[0]];
    for (let i = 1; i < ds.length; i++) {
      if ((new Date(ds[i] + "T00:00:00") - new Date(ds[i - 1] + "T00:00:00")) === 86400000) run.push(ds[i]);
      else { runs.push(run); run = [ds[i]]; }
    }
    runs.push(run);
    let first = true;
    return runs.map((r) => {
      const a = r[0].split("-"), b = r[r.length - 1].split("-");
      const head = first ? (+a[0] + "年" + (+a[1]) + "月" + (+a[2]) + "日") : ((+a[1]) + "月" + (+a[2]) + "日");
      first = false;
      if (r.length === 1) return head;
      const tail = (a[1] === b[1]) ? ((+b[2]) + "日") : ((+b[1]) + "月" + (+b[2]) + "日");
      return head + "〜" + tail;
    }).join("・");
  };
  // 工事日程の表示（新workDates優先、旧は範囲/自由入力）。
  H.fmtSchedule = (c) => (c && c.workDates && c.workDates.length) ? H.fmtDates(c.workDates) : H.fmtDateRange(c && c.startDate, c && c.endDate);
  // 成立（両者署名）した契約の工事日を業者ごとに集計（日→{title,cid}）。カレンダーの「工事予定」表示に使う。
  H.jobDates = (contracts, bk, excludeCid) => {
    const set = {};
    Object.keys(contracts || {}).forEach((k) => {
      if (k === excludeCid) return;
      const c = contracts[k];
      if (!c || c.partnerKey !== bk) return;
      if (!(c.fromSign && c.fromSign.at && c.toSign && c.toSign.at)) return; // 成立のみ
      H.contractDates(c).forEach((d) => { set[d] = { title: c.title || "", cid: k }; });
    });
    return set;
  };
  // 描画済みカレンダーに「工事予定」（成立した工事日）を重ねる。該当セルは .job＋「工事」表示・操作不可。
  H.paintJobs = (rootEl, jobSet) => {
    if (!rootEl) return;
    Array.prototype.forEach.call(rootEl.querySelectorAll(".calcell[data-date]"), (el) => {
      if (el.classList.contains("past")) return;
      const d = el.dataset.date;
      if (jobSet && jobSet[d]) {
        el.classList.add("job");
        el.innerHTML = '<span class="dn">' + (+d.split("-")[2]) + '</span><span class="jb">工事</span>';
        el.title = jobSet[d].title || "工事予定";
      }
    });
  };

  // ---- 空き状況カレンダー ----
  H.todayStr = () => H.ymd(new Date());
  H.upcomingFreeDates = (avail) => { const t = H.todayStr(); return Object.keys(avail || {}).filter((d) => avail[d] === "free" && d >= t).sort(); };
  H.upcomingMaybeDates = (avail) => { const t = H.todayStr(); return Object.keys(avail || {}).filter((d) => avail[d] === "maybe" && d >= t).sort(); };
  H.mdFromYmd = (s) => { const p = String(s).split("-"); return (+p[1]) + "/" + (+p[2]); };
  // 3ヶ月ぶんのカレンダーHTML。各セルに data-date。avail[YYYY-MM-DD] = "free"|"maybe"。
  H.calendarHTML = (avail, months) => {
    avail = avail || {}; months = months || 3;
    const wd = ["日", "月", "火", "水", "木", "金", "土"], today = H.todayStr();
    const base = new Date(); base.setDate(1);
    let out = "";
    for (let m = 0; m < months; m++) {
      const d = new Date(base.getFullYear(), base.getMonth() + m, 1), y = d.getFullYear(), mo = d.getMonth();
      out += '<div class="calmonth"><div class="mh">' + y + "年 " + (mo + 1) + "月</div><div class=\"calgrid\">";
      for (let w = 0; w < 7; w++) out += '<div class="wd' + (w === 0 ? " sun" : w === 6 ? " sat" : "") + '">' + wd[w] + "</div>";
      const first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
      for (let i = 0; i < first; i++) out += '<div class="calcell empty"></div>';
      for (let day = 1; day <= days; day++) {
        const ds = y + "-" + H.pad2(mo + 1) + "-" + H.pad2(day), st = avail[ds];
        let cls = "calcell";
        if (ds < today) cls += " past";
        else if (st === "free") cls += " free";
        else if (st === "maybe") cls += " maybe";
        out += '<div class="' + cls + '" data-date="' + ds + '">' + day + "</div>";
      }
      out += "</div></div>";
    }
    return out;
  };
  // 空き日を短くまとめた表示（例：8/12, 8/13 +2）
  H.availSummary = (avail) => {
    const f = H.upcomingFreeDates(avail), mb = H.upcomingMaybeDates(avail);
    if (!f.length && !mb.length) return { has: false, html: '<span style="color:#9aa7b5">空き予定なし</span>' };
    let s = "";
    if (f.length) s += '<span class="availtag free">🟢 空き ' + f.slice(0, 3).map(H.mdFromYmd).join("・") + (f.length > 3 ? " +" + (f.length - 3) : "") + "</span>";
    if (mb.length) s += '<span class="availtag maybe">🟡 応相談 ' + mb.slice(0, 2).map(H.mdFromYmd).join("・") + (mb.length > 2 ? " +" + (mb.length - 2) : "") + "</span>";
    return { has: f.length > 0, html: s };
  };

  // 依頼の状態ラベル
  H.replyLabel = (r) => {
    if (!r) return { text: "未読・未返信", color: "#8a94a2", bg: "#eef1f4" };
    if (r === "accept") return { text: "受ける", color: "#1a7a45", bg: "#eafaf0" };
    if (r === "decline") return { text: "不可", color: "#c0392b", bg: "#fdeceb" };
    return { text: "未読・未返信", color: "#8a94a2", bg: "#eef1f4" };
  };

  // 招待リンクの生成（現在のURLからディレクトリを求め、各アプリのURLを組み立てる）
  H.baseDir = () => {
    try {
      const u = new URL(global.location.href);
      const path = u.pathname.replace(/[^/]*$/, ""); // 末尾のファイル名を除く
      return u.origin + path;
    } catch (_) { return ""; }
  };
  const demoSuffix = () => (global.DB && global.DB.demo ? "&demo=1" : "");
  H.partnerLink = (ck, bk) => H.baseDir() + "index.html?c=" + encodeURIComponent(ck) + "&b=" + encodeURIComponent(bk) + demoSuffix();
  H.adminLink = (ck) => H.baseDir() + "admin.html?c=" + encodeURIComponent(ck) + demoSuffix();

  H.toast = (msg, type) => {
    let t = document.getElementById("__toast");
    if (!t) { t = document.createElement("div"); t.id = "__toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = "toast show " + (type || "");
    clearTimeout(H._tt);
    H._tt = setTimeout(() => (t.className = "toast"), 2400);
  };

  // 共有（LINE等）：対応端末は共有シート、非対応はクリップボードにコピー
  H.share = (text) => {
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => H.toast("コピーしました。LINE等に貼り付けて送ってください", "ok")).catch(() => H.toast("コピーできませんでした", "err"));
    } else {
      H.toast("この端末では共有できません", "err");
    }
  };
  // LINEで送る：LINEの「送信先（友だち）を選ぶ」画面を直接開く。
  // PCの共有シート（LINEが出ない）を避け、スマホ・PCともLINEに送れる。
  H.shareLine = (text) => {
    var url = "https://line.me/R/msg/text/?" + encodeURIComponent(text || "");
    var w = window.open(url, "_blank");
    if (!w) { // ポップアップがブロックされた場合は現在のタブで開く
      try { location.href = url; } catch (_) { H.toast("LINEを開けませんでした", "err"); }
    }
  };
  // ---- PWA：ホーム画面に追加（アプリにする） ----
  H._deferred = null;
  H.setupInstall = function () {
    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); H._deferred = e; });
  };
  H.isStandalone = function () {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  };
  H._sheet = function (innerHTML) {
    var ov = document.createElement("div"); ov.className = "ov on";
    ov.innerHTML = '<div class="sheet">' + innerHTML + "</div>";
    var close = function () { try { document.body.removeChild(ov); } catch (_) {} document.body.style.overflow = ""; };
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov); document.body.style.overflow = "hidden";
    return { ov: ov, close: close };
  };
  H.showInstall = function (appName, opts) {
    opts = opts || {};
    if (H.isStandalone()) { H.toast("すでにアプリとして起動中です", "ok"); return; }
    if (H._deferred) {
      H._deferred.prompt();
      try { H._deferred.userChoice.then(function () { H._deferred = null; }); } catch (_) {}
      return;
    }
    var ua = navigator.userAgent || "", isIOS = /iphone|ipad|ipod/i.test(ua), isAndroid = /android/i.test(ua);
    var step = function (n, t) { return '<div class="istep"><div class="in">' + n + "</div><div>" + t + "</div></div>"; };
    var body;
    if (isIOS) body = "<b>iPhone / iPad（Safari）</b>" + step(1, "画面下の <b>共有ボタン</b>（□に↑）をタップ") + step(2, "少し下にスクロールして <b>「ホーム画面に追加」</b> をタップ") + step(3, "右上の <b>「追加」</b> をタップ");
    else if (isAndroid) body = "<b>Android（Chrome）</b>" + step(1, "右上の <b>メニュー（⋮）</b> をタップ") + step(2, "<b>「アプリをインストール」</b> または <b>「ホーム画面に追加」</b>") + step(3, "<b>「追加 / インストール」</b> をタップ");
    else body = "<b>パソコン（Chrome / Edge）</b>" + step(1, "アドレスバー右の <b>インストール（⊞/⊕）</b> アイコン、または右上メニュー") + step(2, "<b>「アプリをインストール」</b> を選ぶ") + step(3, "<b>「インストール」</b> をクリック");
    var other = "";
    if (opts.otherUrl) other = '<div class="ihint">👥 ' + H.esc(opts.otherLabel || "もう一方のアプリ") + "も同じスマホに追加できます。下のボタンで開き、その画面で同じ手順（📲アプリ）を行ってください。</div>" +
      '<button class="btn full ln" id="__otherApp">🔗 ' + H.esc(opts.otherLabel || "開く") + "を開く</button>";
    var s = H._sheet("<h3>📲 " + H.esc(appName) + " をホーム画面に</h3>" + body +
      '<div class="ihint">追加すると、アイコンから1タップで全画面のアプリとして開けます（次回からブラウザ不要）。</div>' + other +
      '<button class="btn full ghost" id="__closeInstall" style="margin-top:8px">閉じる</button>');
    s.ov.querySelector("#__closeInstall").onclick = s.close;
    if (opts.otherUrl) s.ov.querySelector("#__otherApp").onclick = function () { window.open(opts.otherUrl, "_blank"); };
  };
  H.showHelp = function (title, items, videos) {
    var vhtml = (videos && videos.length)
      ? '<div class="helpvids"><div class="hvlabel">▶ 動画で見る（音声つき）</div>' + videos.map(function (v, idx) {
          return '<button class="btn full vidbtn" data-vidx="' + idx + '">🎬 ' + H.esc(v.label) + "</button>";
        }).join("") + "</div>"
      : "";
    var body = (items || []).map(function (it) {
      return '<details class="helpitem"><summary>' + H.esc(it.q) + '</summary><div class="helpa">' + it.a + "</div></details>";
    }).join("");
    var s = H._sheet("<h3>❓ " + H.esc(title) + "</h3>" + vhtml + body + '<button class="btn full ghost" id="__closeHelp" style="margin-top:10px">閉じる</button>');
    s.ov.querySelector("#__closeHelp").onclick = s.close;
    if (videos && videos.length) Array.prototype.forEach.call(s.ov.querySelectorAll("[data-vidx]"), function (b) {
      b.onclick = function () { var v = videos[+b.dataset.vidx]; if (v.url) H.playVideo(v.title || v.label, v.url); else H.playSlides(v.title || v.label, v.slides); };
    });
  };
  // MP4の説明動画を全画面で再生（別タブで開いて保存・共有も可）。
  H.playVideo = function (title, url) {
    var ov = document.createElement("div"); ov.className = "vov on";
    ov.innerHTML = '<div class="vplayer vplayer-mp4"><button class="vclose" data-vclose>✕</button>' +
      '<div class="vmp4title">' + H.esc(title) + '</div>' +
      '<video class="vmp4" src="' + url + '" controls autoplay playsinline preload="metadata"></video>' +
      '<div class="vctrl"><button class="vbtn" data-vopen>🔗 別タブで開く／保存</button><button class="vbtn vmain" data-vdone>閉じる</button></div></div>';
    document.body.appendChild(ov); document.body.style.overflow = "hidden";
    var close = function () { try { var v = ov.querySelector("video"); if (v) v.pause(); } catch (e) {} try { document.body.removeChild(ov); } catch (e2) {} document.body.style.overflow = ""; };
    ov.querySelector("[data-vclose]").onclick = close;
    ov.querySelector("[data-vdone]").onclick = close;
    ov.querySelector("[data-vopen]").onclick = function () { window.open(url, "_blank"); };
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
  };
  // 説明動画（自動再生スライド＋日本語ナレーション音声＋字幕）。slides: [{emoji,h,lines[],say?}]
  H.playSlides = function (title, slides) {
    slides = (slides || []).slice(); if (!slides.length) return;
    var i = 0, playing = true, muted = false, done = false, timer = null, utter = null;
    var sayOf = function (s) { return s.say || ((s.h || "") + "。" + (s.lines || []).join("。")); };
    var estMs = function (s) { return Math.max(3800, 2600 + sayOf(s).length * 75); };
    var ov = document.createElement("div"); ov.className = "vov on";
    ov.innerHTML = '<div class="vplayer"><button class="vclose" data-vclose>✕</button>' +
      '<div class="vstage"><div class="vemoji" data-vemoji></div><div class="vh" data-vh></div><ul class="vlines" data-vlines></ul></div>' +
      '<div class="vbar"><div class="vbarfill" data-vfill></div></div><div class="vmeta" data-vmeta></div>' +
      '<div class="vctrl"><button class="vbtn" data-vprev>⏮ 前</button><button class="vbtn vmain" data-vplay>⏸ 一時停止</button>' +
      '<button class="vbtn" data-vnext>次 ⏭</button><button class="vbtn" data-vmute>🔊 音声</button></div></div>';
    document.body.appendChild(ov); document.body.style.overflow = "hidden";
    var q = function (sel) { return ov.querySelector(sel); };
    function stopTts() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} utter = null; }
    function clearT() { if (timer) { clearTimeout(timer); timer = null; } }
    function close() { playing = false; clearT(); stopTts(); try { document.body.removeChild(ov); } catch (e) {} document.body.style.overflow = ""; }
    function setBtn() { q("[data-vplay]").textContent = done ? "↺ もう一度" : (playing ? "⏸ 一時停止" : "▶ 再生"); q("[data-vmute]").textContent = muted ? "🔇 音声OFF" : "🔊 音声ON"; }
    function speak(s) {
      if (muted || !window.speechSynthesis) return false;
      try {
        var u = new SpeechSynthesisUtterance(sayOf(s)); u.lang = "ja-JP"; u.rate = 1.03;
        try { var vs = window.speechSynthesis.getVoices() || [], jv = null; for (var k = 0; k < vs.length; k++) { if (/ja|japan/i.test(vs[k].lang) || /japan/i.test(vs[k].name)) { jv = vs[k]; break; } } if (jv) u.voice = jv; } catch (e2) {}
        u.onend = function () { if (playing && u === utter) next(); };
        utter = u; window.speechSynthesis.speak(u); return true;
      } catch (e) { return false; }
    }
    function play() {
      clearT(); stopTts();
      var s = slides[i];
      q("[data-vemoji]").textContent = s.emoji || "📘"; q("[data-vh]").innerHTML = s.h || "";
      q("[data-vlines]").innerHTML = (s.lines || []).map(function (l) { return "<li>" + l + "</li>"; }).join("");
      q("[data-vmeta]").textContent = (i + 1) + " / " + slides.length + "　｜　" + title;
      var f = q("[data-vfill]"), d = estMs(s);
      f.style.transition = "none"; f.style.width = "0%"; void f.offsetWidth;
      f.style.transition = "width " + d + "ms linear"; f.style.width = "100%";
      // 音声ナレーションの onend で次へ進む。音声が無い/終わらない環境でも進むよう安全タイマーも張る。
      if (playing) { var spoke = speak(s); timer = setTimeout(next, spoke ? d + 4000 : d); }
    }
    function next() { if (i < slides.length - 1) { i++; play(); } else { done = true; playing = false; clearT(); stopTts(); q("[data-vfill]").style.width = "100%"; setBtn(); } }
    function prev() { done = false; playing = true; if (i > 0) i--; setBtn(); play(); }
    function togglePlay() {
      if (done) { done = false; i = 0; playing = true; setBtn(); play(); return; }
      playing = !playing; setBtn();
      if (playing) play();
      else { clearT(); stopTts(); var f = q("[data-vfill]"), w = getComputedStyle(f).width; f.style.transition = "none"; f.style.width = w; }
    }
    q("[data-vclose]").onclick = close; q("[data-vplay]").onclick = togglePlay;
    q("[data-vnext]").onclick = function () { done = false; playing = true; setBtn(); next(); };
    q("[data-vprev]").onclick = prev;
    q("[data-vmute]").onclick = function () { muted = !muted; setBtn(); if (playing && !done) play(); };
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    setBtn(); play();
  };
  // 注意事項の説明動画（両アプリ共通）。法的な留意点をやさしく。
  H.notesSlides = function () {
    return [
      { emoji: "⚠️", h: "ご利用上の注意", lines: ["安心してお使いいただくための大切なポイントです。", "約1分でご説明します。"] },
      { emoji: "✍️", h: "電子サインについて", lines: ["このアプリの電子サインは、合意した内容と日時を記録する方式です。", "法律上の「認証された電子署名」とは異なります。"] },
      { emoji: "📄", h: "契約約款について", lines: ["添付の「工事下請基本契約約款」は簡易なひな型です。", "実際の運用前に、行政書士・弁護士などの専門家にご確認ください。"] },
      { emoji: "🗄️", h: "保存年数について", lines: ["完了した工事は目安として5年間保存を表示しています。", "法令で必要な保存年数は、案件や立場により異なる場合があります。"] },
      { emoji: "🔒", h: "個人情報の取り扱い", lines: ["業者名・連絡先などは大切に扱い、関係者以外に渡さないでください。", "招待リンクは相手ごとの専用リンクです。"] },
      { emoji: "🔍", h: "署名の前に必ず確認", lines: ["工事名・金額・工事日・支払いなど、内容をよく確認してから署名を。", "相違があれば署名せず、相手にご連絡ください。"] },
      { emoji: "🙏", h: "以上です", lines: ["ご不明点は❓ヘルプ、または取引先にご確認ください。"] }
    ];
  };

  H.copy = (text, okMsg) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => H.toast(okMsg || "コピーしました", "ok")).catch(() => H.toast("コピーできませんでした", "err"));
    } else { H.toast("この端末ではコピーできません", "err"); }
  };

  // ---- 電子契約（注文書／注文請書 方式・簡易版） ----
  // 工務店（発注者）が注文書を発行 → 協力業者（受注者）が確認して電子サイン（注文請書）で成立。
  H.yen = function (n) { return "¥" + (Number(n) || 0).toLocaleString("ja-JP"); };
  // taxMode: "incl"=入力した amount は税込 ／ それ以外（既定・旧データ互換）=税抜。
  H.exclOf = function (c) { var a = Number(c.amount) || 0, r = Number(c.taxRate) || 0; return (c.taxMode === "incl") ? Math.round(a / (1 + r / 100)) : a; };
  H.taxOf = function (c) { var a = Number(c.amount) || 0, r = Number(c.taxRate) || 0; return (c.taxMode === "incl") ? (a - Math.round(a / (1 + r / 100))) : Math.round(a * r / 100); };
  H.inclOf = function (c) { return (c.taxMode === "incl") ? (Number(c.amount) || 0) : ((Number(c.amount) || 0) + H.taxOf(c)); };
  // 成立＝両者署名（受注者の注文請書＋工務店の確定署名）。工務店の署名が「確定＝成立」の操作。
  // 完了＝成立後に工務店が「工事完了」にしたもの（completedAt）。完了から H.retentionYears 年 保存。
  H.contractStatus = function (c) {
    var f = c && c.fromSign && c.fromSign.at, t = c && c.toSign && c.toSign.at;
    if (c && c.completedAt) return { key: "completed", text: "完了", color: "#3730a3", bg: "#eef2ff" };
    if (f && t) return { key: "done", text: "成立", color: "#1a7a45", bg: "#eafaf0" };
    if (t) return { key: "wait", text: "工務店の確定待ち", color: "#8a5a00", bg: "#fff4e5" };
    if (f) return { key: "wait", text: "請書待ち", color: "#8a5a00", bg: "#fff4e5" };
    return { key: "draft", text: "下書き", color: "#5d6b7c", bg: "#eef1f4" };
  };
  // 完了案件の保存期限（完了日＋5年）。法令上の保存を意識した表示用。
  H.retentionYears = 5;
  H.retentionUntil = function (c) {
    if (!c || !c.completedAt) return null;
    var d = new Date(c.completedAt); d.setFullYear(d.getFullYear() + H.retentionYears); return d;
  };
  // 工事下請基本契約約款（建設業法第19条 各号に対応する簡易ひな型・会社設定で一部を調整可）
  H.contractTermsDefault = { defectYears: "2", court: "注文者の主たる営業所の所在地を管轄する地方裁判所" };
  H.yakkanHTML = function (terms) {
    terms = terms || {};
    var e = H.esc;
    var yrs = String(terms.defectYears || H.contractTermsDefault.defectYears);
    var court = terms.court || H.contractTermsDefault.court;
    var arts = [
      ["第1条（総則）", "本契約は請負契約とし、注文者及び受注者は、信義に従い誠実にこれを履行する。本工事は労働者派遣ではなく、受注者は自己の責任と裁量により施工し、その使用する労働者・職人に対する指揮命令、労務管理及び安全衛生管理を自ら行う。"],
      ["第2条（権利義務の譲渡等の制限）", "当事者は、相手方の書面による承諾を得なければ、本契約上の地位又は本契約から生じる権利義務を第三者に譲渡し、承継させ、又は担保に供してはならない。"],
      ["第3条（一括下請負の禁止）", "受注者は、建設業法第22条の定めに従い、本工事の全部又はその主たる部分を、一括して他人に請け負わせてはならない。"],
      ["第4条（支給材料・貸与機械）", "注文者が材料を支給し、又は建設機械その他の機械器具を貸与する場合の品目、数量、時期、場所、費用の負担及び返還方法は、注文書の記載又は別途両者の書面による合意による。（建設業法第19条第1項第10号）"],
      ["第5条（施工・第三者に対する損害）", "受注者は、関係法令及び工事の安全基準を遵守して施工する。工事の施工について第三者に損害を及ぼしたときは、その賠償は、責めに帰すべき事由のある当事者が負担する。（同項第9号）"],
      ["第6条（設計変更・工期の変更等）", "注文者が設計の変更、工事着手の延期又は工事の全部若しくは一部の中止を求めたときは、両者は協議のうえ、工期の変更、請負代金の額の変更又は損害の負担及びその額の算定方法を定める。（同項第6号）"],
      ["第7条（不可抗力）", "天災地変その他両者の責めに帰することができない事由により、工期の変更又は損害が生じたときは、両者は協議のうえ、その損害の負担及び額を定める。（同項第7号）"],
      ["第8条（物価の変動）", "工期内に賃金水準又は物価の著しい変動が生じ、請負代金の額が不適当となったときは、両者は協議のうえ、請負代金の額を変更することができる。（同項第8号）"],
      ["第9条（完成・検査・引渡し）", "受注者は、工事を完成したときは注文者に通知し、注文者は、注文書に定める時期及び方法（定めのないときは通知後遅滞なく）により検査を行う。検査に合格したときは、受注者は目的物を引き渡し、注文者はこれを受領する。（同項第11号）"],
      ["第10条（請負代金の支払）", "請負代金は、注文書に定める支払時期及び方法により支払う。前払金又は部分払（出来形払）の定めがあるときは、その定めによる。（同項第5号・第12号）"],
      ["第11条（契約不適合責任）", "引き渡された目的物が種類又は品質に関して契約の内容に適合しないときは、注文者は、引渡しの日から" + yrs + "年以内にその旨を通知することにより、受注者に対し、履行の追完（修補等）、代金の減額、損害の賠償又は契約の解除を請求することができる。（同項第13号）"],
      ["第12条（履行遅滞・遅延損害金）", "当事者がその債務の履行を遅滞したときは、遅延損害金その他これによって生じた損害の負担及びその額は、両者が協議のうえ定める。（同項第14号）"],
      ["第13条（契約の解除）", "当事者の一方が本契約に違反し、相手方が相当の期間を定めて催告してもその期間内に是正されないときは、相手方は本契約を解除することができる。"],
      ["第14条（法令の遵守等）", "両者は、建設業法、労働安全衛生法、社会保険及び労働保険に関する法令その他の関係法令を遵守する。"],
      ["第15条（紛争の解決・合意管轄）", "本契約に関して紛争が生じたときは、両者は誠実に協議して解決を図る。協議が調わないときは、" + court + "を第一審の専属的合意管轄裁判所とする。（同項第15号）"],
      ["第16条（定めのない事項）", "本契約及び本約款に定めのない事項は、建設業法その他の関係法令及び中央建設業審議会が定める標準下請契約約款の趣旨に従い、両者が協議して定める。（同項第16号）"]
    ];
    return '<div class="yakkan"><h2>工事下請基本契約約款</h2>' +
      arts.map(function (a) { return '<div class="art"><b>' + e(a[0]) + "</b>" + e(a[1]) + "</div>"; }).join("") + "</div>";
  };
  // 印刷/PDF用：注文書／注文請書（＋工事下請基本契約約款）のHTML文書を組み立てる
  H.contractDocHTML = function (c, koumutenName, terms) {
    var e = H.esc, tax = H.taxOf(c), amt = H.exclOf(c), incl = H.inclOf(c);
    var fromCo = (c.fromSign && c.fromSign.companyName) || koumutenName || "";
    var toCo = (c.toSign && c.toSign.companyName) || c.partnerName || "";
    var sig = function (role, s, coFallback) {
      return '<div class="sig"><div class="r">' + role + "</div>" +
        '<div class="l">会社名：<span>' + (s && s.companyName ? e(s.companyName) : (coFallback ? e(coFallback) : "")) + "</span></div>" +
        '<div class="l">担当者（電子署名）：<span>' + (s && s.name ? e(s.name) : "") + "</span></div>" +
        '<div class="d">' + (s && s.at ? "署名日：" + H.ymd(new Date(s.at)) : "署名日：　　　年　　月　　日") + "</div></div>";
    };
    var row = function (label, val) { return "<tr><th>" + e(label) + "</th><td>" + (val ? e(val) : "—") + "</td></tr>"; };
    var rowIf = function (label, val) { return val ? row(label, val) : ""; };
    var signed = !!(c.toSign && c.toSign.at);
    var docTitle = signed ? "注文書 兼 注文請書" : "注文書";
    return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>' + docTitle + '</title><style>' +
      'body{font-family:"Yu Gothic","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;color:#1b2430;margin:0;padding:24px;font-size:13px;line-height:1.7}' +
      '.doc{max-width:720px;margin:0 auto}h1{text-align:center;font-size:22px;letter-spacing:.3em;margin:0 0 4px}' +
      '.sub{text-align:center;color:#5d6b7c;font-size:12px;margin-bottom:18px}' +
      '.parties{display:flex;gap:14px;margin-bottom:14px}.party{flex:1;border:1px solid #cbd2da;border-radius:8px;padding:10px 12px}' +
      '.party .cap{font-size:11px;color:#5d6b7c}.party .nm{font-size:15px;font-weight:800;margin-top:2px}' +
      'table{width:100%;border-collapse:collapse;margin:6px 0 14px}th,td{border:1px solid #cbd2da;padding:8px 10px;text-align:left;vertical-align:top}' +
      'th{background:#f2f4f7;width:132px;font-weight:700}.amount b{font-size:20px;color:#111}' +
      '.sigs{display:flex;gap:14px;margin-top:18px}.sig{flex:1;border:1px solid #cbd2da;border-radius:8px;padding:12px}' +
      '.sig .r{font-weight:800;margin-bottom:8px}.sig .l{margin:6px 0}.sig .l span{border-bottom:1px solid #99a2ad;padding:0 4px;min-width:120px;display:inline-block}' +
      '.sig .d{color:#5d6b7c;font-size:12px;margin-top:6px}' +
      '.note{font-size:11px;color:#5d6b7c;line-height:1.7;margin-top:16px;border-top:1px solid #e4e8ee;padding-top:10px}' +
      '.yakkan{margin-top:22px;border-top:2px solid #cbd2da;padding-top:12px}.yakkan h2{font-size:15px;text-align:center;letter-spacing:.2em;margin:0 0 10px}' +
      '.yakkan .art{margin:6px 0;font-size:11px;line-height:1.65}.yakkan .art b{font-weight:800;margin-right:4px}' +
      '@media print{body{padding:0}.doc{max-width:none}.yakkan{page-break-before:always}}</style></head><body><div class="doc">' +
      "<h1>" + docTitle + "</h1>" +
      '<div class="sub">下記のとおり工事を注文します。受注者は内容を確認のうえ、注文請書として署名（電子サイン）してください。本注文書・注文請書は、末尾の「工事下請基本契約約款」と一体で本工事の請負契約を構成します。</div>' +
      '<div class="parties"><div class="party"><div class="cap">注文者（発注者・元請）</div><div class="nm">' + e(fromCo || "—") + "</div></div>" +
      '<div class="party"><div class="cap">請負者（受注者・協力業者）</div><div class="nm">' + e(toCo || "—") + "</div></div></div>" +
      "<table>" + row("工事名", c.title) + row("工事場所（住所）", c.site) + row("作業内容", c.content) +
      row("工事日程", H.fmtSchedule(c)) +
      '<tr><th>注文金額（請負代金）</th><td class="amount">税抜 ' + H.yen(amt) + "　＋　消費税 " + H.yen(tax) + "（" + (Number(c.taxRate) || 0) + "%）<br><b>税込 " + H.yen(incl) + "</b></td></tr>" +
      row("支払方法・時期", c.payTerm) + rowIf("前払金・部分払", c.advance) + row("検査・引渡し", c.handover) +
      rowIf("施工しない日・時間帯", c.nowork) + rowIf("備考", c.note) + "</table>" +
      '<div class="sigs">' + sig("注文者（発注者）", c.fromSign, fromCo) + sig("請負者（受注者）＝注文請書", c.toSign, toCo) + "</div>" +
      H.yakkanHTML(terms) +
      '<div class="note">・本注文書・注文請書及び末尾の「工事下請基本契約約款」は一体として本工事の請負契約を構成し、建設業法第19条第1項各号に掲げる事項を定めるものです。<br>' +
      "・本注文書に受注者が署名（注文請書）した時点で、本工事の請負契約が成立します。<br>" +
      "・本工事は請負契約であり、労働者派遣ではありません。受注者の職人への作業指示・労務管理は、受注者（協力業者）が行います。<br>" +
      "・電子署名は、双方の合意内容と署名日時を記録するものです（押印は不要です）。<br>" +
      "・本約款は、中央建設業審議会の標準下請契約約款等を参考にした簡易なひな型です。個別の取引や法改正への適合は、行政書士・弁護士等の専門家にご確認ください。<br>" +
      "・注文書・注文請書・約款は、注文者・受注者の双方で保管してください。</div></div></body></html>";
  };
  H.printContract = function (c, koumutenName, terms) {
    var w = window.open("", "_blank");
    if (!w) { H.toast("印刷ウィンドウを開けませんでした（ポップアップを許可してください）", "err"); return; }
    w.document.write(H.contractDocHTML(c, koumutenName, terms));
    w.document.close(); w.focus();
    setTimeout(function () { try { w.print(); } catch (_) {} }, 500);
  };

  // 書き込み失敗（Firebase権限エラー等）を必ず画面に表示する
  if (global.DB) {
    ["set", "update", "remove", "push"].forEach(function (m) {
      const orig = global.DB[m];
      if (typeof orig !== "function") return;
      global.DB[m] = function () {
        return orig.apply(global.DB, arguments).catch(function (e) {
          const msg = (e && e.message) || String(e);
          if (/permission|denied/i.test(msg)) H.toast("保存できませんでした：Firebaseのルールで拒否されました（READMEのルール設定を確認）", "err");
          else H.toast("保存できませんでした：" + msg, "err");
          throw e;
        });
      };
    });
    global.addEventListener("unhandledrejection", function (e) { e.preventDefault(); });
  }

  global.H = H;
})(window);
