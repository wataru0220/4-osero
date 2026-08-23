// ===== 勤怠アプリ Service Worker =====
// SW_VERSION: 2026-08-23a
// 目的：PWAとして「アプリにする（インストール）」を可能にすること。
// アプリ本体（HTML/JS/CSS/JSON/manifest）は常にネットワークから最新を取得し、
// 古い版がキャッシュに残ってアプリが壊れるのを防ぐ（オフライン対応はしない）。

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return; // 外部(Firebase等)はそのまま
  if (/\.(html|js|css|json|webmanifest)$/.test(url.pathname) || url.pathname === '/' || /\/$/.test(url.pathname)) {
    e.respondWith(
      fetch(req, { cache: 'reload' }).catch(function () {
        return fetch(req).catch(function () { return new Response('', { status: 504 }); });
      })
    );
  }
});
