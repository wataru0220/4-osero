// ===== 匠協コネクト 設定ファイル =====
// 工務店（管理 admin.html）と 協力業者（利用者 index.html）の2画面構成。
// 工務店が自社の協力業者を管理し、作業依頼・一斉お知らせを送信。協力業者は招待リンクで開いて返信します。
//
// ・Firebase を設定すると、両者がリアルタイムに共有します（招待リンクで参加）。
// ・未設定なら「お試しモード（端末内保存）」で起動。URLに ?demo=1 を付けると「体験版」（24時間で自動リセット）。
//   （config.js の値はクライアントに公開される前提の識別子です。機密保護は Firebase のルールで担保します）

window.GYOUSHA_CONFIG = {
  appName: "匠協コネクト",
  // config.js / *.html / data.js / common.js / sw.js を更新したら版を上げる（?v= と揃える）
  appVersion: "2026-08-15c",

  // -------------------------------------------------------------------
  // Firebase Realtime Database（オセロ／勤怠／匠コネクトと同じプロジェクトを流用可）
  //   データは別パス "takyo/" に保存され、他アプリと混ざりません。
  //   ↓ apiKey が空なら自動で「お試しモード（端末内保存）」になります。
  //   協力業者はログイン不要（招待リンク＋匿名サインイン）。Firebaseで「匿名」を有効化してください。
  // -------------------------------------------------------------------
  firebase: {
    apiKey: "AIzaSyACeVUzUS_lBw6YL95w8JkkUCNwN1ST_Gs",
    authDomain: "osero-77308.firebaseapp.com",
    databaseURL: "https://osero-77308-default-rtdb.firebaseio.com",
    projectId: "osero-77308",
    storageBucket: "osero-77308.firebasestorage.app",
    messagingSenderId: "401249829167",
    appId: "1:401249829167:web:c2649df6ff67f35958a1da",
    measurementId: "G-VQPXQVRHDG"
  },

  // Firebase 内でこのアプリが使うルートパス（変更不要）
  dbRoot: "takyo",

  // 業種マスタ（表示順・色・アイコン）。「その他」は自由記述で業種名を入力します。
  trades: [
    { key: "daiku",   label: "個人事業主大工", icon: "🔨", color: "#92400e" },
    { key: "denki",   label: "電気工事",       icon: "⚡", color: "#d97706" },
    { key: "suido",   label: "水道設備",       icon: "🚿", color: "#0891b2" },
    { key: "tosou",   label: "塗装",           icon: "🎨", color: "#db2777" },
    { key: "naiso",   label: "内装",           icon: "🛋️", color: "#7c3aed" },
    { key: "sakan",   label: "左官",           icon: "🧱", color: "#78716c" },
    { key: "kawara",  label: "屋根瓦",         icon: "🏯", color: "#b91c1c" },
    { key: "bankin",  label: "屋根板金",       icon: "🔩", color: "#475569" },
    { key: "ashiba",  label: "足場",           icon: "🚧", color: "#ea580c" },
    { key: "gaikou",  label: "外構",           icon: "🌳", color: "#16a34a" },
    { key: "kiso",    label: "基礎",           icon: "🧊", color: "#0f766e" },
    { key: "gaiheki", label: "外壁",           icon: "🏠", color: "#4d7c0f" },
    { key: "bousui",  label: "防水",           icon: "💧", color: "#0284c7" },
    { key: "other",   label: "その他",         icon: "📌", color: "#64748b", free: true }
  ]
};
