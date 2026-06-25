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
  // excludeEmail: 自己評価を除外するメール（対象のオーナーメール）。他人の評価のみ反映。
  // → { avg: 平均(0〜5)|null, count: 件数, notes: [...] 新しい順 }
  H.ratingFor = (reviewsObj, type, targetKey, excludeEmail) => {
    const arr = H.toArr(reviewsObj).filter((r) =>
      r.type === type && r.targetKey === targetKey &&
      !(excludeEmail && r.byEmail && r.byEmail === excludeEmail)
    );
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

  // 単価は日給のみ（常に「/日」）
  H.fmtPrice = (price) => {
    if (!price && price !== 0) return "—";
    return "¥" + Number(price).toLocaleString() + "/日";
  };

  // 空き予定（カレンダー avail）から、今日以降の「空き」日付を昇順で返す
  H.todayStr = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  H.upcomingFreeDates = (avail) => {
    const t = H.todayStr();
    return Object.keys(avail || {})
      .filter((d) => avail[d] === "free" && d >= t)
      .sort();
  };
  // "M/D" 表記
  H.mdFromYmd = (s) => { const p = String(s).split("-"); return (+p[1]) + "/" + (+p[2]); };

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

  // お試しモードの初期データ（サンプルの工務店・大工は入れない。実データのみで運用する）
  // ※以前はサンプル（山田/佐藤/鈴木）を投入していたが、実運用で「登録していない会社が出る」混乱の
  //   もとになるため廃止。お試しモードでも空の状態から自分で登録して確認できる。
  H.seed = function () {
    return { companies: {}, craftsmen: {}, reviews: {}, approvals: { craftsman: {} } };
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
