// ===== 職人シェアアプリ 共通ヘルパー =====
(function (global) {
  const CFG = global.SHOKUNIN_CONFIG || {};
  const H = {};

  H.cfg = CFG;
  H.statuses = CFG.statuses || [
    { key: "free", label: "空き", color: "#1aa260" },
    { key: "partial", label: "一部空き", color: "#e0a200" },
    { key: "busy", label: "稼働中", color: "#c0392b" }
  ];
  H.workTypes = CFG.workTypes || [];
  H.qualifications = CFG.qualifications || [];

  H.statusOf = (key) => H.statuses.find((s) => s.key === key) || H.statuses[0];

  // 平均評価（sum / count）を 0〜5 で返す。未評価は null。
  H.avg = (sum, count) => (count > 0 ? Math.round((sum / count) * 10) / 10 : null);

  // 星表示（★☆）。value は 0〜5。
  H.stars = (value) => {
    if (value == null) return "<span class='nostar'>未評価</span>";
    const full = Math.round(value);
    let s = "";
    for (let i = 1; i <= 5; i++) s += i <= full ? "★" : "☆";
    return "<span class='stars'>" + s + "</span> <span class='starnum'>" + value.toFixed(1) + "</span>";
  };

  H.esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 配列（得意/NG/資格）をチップHTMLに
  H.chips = (arr, cls) =>
    (arr || []).map((x) => `<span class="chip ${cls || ""}">${H.esc(x)}</span>`).join("");

  H.fmtPrice = (price, unit) => {
    if (!price && price !== 0) return "—";
    const u = unit === "hour" ? "/時" : "/日";
    return "¥" + Number(price).toLocaleString() + u;
  };

  H.fmtDate = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // オブジェクト（Firebaseの連想配列）→ [{_key, ...}] 配列
  H.toArr = (obj) =>
    obj ? Object.keys(obj).map((k) => Object.assign({ _key: k }, obj[k])) : [];

  // トースト
  H.toast = (msg, type) => {
    let t = document.getElementById("__toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "__toast";
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = "toast show " + (type || "");
    clearTimeout(H._tt);
    H._tt = setTimeout(() => (t.className = "toast"), 2200);
  };

  // お試しモード用サンプルデータ
  H.seed = function () {
    const now = Date.now();
    return {
      companies: {
        C1: { name: "山田工務店", tel: "03-1111-2222", area: "東京都／23区西部", contact: "山田 太郎", ratingSum: 9, ratingCount: 2, notes: "支払いが早く対応も丁寧。", createdAt: now },
        C2: { name: "佐藤建設", tel: "045-333-4444", area: "神奈川県／横浜・川崎", contact: "佐藤 健", ratingSum: 4, ratingCount: 1, notes: "現場管理がしっかりしている。", createdAt: now },
        C3: { name: "鈴木住建", tel: "04-7555-6666", area: "千葉県／東葛エリア", contact: "鈴木 一郎", ratingSum: 0, ratingCount: 0, notes: "", createdAt: now }
      },
      craftsmen: {
        K1: { name: "田中 大工", companyKey: "C1", companyName: "山田工務店", age: 42, gender: "男", quals: ["二級建築士", "職長・安全衛生責任者"], good: ["大工", "内装"], ng: ["塗装"], price: 22000, unit: "day", status: "free", availMemo: "来週いっぱい空きあり", skillSum: 14, skillCount: 3, skillNotes: "造作が丁寧。納まりの相談に乗ってくれる。", createdAt: now, updatedAt: now },
        K2: { name: "高橋 塗装", companyKey: "C2", companyName: "佐藤建設", age: 35, gender: "男", quals: ["有機溶剤作業主任者"], good: ["塗装", "防水"], ng: ["電気"], price: 2500, unit: "hour", status: "partial", availMemo: "午前のみ対応可", skillSum: 9, skillCount: 2, skillNotes: "外壁塗装の仕上がりがきれい。", createdAt: now, updatedAt: now },
        K3: { name: "伊藤 電工", companyKey: "C1", companyName: "山田工務店", age: 29, gender: "男", quals: ["電気工事士(第二種)", "高所作業車"], good: ["電気"], ng: ["解体", "左官"], price: 24000, unit: "day", status: "busy", availMemo: "今月末まで埋まっています", skillSum: 5, skillCount: 1, skillNotes: "", createdAt: now, updatedAt: now },
        K4: { name: "渡辺 内装", companyKey: "C3", companyName: "鈴木住建", age: 51, gender: "男", quals: ["二級施工管理技士"], good: ["内装", "クロス", "タイル"], ng: [], price: 21000, unit: "day", status: "free", availMemo: "", skillSum: 0, skillCount: 0, skillNotes: "", createdAt: now, updatedAt: now }
      },
      reviews: {
        R1: { type: "craftsman", targetKey: "K1", targetName: "田中 大工", rating: 5, note: "納期もきっちり守ってくれた。", byCompany: "佐藤建設", at: now },
        R2: { type: "company", targetKey: "C1", targetName: "山田工務店", rating: 5, note: "段取りがよく助かった。", byCompany: "鈴木住建", at: now }
      }
    };
  };

  // 書き込み失敗（Firebaseの権限エラー等）を必ず画面に表示する。
  // これまでは .catch が無く、失敗してもメッセージが出ない「沈黙の失敗」だった。
  if (global.DB) {
    ["set", "update", "remove", "push"].forEach(function (m) {
      var orig = global.DB[m];
      if (typeof orig !== "function") return;
      global.DB[m] = function () {
        return orig.apply(global.DB, arguments).catch(function (e) {
          var msg = (e && e.message) || String(e);
          if (/permission|denied/i.test(msg)) {
            H.toast("保存できませんでした：Firebaseのルールで書き込みが拒否されています（READMEのルール設定を参照）", "err");
          } else {
            H.toast("保存できませんでした：" + msg, "err");
          }
          throw e; // 後続の「成功トースト」を実行させないために再スロー
        });
      };
    });
    // 上の .catch で通知済みの拒否は、未処理拒否の警告として再表示しない
    global.addEventListener("unhandledrejection", function (e) { e.preventDefault(); });
  }

  global.H = H;
})(window);
