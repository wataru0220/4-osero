// ===== 職人シェアアプリ 共通データ層 =====
// Firebase が設定されていれば Realtime Database を使い、未設定なら
// この端末内の localStorage で動く「お試しモード」に自動で切り替わります。
// どちらのモードでも同じ API（DB.on / push / update / remove / get）で使えます。

(function (global) {
  const CFG = global.SHOKUNIN_CONFIG || {};
  const ROOT = CFG.dbRoot || "shokunin";
  const hasFirebase =
    typeof firebase !== "undefined" &&
    CFG.firebase && CFG.firebase.apiKey && CFG.firebase.databaseURL;

  const DB = { mode: hasFirebase ? "firebase" : "local", root: ROOT };

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
    firebase.initializeApp(CFG.firebase);
    const fdb = firebase.database();
    const ref = (p) => fdb.ref(ROOT + (p ? "/" + p : ""));

    // 匿名サインイン。ルールで auth != null を要求する場合に必要（ログイン操作は不要）。
    // ・Firebaseコンソールで「Anonymous（匿名）」プロバイダを有効にしておくこと。
    // ・未有効でもここで握りつぶし、open ルールならそのまま動く（段階移行できる）。
    DB.ready = (firebase.auth
      ? firebase.auth().signInAnonymously().then(function () {}, function (e) {
          console.warn("匿名サインインに失敗しました（Anonymousプロバイダが未有効の可能性）:", e && e.message);
        })
      : Promise.resolve());

    // すべての操作をサインイン完了後に実行する（最初の読み込みが権限拒否になるのを防ぐ）
    DB.on = (path, cb) => {
      let off = function () {}, active = true;
      DB.ready.then(function () {
        if (!active) return;
        const r = ref(path);
        const handler = r.on("value", (snap) => cb(snap.val()));
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
    return void (global.DB = DB);
  }

  // =========================================================
  //  お試しモード（localStorage、同端末の別タブとも同期）
  // =========================================================
  const LS_KEY = "shokunin_localdb";
  const listeners = []; // {path, cb}
  let store = {};
  try { store = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (_) {}

  let bc = null;
  try { bc = new BroadcastChannel("shokunin_db"); } catch (_) {}

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

  // お試しモードで中身が空なら、サンプルデータを入れて操作感を確認しやすくする
  DB._seedIfEmpty = function (seed) {
    if (!store.companies && !store.craftsmen) {
      store = seed;
      persist(true);
      fireAll();
    }
  };

  global.DB = DB;
})(window);
