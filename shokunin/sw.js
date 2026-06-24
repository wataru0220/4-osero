// ===== 大工シェア Service Worker =====
// 段階導入（フェーズ1）：通知の表示とクリック時のアプリ前面化を担当します。
// （フェーズ2）アプリを閉じている間も届く FCM のバックグラウンド受信は、
//   下部の「FCM背景受信」ブロックのコメントを有効化＋Cloud Functions の導入で対応します。

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

// 通知をクリックしたらアプリを前面に（既存タブがあれば再利用、なければ開く）
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if ('focus' in c) { try { c.navigate && c.navigate(url); } catch (_) {} return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// ===== （フェーズ2）FCM 背景受信 =====
// アプリを完全に閉じている間も通知を出すには、以下を有効化し、
// config.js に fcmVapidKey を設定、Cloud Functions から送信してください（README参照）。
//
// importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
// importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
// firebase.initializeApp({ /* config.js の firebase と同じ値 */ });
// var messaging = firebase.messaging();
// messaging.onBackgroundMessage(function (payload) {
//   var n = (payload && payload.notification) || {};
//   self.registration.showNotification(n.title || '大工シェア', {
//     body: n.body || '', icon: 'icon-192.png', badge: 'icon-192.png',
//     data: { url: './index.html' }
//   });
// });
