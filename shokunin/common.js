// ===== 大工シェアアプリ 共通ヘルパー =====
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

  // 評価は reviews コレクションから都度算出する（集計値はレコードに持たない）。
  // type: "craftsman" | "company", targetKey: 対象のキー
  // → { avg: 平均(0〜5)|null, count: 件数, notes: [{rating, note, by, at}...] 新しい順 }
  H.ratingFor = (reviewsObj, type, targetKey) => {
    const arr = H.toArr(reviewsObj).filter((r) => r.type === type && r.targetKey === targetKey);
    const count = arr.length;
    const sum = arr.reduce((a, r) => a + (Number(r.rating) || 0), 0);
    const notes = arr
      .filter((r) => r.note)
      .sort((a, b) => (b.at || 0) - (a.at || 0))
      .map((r) => ({ rating: r.rating, note: r.note, by: r.byCompany || "", at: r.at }));
    return { avg: H.avg(sum, count), count, notes };
  };

  // Firebase認証エラーを分かりやすい日本語に変換
  H.authErrMsg = (e) => {
    const m = (e && (e.code || e.message)) ? (e.code || e.message) : String(e);
    if (/operation-not-allowed/.test(m)) return "メール/パスワード認証が有効化されていません。Firebaseコンソール → Authentication → ログイン方法 で「メール/パスワード」を有効にしてください。";
    if (/configuration-not-found/.test(m)) return "認証が設定されていません。Firebaseコンソールで「メール/パスワード」と「匿名」を有効にしてください。";
    if (/email-already-in-use/.test(m)) return "このメールは登録済みです。「ログイン」を押してください。";
    if (/invalid-email/.test(m)) return "メールアドレスの形式が正しくありません。";
    if (/(weak-password|password.*6)/i.test(m)) return "パスワードは6文字以上にしてください。";
    if (/(wrong-password|invalid-credential|invalid-login)/.test(m)) return "メールまたはパスワードが違います。";
    if (/user-not-found/.test(m)) return "そのメールのアカウントがありません。「新規登録」を押してください。";
    if (/too-many-requests/.test(m)) return "試行回数が多すぎます。しばらく待ってからお試しください。";
    if (/network-request-failed/.test(m)) return "通信エラーです。ネット接続を確認してください。";
    if (/permission|denied/i.test(m)) return "保存が拒否されました。Firebaseのセキュリティルール設定を確認してください（READMEのルールを参照）。";
    return m;
  };

  // 大工が管理者に認証済みか（認証情報は管理者だけが書ける approvals パスに保存）
  H.isApproved = (approvals, kid) =>
    !!(approvals && approvals.craftsman && approvals.craftsman[kid] === true);

  // この利用者が対象の工務店を編集できるか（自社のオーナー or 管理者）
  H.isAdmin = (user) =>
    !!(user && user.email && (CFG.adminEmails || []).indexOf(user.email) >= 0);
  H.ownsCompany = (user, company) =>
    !!(user && user.email && company && company.ownerEmail === user.email);
  H.canEditCompany = (user, company) => H.isAdmin(user) || H.ownsCompany(user, company);

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
        C1: { name: "山田工務店", tel: "022-111-2222", area: "宮城県／仙台市", contact: "山田 太郎", ownerEmail: "yamada@example.com", notes: "支払いが早く対応も丁寧。", createdAt: now },
        C2: { name: "佐藤建設", tel: "024-333-4444", area: "福島県／郡山市", contact: "佐藤 健", ownerEmail: "sato@example.com", notes: "現場管理がしっかりしている。", createdAt: now },
        C3: { name: "鈴木住建", tel: "019-555-6666", area: "岩手県／盛岡市", contact: "鈴木 一郎", ownerEmail: "suzuki@example.com", notes: "", createdAt: now }
      },
      craftsmen: {
        K1: { name: "田中 一郎", companyKey: "C1", companyName: "山田工務店", age: 42, gender: "男", quals: ["建築大工技能士(1級)", "職長・安全衛生責任者"], good: ["①和室内部造作", "④建方、構造組立", "⑤構造体墨付け"], ng: [], price: 24000, unit: "day", status: "free", availMemo: "来週いっぱい空きあり", createdAt: now, updatedAt: now },
        K2: { name: "高橋 修", companyKey: "C2", companyName: "佐藤建設", age: 35, gender: "男", quals: ["建築大工技能士(2級)", "丸のこ等取扱作業従事者"], good: ["⑥ボード張り", "⑦フローリング施工"], ng: ["④建方、構造組立"], price: 22000, unit: "day", status: "partial", availMemo: "午前のみ対応可", createdAt: now, updatedAt: now },
        K3: { name: "伊藤 健", companyKey: "C1", companyName: "山田工務店", age: 29, gender: "男", quals: ["玉掛け", "足場の組立て等作業主任者"], good: ["④建方、構造組立", "⑤構造体墨付け"], ng: ["①和室内部造作"], price: 23000, unit: "day", status: "busy", availMemo: "今月末まで埋まっています", createdAt: now, updatedAt: now },
        K4: { name: "渡辺 大輔", companyKey: "C3", companyName: "鈴木住建", age: 51, gender: "男", quals: ["二級建築施工管理技士"], good: ["②洋室内部造作", "③階段造作", "⑧高気密、高断熱施工"], ng: [], price: 21000, unit: "day", status: "free", availMemo: "", createdAt: now, updatedAt: now }
      },
      reviews: {
        R1: { type: "craftsman", targetKey: "K1", targetName: "田中 一郎", rating: 5, note: "造作が丁寧。納まりの相談に乗ってくれる。", byCompany: "佐藤建設", at: now - 200000 },
        R2: { type: "craftsman", targetKey: "K1", targetName: "田中 一郎", rating: 4, note: "建て方が早く、墨出しも正確。", byCompany: "鈴木住建", at: now - 100000 },
        R3: { type: "craftsman", targetKey: "K2", targetName: "高橋 修", rating: 5, note: "ボード貼り・床張りの仕上がりがきれい。", byCompany: "山田工務店", at: now - 50000 },
        R4: { type: "company", targetKey: "C1", targetName: "山田工務店", rating: 5, note: "段取りがよく助かった。", byCompany: "鈴木住建", at: now - 80000 },
        R5: { type: "company", targetKey: "C2", targetName: "佐藤建設", rating: 4, note: "現場管理がしっかりしている。", byCompany: "山田工務店", at: now - 30000 }
      },
      // 管理者の認証状況（K1〜K3は認証済み、K4は認証待ちの例）
      approvals: { craftsman: { K1: true, K2: true, K3: true } }
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
