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
  H.copy = (text, okMsg) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => H.toast(okMsg || "コピーしました", "ok")).catch(() => H.toast("コピーできませんでした", "err"));
    } else { H.toast("この端末ではコピーできません", "err"); }
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
