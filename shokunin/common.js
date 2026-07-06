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

  // 添付ファイル等のURLを src/href 属性に埋め込む前の安全化。
  // ・許可スキームのみ通す：http(s) と、正規の添付が生成する data:image/… data:application/…
  // ・javascript: や data:text/html など、クリックや読み込みでスクリプト実行につながるものは
  //   空文字にして無効化する（=リンク切れになるだけで安全）。
  // ・通した値も属性値としてエスケープする。
  // 注意：チャットの fileUrl は取引相手や工務店クライアントが Firebase に直接書ける値のため、
  //   アプリ経由の生成値だけとは限らない（保存型XSS対策として必ずこれを通すこと）。
  H.safeUrl = function (u) {
    u = String(u == null ? "" : u).trim();
    if (/^https?:\/\//i.test(u)) return H.esc(u);
    if (/^data:(image\/|application\/(pdf|octet-stream|zip|msword|vnd\.))/i.test(u)) return H.esc(u);
    return "";
  };

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

  // 単価は日給のみ（常に「/日」）。金額はすべて税込表示に統一する。
  H.fmtPrice = (price) => {
    if (!price && price !== 0) return "—";
    return "¥" + Number(price).toLocaleString() + "/日（税込）";
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

  // 生年月日(YYYY-MM-DD)から現在の満年齢を計算（自動更新）。不正なら null。
  H.ageFromBirth = (b) => {
    if (!b) return null;
    const p = String(b).split("-"); if (p.length < 3) return null;
    const by = +p[0], bm = +p[1], bd = +p[2];
    if (!by || !bm || !bd) return null;
    const n = new Date();
    let a = n.getFullYear() - by;
    if (n.getMonth() + 1 < bm || (n.getMonth() + 1 === bm && n.getDate() < bd)) a--;
    return (a >= 0 && a < 130) ? a : null;
  };
  // 大工の表示年齢（生年月日があれば自動計算、なければ従来のage）
  H.craftAge = (k) => (k && k.birth) ? H.ageFromBirth(k.birth) : (k && k.age) || null;

  // メッセージ本文をエスケープしつつ、URL（http(s)://… や www.…）だけをリンク化する。
  // 先に全文をエスケープ相当の処理にし、URL部分のみ <a> で包む（XSS安全。javascript: 等はマッチしない）。
  H.linkify = function (raw) {
    raw = String(raw == null ? "" : raw);
    var re = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
    var out = "", last = 0, m;
    while ((m = re.exec(raw))) {
      out += H.esc(raw.slice(last, m.index));
      var url = m[0], trail = "";
      var tm = url.match(/[)\]\.,。、！？!?）」]+$/); // 末尾の句読点・閉じ括弧は除外
      if (tm) { trail = tm[0]; url = url.slice(0, url.length - trail.length); }
      var href = /^www\./i.test(url) ? "https://" + url : url;
      out += '<a href="' + H.esc(href) + '" target="_blank" rel="noopener" class="chatlink">' + H.esc(url) + "</a>" + H.esc(trail);
      last = m.index + m[0].length;
    }
    out += H.esc(raw.slice(last));
    return out;
  };

  H.fmtDate = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // 添付ファイルを送信用に変換する（Storage不要）。
  // 写真は自動で縮小・圧縮してデータURLにする（DBに直接保存できる軽さに）。
  // 画像以外（PDF等）は小さいものだけデータURLで送る（大きいものはStorageが必要）。
  H.prepareAttachment = function (file) {
    return new Promise(function (resolve, reject) {
      var isImg = (file.type || "").indexOf("image") === 0;
      if (isImg) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          var max = 1200, w = img.width, h = img.height;
          if (w > max || h > max) { if (w >= h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
          var c = document.createElement("canvas"); c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          try { URL.revokeObjectURL(url); } catch (_) {}
          var data = c.toDataURL("image/jpeg", 0.6);
          resolve({ url: data, name: file.name || "photo.jpg", type: "image/jpeg", size: data.length });
        };
        img.onerror = function () { try { URL.revokeObjectURL(url); } catch (_) {} reject(new Error("画像を読み込めませんでした")); };
        img.src = url;
      } else {
        if (file.size > 800 * 1024) { reject(new Error("このPDF/ファイルは大きすぎます（写真は送れます。大きなPDFはStorage設定が必要です）")); return; }
        var fr = new FileReader();
        fr.onload = function () { resolve({ url: fr.result, name: file.name || "file", type: file.type || "", size: file.size }); };
        fr.onerror = function () { reject(new Error("ファイルを読み込めませんでした")); };
        fr.readAsDataURL(file);
      }
    });
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

  // 体験モード（?demo=1）用のサンプルデータ。実データとは完全に分離され、24時間で自動リセットされる。
  // 仮想の工務店10社＋大工30名、あなたの会社（DCYOU）、PCからの受信依頼を用意。PCが相手役として自動応答する。
  H.demoSeed = function () {
    const now = Date.now();
    const _d = new Date();
    const ymd = (n) => { const d = new Date(_d); d.setDate(d.getDate() + n); const p = (x) => String(x).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };
    const md = (n) => { const d = new Date(_d); d.setDate(d.getDate() + n); return (d.getMonth() + 1) + "/" + d.getDate(); };

    const coNames = ["青葉建築", "みちのく工務店", "伊達住建", "蔵王ハウジング", "北上川ホーム", "杜の都工務店", "南部大工社", "最上川建設", "会津匠の家", "八戸海風建築"];
    const coArea = ["宮城県／仙台市", "岩手県／盛岡市", "宮城県／石巻市", "山形県／山形市", "岩手県／北上市", "宮城県／仙台市", "青森県／青森市", "山形県／新庄市", "福島県／会津若松市", "青森県／八戸市"];
    const coContact = ["青木 誠", "南 健一", "伊達 政人", "蔵田 修", "北川 剛", "杜野 亮", "南部 昭", "最上 徹", "会田 匠", "八戸 海斗"];
    const coTel = ["022-201-1010", "019-202-2020", "0225-30-3030", "023-40-4040", "0197-50-5050", "022-60-6060", "017-70-7070", "0233-80-8080", "0242-90-9090", "0178-10-1100"];
    const craftName = ["佐々木 大輔", "高橋 亮", "鈴木 健太", "伊藤 翔太", "渡辺 淳", "山本 誠", "中村 拓也", "小林 悟", "加藤 隆", "吉田 学", "山田 直樹", "松本 洋平", "井上 剛", "木村 圭", "林 秀樹", "清水 昭", "山口 力", "森 大地", "池田 稔", "橋本 亮介", "阿部 慎一", "石川 徹", "前田 智也", "藤田 康", "後藤 誠治", "岡田 徹平", "長谷川 悠", "村上 健", "近藤 光", "遠藤 竜也"];
    const skills = ["①和室内部造作", "②洋室内部造作", "③階段造作", "④建方、構造組立", "⑤構造体墨付け", "⑥ボード張り", "⑦フローリング施工", "⑧高気密、高断熱施工"];
    const quals = ["建築大工技能士(1級)", "建築大工技能士(2級)", "二級建築士", "職長・安全衛生責任者", "玉掛け", "足場の組立て等作業主任者"];
    const availSets = [[2, 3, 9], [1, 5, 12], [4, 8, 15], [6, 11, 18], [3, 7, 20], [2, 9, 16]];

    const companies = {}, craftsmen = {}, reviews = {}, approvals = { craftsman: {} }, requests = {}, reqIndex = {}, deals = {};

    for (let i = 0; i < 10; i++) {
      const ck = "DC" + (i + 1);
      companies[ck] = { name: coNames[i], nameKana: "", tel: coTel[i], area: coArea[i], contact: coContact[i], ownerEmail: "pc" + (i + 1) + "@demo.jp", notes: "", createdAt: now - i * 100000 };
      for (let j = 0; j < 3; j++) {
        const gi = i * 3 + j;
        const kid = "DK" + (gi + 1);
        const avail = {}; availSets[gi % availSets.length].forEach((o) => { avail[ymd(o)] = "free"; });
        craftsmen[kid] = {
          name: craftName[gi], companyKey: ck, companyName: coNames[i],
          age: 28 + (gi % 22), gender: "男", quals: [quals[gi % quals.length]],
          good: [skills[gi % 8], skills[(gi + 3) % 8]], ng: [], price: 18000 + ((gi * 1000) % 11000),
          unit: "day", avail: avail, availMemo: (j === 0 ? "来週に空きあり" : ""), createdAt: now, updatedAt: now
        };
        approvals.craftsman[kid] = true;
        if (gi % 3 === 0) reviews["DRV" + kid] = { type: "craftsman", targetKey: kid, targetName: craftName[gi], rating: 4 + (gi % 2), byCompany: "（体験）あなたの工務店", byUid: "demo:you", at: now - gi * 60000 };
      }
      if (i % 4 === 0) reviews["DRC" + ck] = { type: "company", targetKey: ck, targetName: coNames[i], rating: 4 + ((i / 4) % 2 ? 1 : 0), byCompany: "（体験）あなたの工務店", byUid: "demo:you", at: now - i * 40000 };
    }

    // あなたの会社（ログイン不要で自動的にこの会社として操作する）＋自社大工2名
    companies["DCYOU"] = { name: "（体験）あなたの工務店", nameKana: "あなたのこうむてん", tel: "022-000-0000", area: "宮城県／仙台市", contact: "体験 太郎", ownerEmail: "you@demo.jp", notes: "これはあなたの会社です。自由に操作してください。", termsAgreed: "demo", termsAgreedAt: now, createdAt: now };
    craftsmen["DKY1"] = { name: "自社 一郎", companyKey: "DCYOU", companyName: "（体験）あなたの工務店", age: 38, gender: "男", quals: ["建築大工技能士(1級)"], good: ["①和室内部造作", "③階段造作"], ng: [], price: 23000, unit: "day", avail: { [ymd(2)]: "free", [ymd(3)]: "free", [ymd(6)]: "free" }, availMemo: "", createdAt: now, updatedAt: now };
    craftsmen["DKY2"] = { name: "自社 次郎", companyKey: "DCYOU", companyName: "（体験）あなたの工務店", age: 29, gender: "男", quals: ["建築大工技能士(2級)"], good: ["⑥ボード張り"], ng: [], price: 20000, unit: "day", avail: { [ymd(4)]: "free", [ymd(5)]: "free" }, availMemo: "", createdAt: now, updatedAt: now };
    approvals.craftsman["DKY1"] = true; approvals.craftsman["DKY2"] = true;

    // PC（DC1）→ あなたの大工DKY1 への応援要請（受信・承認待ち）。承認して条件のやり取りを体験できる。
    const rid = "DEMOIN1";
    requests[rid] = {
      fromCompanyKey: "DC1", fromCompanyName: coNames[0], fromEmail: "pc1@demo.jp",
      toCompanyKey: "DCYOU", toCompanyName: "（体験）あなたの工務店", toOwnerEmail: "you@demo.jp",
      craftsmanKey: "DKY1", craftsmanName: "自社 一郎", status: "pending",
      site: "宮城県仙台市青葉区", sitePref: "宮城県", siteCity: "仙台市", siteWard: "青葉区",
      dates: [ymd(3)], dateFrom: ymd(3), dateTo: ymd(3), dateText: md(3),
      work: "内装造作の応援", parking: "依頼元（借りる側）が負担", lodging: "なし", transport: "実費精算", toll: "依頼元（借りる側）が負担",
      contact: "090-0000-1111", message: "急ぎで恐縮ですが、内装造作の応援をお願いできないでしょうか。",
      createdAt: now - 200000, lastMsgAt: now - 190000, lastMsgByUid: "demo:DC1"
    };
    reqIndex["DCYOU"] = { [rid]: true }; reqIndex["DC1"] = { [rid]: true };
    deals[rid] = { M1: { byUid: "demo:DC1", byName: coNames[0], text: "はじめまして。" + coNames[0] + "です。内装造作の応援をお願いできればと思いご連絡しました。ご検討よろしくお願いします。", at: now - 190000 } };

    return { companies, craftsmen, reviews, approvals, requests, reqIndex, deals };
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
