// ===== 匠協コネクト Service Worker =====
// SW_VERSION: 2026-08-11b（このファイルを更新したら版を変える）
// 役割：ホーム画面アプリ化（PWA・管理/協力業者の両方）と、本体ファイルを常に最新で取得すること。

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

// 同一オリジンの本体ファイル（HTML/JS/CSS/JSON/manifest）は必ずネットワークから最新を取得。
// 古い版と新しい版の混在で「開けない」状態になるのを防ぐ（iOSのPWA対策）。
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;
  if (/\.(html|js|css|json|webmanifest)$/.test(url.pathname) || url.pathname === '/' || /\/$/.test(url.pathname)) {
    e.respondWith(
      fetch(req, { cache: 'reload' }).catch(function () {
        return fetch(req).catch(function () { return new Response('', { status: 504 }); });
      })
    );
  }
});
