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
    return { companies: { DEMO: {
      profile: { name: "（体験）山田工務店", createdAt: now },
      partners: {
        P1: { trade: "denki", name: "丸山電気工事", tel: "090-1111-2222", contact: "丸山", area: "市内全域", note: "急ぎ対応可。分電盤の増設が得意。", fav: true, createdAt: now - 5000 },
        P2: { trade: "daiku", name: "田中大工", tel: "080-3333-4444", contact: "田中", area: "", note: "", fav: false, createdAt: now - 4000 },
        P3: { trade: "tosou", name: "佐藤塗装", tel: "070-5555-6666", contact: "佐藤", area: "△△市周辺", note: "外壁塗装が得意", fav: false, createdAt: now - 3000 },
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
        C1: { partnerKey: "P2", partnerName: "田中大工", title: "△△マンション 改修 内装工事", site: "□□市 本町2-5", content: "内部造作・ボード張り一式（1〜2階）", amount: 350000, taxRate: 10, payTerm: "完成・引渡し後、翌月末支払い（銀行振込）", startDate: "来週 月曜", endDate: "再来週 金曜", handover: "完成後、注文者立会いで検査のうえ引渡し", supervisor: "", note: "", fromSign: { companyName: "（体験）山田工務店", name: "山田 太郎", at: now - 40000 }, toSign: null, createdAt: now - 45000, updatedAt: now - 40000 }
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
  H.showHelp = function (title, items) {
    var body = (items || []).map(function (it) {
      return '<details class="helpitem"><summary>' + H.esc(it.q) + '</summary><div class="helpa">' + it.a + "</div></details>";
    }).join("");
    var s = H._sheet("<h3>❓ " + H.esc(title) + "</h3>" + body + '<button class="btn full ghost" id="__closeHelp" style="margin-top:10px">閉じる</button>');
    s.ov.querySelector("#__closeHelp").onclick = s.close;
  };

  H.copy = (text, okMsg) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => H.toast(okMsg || "コピーしました", "ok")).catch(() => H.toast("コピーできませんでした", "err"));
    } else { H.toast("この端末ではコピーできません", "err"); }
  };

  // ---- 電子請負契約（簡易版） ----
  H.yen = function (n) { return "¥" + (Number(n) || 0).toLocaleString("ja-JP"); };
  H.taxOf = function (c) { return Math.round((Number(c.amount) || 0) * (Number(c.taxRate) || 0) / 100); };
  H.inclOf = function (c) { return (Number(c.amount) || 0) + H.taxOf(c); };
  H.contractStatus = function (c) {
    var f = c && c.fromSign && c.fromSign.at, t = c && c.toSign && c.toSign.at;
    if (f && t) return { key: "done", text: "締結済み", color: "#1a7a45", bg: "#eafaf0" };
    if (f || t) return { key: "wait", text: "署名待ち", color: "#8a5a00", bg: "#fff4e5" };
    return { key: "draft", text: "下書き", color: "#5d6b7c", bg: "#eef1f4" };
  };
  // 印刷/PDF用：工事請負契約書のHTML文書を組み立てる
  H.contractDocHTML = function (c, koumutenName) {
    var e = H.esc, tax = H.taxOf(c), amt = Number(c.amount) || 0, incl = amt + tax;
    var fromCo = (c.fromSign && c.fromSign.companyName) || koumutenName || "";
    var toCo = (c.toSign && c.toSign.companyName) || c.partnerName || "";
    var sig = function (role, s, coFallback) {
      return '<div class="sig"><div class="r">' + role + "</div>" +
        '<div class="l">会社名：<span>' + (s && s.companyName ? e(s.companyName) : (coFallback ? e(coFallback) : "")) + "</span></div>" +
        '<div class="l">担当者：<span>' + (s && s.name ? e(s.name) : "") + "</span>　㊞</div>" +
        '<div class="d">' + (s && s.at ? "署名日：" + H.ymd(new Date(s.at)) : "署名日：　　　年　　月　　日") + "</div></div>";
    };
    var row = function (label, val) { return "<tr><th>" + e(label) + "</th><td>" + (val ? e(val) : "—") + "</td></tr>"; };
    return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>工事請負契約書</title><style>' +
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
      '@media print{body{padding:0}.doc{max-width:none}}</style></head><body><div class="doc">' +
      "<h1>工事請負契約書</h1>" +
      '<div class="sub">下記の工事について、注文者（発注者）と請負者（受注者）が請負契約を締結します。</div>' +
      '<div class="parties"><div class="party"><div class="cap">注文者（発注者・元請）</div><div class="nm">' + e(fromCo || "—") + "</div></div>" +
      '<div class="party"><div class="cap">請負者（受注者・下請）</div><div class="nm">' + e(toCo || "—") + "</div></div></div>" +
      "<table>" + row("工事名", c.title) + row("工事場所", c.site) + row("工事内容", c.content) +
      '<tr><th>請負代金</th><td class="amount">税抜 ' + H.yen(amt) + "　＋　消費税 " + H.yen(tax) + "（" + (Number(c.taxRate) || 0) + "%）<br><b>税込 " + H.yen(incl) + "</b></td></tr>" +
      row("支払方法・時期", c.payTerm) + row("工期", ((c.startDate || "") + (c.endDate ? " 〜 " + c.endDate : "")).trim()) +
      row("検査・引渡し", c.handover) + row("作業指示者（受注者側）", c.supervisor) + row("備考", c.note) + "</table>" +
      '<div class="sigs">' + sig("注文者（発注者）", c.fromSign, fromCo) + sig("請負者（受注者）", c.toSign, toCo) + "</div>" +
      '<div class="note">・本工事は請負契約（業務委託）であり、労働者派遣ではありません。請負者の職人への作業指示・労務管理は、請負者（受注者）が行います。<br>' +
      "・本書面の電子署名は、双方の合意内容と日時を記録するものです。書面交付義務など法的要件の詳細は専門家にご確認ください。<br>" +
      "・本契約書は、注文者・請負者の双方で保管してください。</div></div></body></html>";
  };
  H.printContract = function (c, koumutenName) {
    var w = window.open("", "_blank");
    if (!w) { H.toast("印刷ウィンドウを開けませんでした（ポップアップを許可してください）", "err"); return; }
    w.document.write(H.contractDocHTML(c, koumutenName));
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
