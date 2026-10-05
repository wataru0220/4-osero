// ===== 栗駒見積帳 請求書・仕入見積の読み取り =====
// PDF（文字が埋め込まれていればそのまま読む。文字化けや画像だけのPDFは文字認識）／画像（文字認識）／CSV・テキスト。
// 文字認識は Tesseract.js（無料・ブラウザ内で処理。ファイルは外部に送らない。初回だけ日本語辞書を数MB読み込む）
(function (G) {
  "use strict";
  const CFG = G.MITSUMORI_CONFIG || {};

  // 日本語・英数字として読める文字の割合。低ければ文字化け（フォントの対応表がないPDF）とみなす
  function readable(text) {
    const t = String(text || "").replace(/\s/g, "");
    if (t.length < 20) return 0;
    const ok = (t.match(/[0-9A-Za-z぀-ヿ一-鿿！-ﾟ,.\-\/:()（）【】・¥￥円%＋+＊*#№]/g) || []).length;
    return ok / t.length;
  }

  let worker = null;
  async function ocrWorker(progress) {
    await Drawing.loadScript(CFG.libs.tesseract);
    if (!worker) worker = await G.Tesseract.createWorker("jpn", 1, { logger: (m) => progress && m.status === "recognizing text" && progress(m.progress) });
    return worker;
  }
  async function ocr(canvasOrUrl, progress) {
    const w = await ocrWorker(progress);
    const r = await w.recognize(canvasOrUrl);
    return r.data.text;
  }

  // ファイル → { text, method, pages }
  async function readFile(file, progress) {
    const say = (m) => progress && progress(m);
    if (/\.(csv|txt|tsv)$/i.test(file.name) || /^text\//.test(file.type)) {
      let t = await Drawing.readAs(file, "readAsText");
      if (/�/.test(t)) { // Shift_JIS の CSV
        const buf = await Drawing.readAs(file, "readAsArrayBuffer");
        t = new TextDecoder("shift_jis").decode(buf);
      }
      return { text: t.replace(/"([^"]*)"/g, (_, s) => s).replace(/[,\t]/g, " "), method: "CSV・テキスト" };
    }
    if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) {
      const data = await Drawing.readAs(file, "readAsArrayBuffer");
      const lib = (await Drawing.loadScript(CFG.libs.pdfjs), G.pdfjsLib);
      lib.GlobalWorkerOptions.workerSrc = CFG.libs.pdfjsWorker;
      const doc = await lib.getDocument(Drawing.pdfOpts(data.slice(0))).promise;
      const pages = Math.min(doc.numPages, 8);
      let text = "";
      for (let i = 1; i <= pages; i++) {
        const page = await doc.getPage(i), vp = page.getViewport({ scale: 1 }), tc = await page.getTextContent();
        text += Drawing.textFromItems(tc.items.map((it) => { const p = vp.convertToViewportPoint(it.transform[4], it.transform[5]); return { str: it.str, x: p[0], y: p[1] }; })) + "\n";
      }
      if (readable(text) > 0.75) return { text, method: "PDFの文字", pages };
      // 文字化け・スキャンPDF → ページを画像にして文字認識
      let out = "";
      for (let i = 1; i <= pages; i++) {
        say(`文字認識 ${i}/${pages}ページ…`);
        const page = await doc.getPage(i), vp1 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: Math.min(3, 2400 / Math.max(vp1.width, vp1.height)) });
        const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
        const c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
        await page.render({ canvasContext: c, viewport: vp, intent: "print" }).promise;
        out += (await ocr(cv, (p) => say(`文字認識 ${i}/${pages}ページ ${Math.round(p * 100)}%`))) + "\n";
      }
      return { text: out, method: "文字認識（PDF）", pages };
    }
    say("文字認識中…");
    const url = await Drawing.readAs(file, "readAsDataURL");
    return { text: await ocr(url, (p) => say(`文字認識 ${Math.round(p * 100)}%`)), method: "文字認識（画像）", pages: 1 };
  }

  G.Importer = { readFile, readable };
})(window);
