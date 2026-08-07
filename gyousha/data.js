// ===== 匠協コネクト 共通データ層 =====
// Firebase が設定されていれば Realtime Database（匿名サインイン）を使い、未設定なら端末内の
// localStorage で動く「お試しモード」に自動切替。?demo=1 なら「体験版」（24時間で自動リセット）。
// どのモードでも同じ API（DB.on / get / push / set / update / remove）で使えます。

(function (global) {
  const CFG = global.GYOUSHA_CONFIG || {};
  const ROOT = CFG.dbRoot || "takyo";

  let DEMO = false;
  try { DEMO = /[?&]demo=1/.test(global.location.search || ""); } catch (_) {}

  const hasFirebase = !DEMO &&
    typeof firebase !== "undefined" &&
    CFG.firebase && CFG.firebase.apiKey && CFG.firebase.databaseURL;

  const DB = { mode: hasFirebase ? "firebase" : "local", root: ROOT, demo: DEMO };

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
  //  Firebase モード（匿名サインイン＋招待リンクのケイパビリティ方式）
  // =========================================================
  if (DB.mode === "firebase") {
    if (!(firebase.apps && firebase.apps.length)) { firebase.initializeApp(CFG.firebase); }
    const fdb = firebase.database();
    const ref = (p) => fdb.ref(ROOT + (p ? "/" + p : ""));
    const fauth = firebase.auth ? firebase.auth() : null;
    if (fauth) { try { fauth.languageCode = "ja"; } catch (_) {} }

    // 匿名サインイン完了を待ってから読み書きする（最初の読み込みが権限拒否になるのを防ぐ）。
    DB.ready = new Promise(function (resolve) {
      if (!fauth) { resolve(); return; }
      let done = false; const finish = () => { if (!done) { done = true; resolve(); } };
      fauth.onAuthStateChanged(function (u) {
        DB.uid = u ? u.uid : null;
        if (u) finish();
      });
      fauth.signInAnonymously().catch(function (e) {
        // 匿名が無効などで失敗しても、画面が固まらないよう先へ進む（書き込みは失敗しエラー表示される）
        DB.authError = (e && (e.code || e.message)) || String(e);
        finish();
      });
      setTimeout(finish, 5000);
    });

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
    DB.push = (path, obj) => DB.ready.then(function () { const r = ref(path).push(); return r.set(obj).then(() => r.key); });
    DB.set = (path, obj) => DB.ready.then(() => ref(path).set(obj));
    DB.update = (path, obj) => DB.ready.then(() => ref(path).update(obj));
    DB.remove = (path) => DB.ready.then(() => ref(path).remove());
    return void (global.DB = DB);
  }

  // =========================================================
  //  お試しモード／体験版（localStorage、同端末の別タブと同期）
  // =========================================================
  const LS_KEY = DEMO ? "takyo_demo_db" : "takyo_localdb";
  if (DEMO) {
    try {
      const BORN_KEY = "takyo_demo_born";
      const born = +(localStorage.getItem(BORN_KEY) || 0);
      if (!born) { localStorage.setItem(BORN_KEY, Date.now()); }
      else if (Date.now() - born > 24 * 3600 * 1000) {
        localStorage.removeItem(LS_KEY);
        localStorage.setItem(BORN_KEY, Date.now());
      }
    } catch (_) {}
  }

  const listeners = [];
  let store = {};
  try { store = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (_) {}

  let bc = null;
  try { bc = new BroadcastChannel(DEMO ? "takyo_db_demo" : "takyo_db"); } catch (_) {}

  function persist(broadcast) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (_) {}
    if (broadcast && bc) bc.postMessage("changed");
  }
  function genKey() { return "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clone(v) { return v == null ? null : JSON.parse(JSON.stringify(v)); }
  function fire(path) {
    listeners.forEach((l) => {
      if (path === l.path || path.startsWith(l.path + "/") || l.path.startsWith(path)) {
        l.cb(clone(deepGet(store, l.path)));
      }
    });
  }
  function fireAll() { listeners.forEach((l) => l.cb(clone(deepGet(store, l.path)))); }
  function reloadFromStorage() {
    try { store = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (_) {}
    fireAll();
  }
  if (bc) bc.onmessage = reloadFromStorage;
  global.addEventListener("storage", (e) => { if (e.key === LS_KEY) reloadFromStorage(); });

  DB.on = (path, cb) => {
    const l = { path, cb };
    listeners.push(l);
    cb(clone(deepGet(store, path)));
    return () => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); };
  };
  DB.get = (path) => Promise.resolve(clone(deepGet(store, path)));
  DB.push = (path, obj) => { const key = genKey(); deepSet(store, path + "/" + key, obj); persist(true); fire(path); return Promise.resolve(key); };
  DB.set = (path, obj) => { deepSet(store, path, obj); persist(true); fire(path); return Promise.resolve(); };
  DB.update = (path, obj) => { Object.keys(obj).forEach((k) => deepSet(store, path + "/" + k, obj[k])); persist(true); fire(path); return Promise.resolve(); };
  DB.remove = (path) => { deepSet(store, path, null); persist(true); fire(path); return Promise.resolve(); };
  DB.ready = Promise.resolve();
  DB.uid = "local";

  // 体験版などで中身が空なら初期データを入れる
  DB._seedIfEmpty = function (seed) {
    if (!store || !store.companies) { store = seed; persist(true); fireAll(); }
  };

  global.DB = DB;
})(window);
