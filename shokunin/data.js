// ===== 大工シェアアプリ 共通データ層 =====
// Firebase が設定されていれば Realtime Database を使い、未設定なら
// この端末内の localStorage で動く「お試しモード」に自動で切り替わります。
// どちらのモードでも同じ API（DB.on / push / update / remove / get）で使えます。

(function (global) {
  const CFG = global.SHOKUNIN_CONFIG || {};
  const ROOT = CFG.dbRoot || "shokunin";

  // 体験モード（URLに ?demo=1）：本番データに触れず、この端末内だけで動く。
  // データは24時間で自動リセット（=1日で消える体験用アプリ）。
  let DEMO = false;
  try { DEMO = /[?&]demo=1/.test(global.location.search || ""); } catch (_) {}

  const hasFirebase = !DEMO &&
    typeof firebase !== "undefined" &&
    CFG.firebase && CFG.firebase.apiKey && CFG.firebase.databaseURL;

  const DB = { mode: hasFirebase ? "firebase" : "local", root: ROOT, demo: DEMO };

  // ---------- 小物 ----------
  function deepGet(obj, path) {
    if (!path) return obj;
    return path.split("/").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function deepSet(obj, path, val) {
    const keys = path.split("/");
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (o[keys[i]] == null || typeof o[keys[i]] !== "object") o[keys[i]] = {};
      o = o[keys[i]];
    }
    if (val === null) delete o[keys[keys.length - 1]];
    else o[keys[keys.length - 1]] = val;
  }

  // =========================================================
  //  Firebase モード
  // =========================================================
  if (DB.mode === "firebase") {
    // 二重初期化（app/duplicate-app）でアプリ全体が落ちるのを防ぐ
    if (!(firebase.apps && firebase.apps.length)) { firebase.initializeApp(CFG.firebase); }
    const fdb = firebase.database();
    const ref = (p) => fdb.ref(ROOT + (p ? "/" + p : ""));

    // ---- 認証（会員制：メール/パスワードのみ。匿名サインインは廃止） ----
    // ・会員制のため匿名閲覧は不可。ログインした会員（members に登録）だけが中身を見られる（ルールで強制）。
    // ・アカウントは事務局が発行、または利用者が入会申請→事務局が承認（admin.html）。
    // ・Firebaseコンソールで「メール/パスワード」を有効化（「匿名」は無効でよい）。
    var fauth = firebase.auth ? firebase.auth() : null;
    // パスワード再設定メール・再設定画面などを日本語で表示する
    if (fauth) { try { fauth.languageCode = "ja"; } catch (_) {} }
    DB.auth = {
      user: null,
      _cbs: [],
      onChange: function (cb) { this._cbs.push(cb); cb(this.user); },
      _emit: function () { var u = this.user; this._cbs.forEach(function (c) { c(u); }); },
      signIn: function (email, pass) { return fauth.signInWithEmailAndPassword(email, pass); },
      signUp: function (email, pass) { return fauth.createUserWithEmailAndPassword(email, pass); },
      // パスワード再設定メールを送信（救済措置）
      resetPassword: function (email) { return fauth.sendPasswordResetEmail(email); },
      signOut: function () { return fauth.signOut(); }
    };
    DB.ready = new Promise(function (resolve) {
      if (!fauth) { resolve(); return; }
      var done = false; function finish() { if (!done) { done = true; resolve(); } }
      fauth.onAuthStateChanged(function (u) {
        DB.auth.user = u ? { uid: u.uid, email: u.email || null, isAnonymous: !!u.isAnonymous } : null;
        DB.auth._emit();
        finish(); // ログイン状態が判明したら（未ログイン=null でも）準備完了。門番はアプリ側で判定
      });
      setTimeout(finish, 4000); // 保険：認証応答が遅くても4秒で先へ進む
    });

    // すべての操作をサインイン完了後に実行する（最初の読み込みが権限拒否になるのを防ぐ）
    // errCb（省略可）：ルール権限拒否などで購読が失敗した際に呼ばれる。指定しないと
    // これまで通り黙って何も起きない＝呼び出し側が無反応（画面が固まる）ことがあるため、
    // 会員判定など重要な購読には必ず errCb を渡すこと。
    DB.on = (path, cb, errCb) => {
      let off = function () {}, active = true;
      DB.ready.then(function () {
        if (!active) return;
        const r = ref(path);
        const handler = r.on("value", (snap) => cb(snap.val()), (err) => { if (errCb) errCb(err); });
        off = function () { r.off("value", handler); };
      });
      return function () { active = false; off(); };
    };
    DB.get = (path) => DB.ready.then(() => ref(path).once("value")).then((s) => s.val());
    DB.push = (path, obj) => DB.ready.then(function () {
      const r = ref(path).push();
      return r.set(obj).then(() => r.key);
    });
    DB.set = (path, obj) => DB.ready.then(() => ref(path).set(obj));
    DB.update = (path, obj) => DB.ready.then(() => ref(path).update(obj));
    DB.remove = (path) => DB.ready.then(() => ref(path).remove());
    // ファイル（写真・PDF）：Storage不要。写真は圧縮してデータURLでメッセージに保存。
    DB.uploadChatFile = (folder, file) => H.prepareAttachment(file);
    return void (global.DB = DB);
  }

  // =========================================================
  //  お試しモード（localStorage、同端末の別タブとも同期）
  // =========================================================
  const LS_KEY = DEMO ? "shokunin_demo_db" : "shokunin_localdb";
  // 体験モードは24時間で自動リセット（データが1日で消える）
  if (DEMO) {
    try {
      const BORN_KEY = "shokunin_demo_born";
      const born = +(localStorage.getItem(BORN_KEY) || 0);
      if (!born) { localStorage.setItem(BORN_KEY, Date.now()); }
      else if (Date.now() - born > 24 * 3600 * 1000) {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem("shokunin_demouser");
        localStorage.setItem(BORN_KEY, Date.now());
      }
    } catch (_) {}
  }
  const listeners = []; // {path, cb}
  let store = {};
  try { store = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (_) {}

  let bc = null;
  try { bc = new BroadcastChannel(DEMO ? "shokunin_db_demo" : "shokunin_db"); } catch (_) {}

  function persist(broadcast) {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
    if (broadcast && bc) bc.postMessage("changed");
  }
  function genKey() {
    return "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function fire(path) {
    listeners.forEach((l) => {
      // そのパス自身、または親/子が変わったら通知（簡易）
      if (path === l.path || path.startsWith(l.path + "/") || l.path.startsWith(path)) {
        l.cb(clone(deepGet(store, l.path)));
      }
    });
  }
  function fireAll() {
    listeners.forEach((l) => l.cb(clone(deepGet(store, l.path))));
  }
  function clone(v) { return v == null ? null : JSON.parse(JSON.stringify(v)); }

  // 他タブからの変更を反映
  function reloadFromStorage() {
    try { store = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (_) {}
    fireAll();
  }
  if (bc) bc.onmessage = reloadFromStorage;
  global.addEventListener("storage", (e) => { if (e.key === LS_KEY) reloadFromStorage(); });

  DB.on = (path, cb) => {
    const l = { path, cb };
    listeners.push(l);
    cb(clone(deepGet(store, path))); // 初期値を即時通知
    return () => {
      const i = listeners.indexOf(l);
      if (i >= 0) listeners.splice(i, 1);
    };
  };
  DB.get = (path) => Promise.resolve(clone(deepGet(store, path)));
  DB.push = (path, obj) => {
    const key = genKey();
    deepSet(store, path + "/" + key, obj);
    persist(true); fire(path);
    return Promise.resolve(key);
  };
  DB.set = (path, obj) => {
    deepSet(store, path, obj);
    persist(true); fire(path);
    return Promise.resolve();
  };
  DB.update = (path, obj) => {
    Object.keys(obj).forEach((k) => deepSet(store, path + "/" + k, obj[k]));
    persist(true); fire(path);
    return Promise.resolve();
  };
  DB.remove = (path) => {
    deepSet(store, path, null);
    persist(true); fire(path);
    return Promise.resolve();
  };
  DB.ready = Promise.resolve();

  // お試しモードの認証シミュレーション（実際のFirebase認証は使わず、端末内で擬似ログイン）
  var DEMO_KEY = "shokunin_demouser";
  DB.auth = {
    user: (function () { try { return JSON.parse(localStorage.getItem(DEMO_KEY) || "null"); } catch (_) { return null; } })(),
    _cbs: [],
    onChange: function (cb) { this._cbs.push(cb); cb(this.user); },
    _emit: function () { var u = this.user; this._cbs.forEach(function (c) { c(u); }); },
    _login: function (email) {
      this.user = { uid: "local:" + email, email: email, isAnonymous: false };
      localStorage.setItem(DEMO_KEY, JSON.stringify(this.user)); this._emit();
      return Promise.resolve();
    },
    signIn: function (email) { return this._login(email); },
    signUp: function (email) { return this._login(email); },
    resetPassword: function () { return Promise.reject(new Error("お試しモードではパスワード再設定メールは送信できません（本番のみ）")); },
    signOut: function () { this.user = null; localStorage.removeItem(DEMO_KEY); this._emit(); return Promise.resolve(); }
  };

  // お試しモードで中身が空なら、サンプルデータを入れて操作感を確認しやすくする
  DB._seedIfEmpty = function (seed) {
    if (!store.companies && !store.craftsmen) {
      store = seed;
      persist(true);
      fireAll();
    }
  };

  // お試しモードも同じく圧縮データURLで送る
  DB.uploadChatFile = function (folder, file) { return H.prepareAttachment(file); };

  global.DB = DB;
})(window);
