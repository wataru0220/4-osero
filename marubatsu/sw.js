// ===== 消える〇× Service Worker =====
// SW_VERSION: 2026-09-12a
// PWA「アプリにする（ホーム画面に追加）」を可能にし、オフラインでも CPU 戦が遊べるようにする。
// 方針：ネット優先（常に最新を取得）＋失敗時はキャッシュへ退避。
const CACHE = 'marubatsu-v1';
const SHELL = ['./', './index.html', './config.js', './manifest.json',
               './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL).catch(function () {}); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;   // Firebase など外部は素通し
  e.respondWith((async function () {
    try {
      const res = await fetch(req, { cache: 'no-store' });   // ネット優先＝常に最新
      const c = await caches.open(CACHE); c.put(req, res.clone());
      return res;
    } catch (_) {
      const cached = await caches.match(req);                // オフラインはキャッシュから
      return cached || caches.match('./index.html');
    }
  })());
});
