// ===== 栗駒見積帳 設定ファイル =====
// 担当者（index.html）と 管理者（admin.html）の2画面構成。
// ・Firebase を設定すると、全担当者の見積・請求書・単価表を会社単位で共有します（会社リンク方式）。
// ・未設定なら「お試しモード（端末内保存）」。URLに ?demo=1 を付けると「体験版」（サンプル入り・24時間でリセット）。
//   （config.js の値はクライアントに公開される前提の識別子です。機密保護は Firebase のルールで担保します）

window.MITSUMORI_CONFIG = {
  appName: "栗駒見積帳",
  // 本体ファイルを更新したら版を上げる（?v= と sw.js を揃える）
  appVersion: "2026-10-05j",

  // Firebase Realtime Database（オセロ／勤怠／匠コネクトと同じプロジェクトを流用）。
  // データは別パス "mitsumori/" に保存。apiKey を空にすると端末内のお試しモードになります。
  firebase: {
    apiKey: "AIzaSyACeVUzUS_lBw6YL95w8JkkUCNwN1ST_Gs",
    authDomain: "osero-77308.firebaseapp.com",
    databaseURL: "https://osero-77308-default-rtdb.firebaseio.com",
    projectId: "osero-77308",
    storageBucket: "osero-77308.firebasestorage.app",
    messagingSenderId: "401249829167",
    appId: "1:401249829167:web:c2649df6ff67f35958a1da"
  },
  dbRoot: "mitsumori",

  // 外部ライブラリ（無料・ブラウザ内で動作。図面PDFの表示と、請求書の文字読み取り）
  libs: {
    pdfjs: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    pdfjsWorker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    pdfjsCmaps: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",           // 日本語フォントの対応表
    pdfjsFonts: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/",
    tesseract: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
  }
};
