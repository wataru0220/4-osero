// ===== 栗駒見積帳 図面（現況図・完成図）の取り込みとトレース =====
// ・画像（PNG/JPG）と PDF をドロップで読み込み。PDF は文字から縮尺「S=1/100」と部屋の帖数を自動で読む
// ・現況図と完成図を自動で位置合わせし、変わった所（撤去＝赤／新設＝青）を自動で色付け
// ・部屋（面積・周長）、壁（長さ）、建具・設備（個数）をクリックでなぞる → core.js の measure で数量化
(function (G) {
  "use strict";
  const CFG = G.MITSUMORI_CONFIG || {};
  const MAX_PX = 2400;

  // ---------- 外部ライブラリの遅延読み込み ----------
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) loaded[src] = new Promise((ok, ng) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ng(new Error("読み込めません: " + src)); document.head.appendChild(s); });
    return loaded[src];
  }
  async function pdfjs() {
    await loadScript(CFG.libs.pdfjs);
    G.pdfjsLib.GlobalWorkerOptions.workerSrc = CFG.libs.pdfjsWorker;
    return G.pdfjsLib;
  }
  // 日本語PDF（CIDフォント）を正しく描くには CMap が要る
  function pdfOpts(data) { return { data, cMapUrl: CFG.libs.pdfjsCmaps, cMapPacked: true, standardFontDataUrl: CFG.libs.pdfjsFonts }; }
  function readAs(file, how) { return new Promise((ok, ng) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ng; r[how](file); }); }
  function loadImg(src) { return new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = src; }); }

  // PDF の1ページを canvas に描き、文字（位置つき）も取り出す
  async function renderPdfPage(data, pageNo, maxPx) {
    const lib = await pdfjs();
    const doc = await lib.getDocument(pdfOpts(data)).promise;
    const page = await doc.getPage(Math.min(pageNo || 1, doc.numPages));
    const vp1 = page.getViewport({ scale: 1 });
    const z = Math.min((maxPx || MAX_PX) / Math.max(vp1.width, vp1.height), 4);
    const vp = page.getViewport({ scale: z });
    const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp, intent: "print" }).promise; // print＝画面が隠れていても止まらない
    const tc = await page.getTextContent();
    const items = tc.items.map((it) => { const p = vp.convertToViewportPoint(it.transform[4], it.transform[5]); return { str: it.str, x: p[0], y: p[1] }; });
    return { canvas: cv, items, text: textFromItems(items), z, pages: doc.numPages };
  }
  // 位置つき文字 → 行ごとのテキスト（y が近いものを1行に）
  function textFromItems(items) {
    const its = items.filter((i) => i.str && i.str.trim()).slice().sort((a, b) => a.y - b.y || a.x - b.x);
    const rows = [];
    its.forEach((it) => { const r = rows.find((r) => Math.abs(r.y - it.y) < 4); if (r) r.items.push(it); else rows.push({ y: it.y, items: [it] }); });
    return rows.map((r) => r.items.sort((a, b) => a.x - b.x).map((i) => i.str).join(" ")).join("\n");
  }

  // ファイル → { dataUrl, w, h, ppm, scaleDen, rooms(推定), text }
  async function importDrawing(file, pageNo) {
    const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
    if (isPdf) {
      const r = await renderPdfPage(await readAs(file, "readAsArrayBuffer"), pageNo);
      const den = MQ.detectScale(r.text);
      // PDF は用紙寸法が分かるので、縮尺さえ読めれば px/mm が決まる（1pt＝25.4/72mm）
      const ppm = den ? (r.z * 72 / 25.4) / den : 0;
      const rooms = MQ.detectRooms(r.items);
      return { dataUrl: r.canvas.toDataURL("image/jpeg", 0.82), w: r.canvas.width, h: r.canvas.height, ppm, scaleDen: den, rooms, pages: r.pages, text: r.text, paperPpm: r.z * 72 / 25.4 };
    }
    const img = await loadImg(await readAs(file, "readAsDataURL"));
    const k = Math.min(1, MAX_PX / Math.max(img.width, img.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return { dataUrl: cv.toDataURL("image/jpeg", 0.82), w: cv.width, h: cv.height, ppm: 0, scaleDen: 0, rooms: [], pages: 1, text: "" };
  }

  // ---------- 自動の位置合わせと変更箇所の検出 ----------
  function darkMask(img, sx, w, h) {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); c.drawImage(img, 0, 0, img.width * sx, img.height * sx);
    const d = c.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3 < 150 ? 1 : 0;
    return m;
  }
  function bestShift(A, B, w, h, cx, cy, R, step) {
    const pts = [];
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (B[y * w + x]) pts.push(x, y);
    let best = { dx: cx, dy: cy, s: -1 };
    for (let dy = cy - R; dy <= cy + R; dy++) for (let dx = cx - R; dx <= cx + R; dx++) {
      let s = 0;
      for (let i = 0; i < pts.length; i += 2) { const x = pts[i] + dx, y = pts[i + 1] + dy; if (x >= 0 && y >= 0 && x < w && y < h && A[y * w + x]) s++; }
      if (s > best.s) best = { dx, dy, s };
    }
    return best;
  }
  // 完成図(k)を現況図(g)に重ねたときのずれを探し、k.origin（と未設定なら k.ppm）を決める
  async function autoAlign(gD, gUrl, kD, kUrl) {
    const [gi, ki] = await Promise.all([loadImg(gUrl), loadImg(kUrl)]);
    const s = gD.ppm > 0 && kD.ppm > 0 ? gD.ppm / kD.ppm : 1; // 完成図px → 現況図px の倍率
    const f1 = 300 / Math.max(gi.width, gi.height), w1 = Math.round(gi.width * f1), h1 = Math.round(gi.height * f1);
    const A1 = darkMask(gi, f1, w1, h1), B1 = darkMask(ki, f1 * s, w1, h1);
    const b1 = bestShift(A1, B1, w1, h1, 0, 0, 40, 1);
    const f2 = 900 / Math.max(gi.width, gi.height), w2 = Math.round(gi.width * f2), h2 = Math.round(gi.height * f2);
    const A2 = darkMask(gi, f2, w2, h2), B2 = darkMask(ki, f2 * s, w2, h2);
    const b2 = bestShift(A2, B2, w2, h2, Math.round(b1.dx * f2 / f1), Math.round(b1.dy * f2 / f1), 4, 2);
    const d = { x: b2.dx / f2, y: b2.dy / f2 };
    const og = gD.origin || { x: 0, y: 0 };
    if (!(kD.ppm > 0) && gD.ppm > 0) kD.ppm = gD.ppm; // 同じ縮尺の図面とみなす
    kD.origin = { x: (og.x - d.x) / s, y: (og.y - d.y) / s };
    kD.aligned = true;
    const total = B1.reduce((a, b) => a + b, 0);
    return { score: total ? b1.s / total : 0 };
  }
  // 変更箇所のマスク（現況図の px 空間）。赤＝現況にだけある線（撤去）、青＝完成にだけある線（新設）
  async function diffOverlay(gD, gUrl, kD, kUrl) {
    const [gi, ki] = await Promise.all([loadImg(gUrl), loadImg(kUrl)]);
    const s = gD.ppm > 0 && kD.ppm > 0 ? gD.ppm / kD.ppm : 1;
    const og = gD.origin || { x: 0, y: 0 }, ok = kD.origin || { x: 0, y: 0 };
    const d = { x: og.x - ok.x * s, y: og.y - ok.y * s };
    const f = Math.min(1, 1200 / Math.max(gi.width, gi.height)), w = Math.round(gi.width * f), h = Math.round(gi.height * f);
    const A = darkMask(gi, f, w, h);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, w, h);
    c.drawImage(ki, d.x * f, d.y * f, ki.width * s * f, ki.height * s * f);
    const kd = c.getImageData(0, 0, w, h).data, B = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) B[i] = (kd[i * 4] + kd[i * 4 + 1] + kd[i * 4 + 2]) / 3 < 150 ? 1 : 0;
    const near = (M, x, y, r) => { for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++) if (M[yy * w + xx]) return true; return false; };
    const out = c.createImageData(w, h); let red = 0, blue = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (A[i] && !near(B, x, y, 2)) { out.data.set([220, 38, 38, 200], i * 4); red++; }
      else if (B[i] && !near(A, x, y, 2)) { out.data.set([37, 99, 235, 200], i * 4); blue++; }
    }
    c.clearRect(0, 0, w, h); c.putImageData(out, 0, 0);
    return { canvas: cv, scale: f, red, blue };
  }

  // ---------- ② 自動読み取り：部屋（クリック1回／室名から）と、壁の撤去・新設 ----------
  const maskCache = new Map();
  // 図面の線（暗い画素）のマスク。長辺 maxPx に縮小して扱う（k＝縮小率）
  async function lineMask(url, maxPx) {
    const key = url.length + ":" + url.slice(-64) + ":" + maxPx;
    if (maskCache.has(key)) return maskCache.get(key);
    const img = await loadImg(url);
    const k = Math.min(1, maxPx / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
    const m = { k, w, h, a: darkMask(img, k, w, h) };
    if (maskCache.size > 6) maskCache.clear();
    maskCache.set(key, m);
    return m;
  }
  function dilate(a, w, h, r) {
    if (r <= 0) return a;
    const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x]) for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < w) t[y * w + xx] = 1; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (t[y * w + x]) for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < h) o[yy * w + x] = 1; }
    return o;
  }
  function drawBarriers(a, w, h, k, shapes) {
    // 手で引いた壁も仕切りとして使う（扉の開口を閉じるのに便利）
    (shapes || []).filter((s) => s.type === "wall" && s.pts).forEach((s) => {
      for (let i = 0; i < s.pts.length - 1; i++) {
        const p = s.pts[i], q = s.pts[i + 1], n = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) * k) + 1;
        for (let j = 0; j <= n; j++) {
          const x = Math.round((p.x + ((q.x - p.x) * j) / n) * k), y = Math.round((p.y + ((q.y - p.y) * j) / n) * k);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) a[yy * w + xx] = 1; }
        }
      }
    });
  }
  // 塗りつぶした領域の外周をたどる（Moore近傍）→ 間引いて多角形に
  function traceOutline(F, w, h) {
    let s = -1;
    for (let i = 0; i < w * h; i++) if (F[i]) { s = i; break; }
    if (s < 0) return [];
    const D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && F[y * w + x];
    const sx = s % w, sy = (s / w) | 0, pts = [];
    let x = sx, y = sy, dir = 6, guard = 0;
    do {
      pts.push({ x, y });
      let found = false;
      for (let i = 0; i < 8; i++) {
        const d = (dir + 6 + i) % 8, nx = x + D[d][0], ny = y + D[d][1];
        if (at(nx, ny)) { x = nx; y = ny; dir = d; found = true; break; }
      }
      if (!found) break;
    } while ((x !== sx || y !== sy) && ++guard < 400000);
    return pts;
  }
  function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    const dist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / L; };
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const st = [[0, pts.length - 1]];
    while (st.length) {
      const [i, j] = st.pop(); let mx = 0, mi = -1;
      for (let k = i + 1; k < j; k++) { const d = dist(pts[k], pts[i], pts[j]); if (d > mx) { mx = d; mi = k; } }
      if (mx > eps && mi > 0) { keep[mi] = 1; st.push([i, mi], [mi, j]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  // 部屋の中の1点から、線に囲まれた範囲を塗りつぶして部屋の形を出す（px座標の多角形）
  async function floodRoom(url, seed, shapes, opt) {
    const o = opt || {};
    const M = await lineMask(url, 1600), { k, w, h } = M;
    const a = dilate(M.a, w, h, 1);
    drawBarriers(a, w, h, k, shapes);
    let sx = Math.round(seed.x * k), sy = Math.round(seed.y * k);
    // 文字の上をクリックしたときは近くの空白から始める
    if (a[sy * w + sx]) {
      let best = null;
      for (let r = 1; r < 25 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) { const x = sx + dx, y = sy + dy; if (x >= 0 && y >= 0 && x < w && y < h && !a[y * w + x]) { best = [x, y]; break; } }
      if (!best) return { ok: false, why: "線の上です" };
      [sx, sy] = best;
    }
    const F = new Uint8Array(w * h), st = [sy * w + sx]; F[sy * w + sx] = 1;
    let n = 0, edge = false;
    const limit = (o.maxFrac || 0.5) * w * h;
    while (st.length) {
      const i = st.pop(); n++;
      if (n > limit) return { ok: false, why: "囲まれていません（扉の所が開いている・外につながっている）" };
      const x = i % w, y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      if (x > 0 && !a[i - 1] && !F[i - 1]) { F[i - 1] = 1; st.push(i - 1); }
      if (x < w - 1 && !a[i + 1] && !F[i + 1]) { F[i + 1] = 1; st.push(i + 1); }
      if (y > 0 && !a[i - w] && !F[i - w]) { F[i - w] = 1; st.push(i - w); }
      if (y < h - 1 && !a[i + w] && !F[i + w]) { F[i + w] = 1; st.push(i + w); }
    }
    if (edge) return { ok: false, why: "図面の外までつながっています" };
    if (n < 30) return { ok: false, why: "小さすぎます" };
    // 文字などで中にできた穴は外周だけ使うので無視。線の太さの半分＋太らせた1px＋画素の中心の分（約2.5px）だけ外周を外へ戻す
    const outline = rdp(traceOutline(F, w, h), 1.5);
    const c = outline.reduce((s, p) => ({ x: s.x + p.x / outline.length, y: s.y + p.y / outline.length }), { x: 0, y: 0 });
    const pts = outline.map((p) => { const dx = p.x - c.x, dy = p.y - c.y, L = Math.hypot(dx, dy) || 1; return { x: (p.x + (dx / L) * 2.5) / k, y: (p.y + (dy / L) * 2.5) / k }; });
    return { ok: pts.length >= 3, pts, why: pts.length >= 3 ? "" : "形を取れません" };
  }

  // 撤去・新設した壁を自動検出：位置合わせした2枚の線の差のうち、まっすぐ長く続くものだけを壁とみなす
  async function detectWallChanges(gD, gUrl, kD, kUrl) {
    const [gi, ki] = await Promise.all([loadImg(gUrl), loadImg(kUrl)]);
    const s = gD.ppm > 0 && kD.ppm > 0 ? gD.ppm / kD.ppm : 1;
    const og = gD.origin || { x: 0, y: 0 }, ok = kD.origin || { x: 0, y: 0 };
    const d = { x: og.x - ok.x * s, y: og.y - ok.y * s };
    const f = Math.min(1, 1600 / Math.max(gi.width, gi.height)), w = Math.round(gi.width * f), h = Math.round(gi.height * f);
    const A = darkMask(gi, f, w, h);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, w, h);
    c.drawImage(ki, d.x * f, d.y * f, ki.width * s * f, ki.height * s * f);
    const kd = c.getImageData(0, 0, w, h).data, B = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) B[i] = (kd[i * 4] + kd[i * 4 + 1] + kd[i * 4 + 2]) / 3 < 150 ? 1 : 0;
    const ppmW = gD.ppm * f; // 作業画像の px/mm
    const minLen = Math.max(8, 450 * ppmW), wallT = Math.max(2, Math.round(220 * ppmW)); // 45cm 未満は壁とみなさない／壁厚の目安
    const Ad = dilate(A, w, h, 2), Bd = dilate(B, w, h, 2);
    const R = new Uint8Array(w * h), N = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) { R[i] = A[i] && !Bd[i] ? 1 : 0; N[i] = B[i] && !Ad[i] ? 1 : 0; }
    const segsOf = (M) => {
      const out = [];
      const scan = (horiz) => {
        const L1 = horiz ? h : w, L2 = horiz ? w : h, runs = [];
        for (let u = 0; u < L1; u++) {
          let st = -1;
          for (let v = 0; v <= L2; v++) {
            const on = v < L2 && (horiz ? M[u * w + v] : M[v * w + u]);
            if (on && st < 0) st = v;
            if (!on && st >= 0) { if (v - st >= minLen) runs.push({ u, a: st, b: v - 1 }); st = -1; }
          }
        }
        // 近い行（壁の厚み以内）で重なる線を1本の壁にまとめる（二重線の壁も1本に）
        const groups = [];
        runs.forEach((r) => {
          const g = groups.find((g) => r.u - g.u1 <= wallT && Math.min(g.b, r.b) - Math.max(g.a, r.a) > 0.5 * Math.min(g.b - g.a, r.b - r.a));
          if (g) { g.u1 = r.u; g.a = Math.min(g.a, r.a); g.b = Math.max(g.b, r.b); g.us.push(r.u); }
          else groups.push({ u0: r.u, u1: r.u, a: r.a, b: r.b, us: [r.u] });
        });
        // 文字が重なって途切れた壁や、二重線が別々に拾われた壁を1本にまとめる（同じ線上で重なる／30cm以内の切れ目）
        const gapMax = Math.max(3, 300 * ppmW);
        let merged = true;
        while (merged) {
          merged = false;
          for (let i = 0; i < groups.length && !merged; i++) for (let j = i + 1; j < groups.length && !merged; j++) {
            const A = groups[i], B = groups[j];
            const near = Math.abs((A.u0 + A.u1) / 2 - (B.u0 + B.u1) / 2) <= wallT;
            if (near && Math.min(A.b, B.b) - Math.max(A.a, B.a) >= -gapMax) {
              A.a = Math.min(A.a, B.a); A.b = Math.max(A.b, B.b); A.u0 = Math.min(A.u0, B.u0); A.u1 = Math.max(A.u1, B.u1);
              groups.splice(j, 1); merged = true;
            }
          }
        }
        groups.forEach((g) => {
          const u = (g.u0 + g.u1) / 2;
          out.push(horiz ? [{ x: g.a / f, y: u / f }, { x: g.b / f, y: u / f }] : [{ x: u / f, y: g.a / f }, { x: u / f, y: g.b / f }]);
        });
      };
      scan(true); scan(false);
      return out;
    };
    const removed = segsOf(R);
    const added = segsOf(N).map((sg) => sg.map((p) => ({ x: (p.x - d.x) / s, y: (p.y - d.y) / s }))); // 完成図の px へ
    return { removed, added };
  }

  // ---------- トレース用キャンバス ----------
  const COLORS = { room: "rgba(22,163,74,.18)", roomLine: "#15803d", wallG: "#dc2626", wallK: "#2563eb", pt: "#7c3aed", sel: "#f59e0b", est: "#0d9488" };
  const PT_ICON = { door: "D", window: "窓", light: "灯", outlet: "コ", faucet: "水", other: "他" };

  function Pad(canvas, opts) {
    const P = { side: "kansei", d: null, img: null, tool: "select", ptKind: "light", sel: -1, draft: null, overlay: null, ghost: null, showGhost: true };
    const ctx = canvas.getContext("2d");
    let view = { s: 1, x: 0, y: 0 };
    const undo = [];
    const emit = (what) => opts.onChange && opts.onChange(what);

    function fit() {
      if (!P.img) return;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      view.s = Math.min(W / P.img.width, H / P.img.height) * 0.96;
      view.x = (W - P.img.width * view.s) / 2; view.y = (H - P.img.height * view.s) / 2;
      draw();
    }
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
      draw();
    }
    const toImg = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - view.x) / view.s, y: (e.clientY - r.top - view.y) / view.s }; };
    const lenMm = (a, b) => (P.d && P.d.ppm > 0 ? Math.hypot(b.x - a.x, b.y - a.y) / P.d.ppm : 0);

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e5e7eb"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!P.img) return;
      ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
      ctx.drawImage(P.img, 0, 0);
      if (P.overlay && P.overlay.canvas) {
        ctx.save(); ctx.globalAlpha = 0.9;
        const o = P.overlay; ctx.setTransform(dpr * view.s * o.k, 0, 0, dpr * view.s * o.k, dpr * (view.x + o.x * view.s), dpr * (view.y + o.y * view.s));
        ctx.drawImage(o.canvas, 0, 0); ctx.restore();
      }
      const lw = 1 / view.s;
      // もう一方の図面の図形（薄く）
      if (P.showGhost && P.ghost) P.ghost.forEach((s) => drawShape(s, lw, true));
      (P.d.shapes || []).forEach((s, i) => drawShape(s, lw, false, i === P.sel));
      // 描きかけ
      if (P.draft && P.draft.pts.length) {
        ctx.strokeStyle = COLORS.sel; ctx.lineWidth = 2 * lw; ctx.setLineDash([6 * lw, 4 * lw]);
        ctx.beginPath(); P.draft.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        if (P.draft.hover) ctx.lineTo(P.draft.hover.x, P.draft.hover.y);
        ctx.stroke(); ctx.setLineDash([]);
        P.draft.pts.forEach((p) => dot(p, 4 * lw, COLORS.sel));
        if (P.draft.hover && P.draft.pts.length) {
          const a = P.draft.pts[P.draft.pts.length - 1], mm = lenMm(a, P.draft.hover);
          if (mm) label(`${Math.round(mm).toLocaleString()}mm`, (a.x + P.draft.hover.x) / 2, (a.y + P.draft.hover.y) / 2, lw, "#111827");
        }
      }
      if (P.d.origin && (P.tool === "origin" || P.d.originSet)) { const o = P.d.origin; ctx.strokeStyle = "#111"; ctx.lineWidth = 2 * lw; ctx.beginPath(); ctx.moveTo(o.x - 12 * lw, o.y); ctx.lineTo(o.x + 12 * lw, o.y); ctx.moveTo(o.x, o.y - 12 * lw); ctx.lineTo(o.x, o.y + 12 * lw); ctx.stroke(); }
    }
    function dot(p, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); }
    function label(t, x, y, lw, c) {
      ctx.font = `${13 * lw}px sans-serif`; const w = ctx.measureText(t).width;
      ctx.fillStyle = "rgba(255,255,255,.88)"; ctx.fillRect(x - w / 2 - 3 * lw, y - 9 * lw, w + 6 * lw, 18 * lw);
      ctx.fillStyle = c || "#111"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y);
    }
    function drawShape(s, lw, ghost, selected) {
      ctx.globalAlpha = ghost ? 0.45 : 1;
      const side = ghost ? (P.side === "kansei" ? "genkyo" : "kansei") : P.side;
      if (s.type === "room" && s.est) {
        ctx.strokeStyle = COLORS.est; ctx.lineWidth = 2 * lw; ctx.setLineDash([4 * lw, 3 * lw]);
        ctx.strokeRect(s.x - 50 * lw, s.y - 14 * lw, 100 * lw, 28 * lw); ctx.setLineDash([]);
        label(`${s.name} ${s.jo}帖≒${s.area}㎡`, s.x, s.y, lw, selected ? "#b45309" : COLORS.est);
      } else if (s.type === "room" && s.pts) {
        ctx.fillStyle = COLORS.room; ctx.strokeStyle = selected ? COLORS.sel : COLORS.roomLine; ctx.lineWidth = (selected ? 3 : 2) * lw;
        ctx.beginPath(); s.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill(); ctx.stroke();
        let cx = 0, cy = 0; s.pts.forEach((p) => { cx += p.x; cy += p.y; }); cx /= s.pts.length; cy /= s.pts.length;
        const a = P.d.ppm > 0 && !ghost ? MQ.polyArea(s.pts) / P.d.ppm / P.d.ppm / 1e6 : 0;
        label(s.name + (a ? ` ${a.toFixed(2)}㎡` : ""), cx, cy, lw, "#14532d");
      } else if (s.type === "wall" && s.pts) {
        ctx.strokeStyle = selected ? COLORS.sel : side === "genkyo" ? COLORS.wallG : COLORS.wallK; ctx.lineWidth = (selected ? 7 : 5) * lw; ctx.lineCap = "round";
        if (s.auto) ctx.setLineDash([10 * lw, 5 * lw]); // 自動検出の壁は破線
        ctx.beginPath(); s.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.setLineDash([]);
      } else if (s.type === "pt") {
        const r = 11 * lw;
        ctx.fillStyle = selected ? COLORS.sel : s.replace ? "#ea580c" : s.keep ? "#64748b" : COLORS.pt;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = `bold ${11 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(PT_ICON[s.kind] || "?", s.x, s.y + 0.5 * lw);
      }
      ctx.globalAlpha = 1;
    }

    // ---------- 入力 ----------
    function snap(p, prev) {
      const tol = 8 / view.s;
      // 既存の頂点に吸着
      for (const s of P.d.shapes) if (s.pts) for (const q of s.pts) if (Math.hypot(q.x - p.x, q.y - p.y) < tol) return { x: q.x, y: q.y };
      if (P.draft) for (const q of P.draft.pts) if (Math.hypot(q.x - p.x, q.y - p.y) < tol) return { x: q.x, y: q.y };
      // 水平・垂直に吸着（7°以内）
      if (prev) {
        const dx = p.x - prev.x, dy = p.y - prev.y, ang = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
        if (ang < 7 || ang > 173) return { x: p.x, y: prev.y };
        if (Math.abs(ang - 90) < 7) return { x: prev.x, y: p.y };
      }
      return p;
    }
    function hit(p) {
      const tol = 10 / view.s, sh = P.d.shapes;
      for (let i = sh.length - 1; i >= 0; i--) {
        const s = sh[i];
        if (s.type === "pt" && Math.hypot(s.x - p.x, s.y - p.y) < 13 / view.s) return i;
        if (s.type === "room" && s.est && Math.abs(s.x - p.x) < 50 / view.s && Math.abs(s.y - p.y) < 14 / view.s) return i;
        if (s.type === "wall") for (let k = 0; k < s.pts.length - 1; k++) if (distSeg(p, s.pts[k], s.pts[k + 1]) < tol) return i;
      }
      for (let i = sh.length - 1; i >= 0; i--) if (sh[i].type === "room" && sh[i].pts && inPoly(p, sh[i].pts)) return i;
      return -1;
    }
    function distSeg(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy; let t = L ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); }
    function inPoly(p, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; }
    function pushUndo() { undo.push(JSON.stringify(P.d.shapes)); if (undo.length > 60) undo.shift(); }
    function commit(shape) { pushUndo(); P.d.shapes.push(shape); P.sel = P.d.shapes.length - 1; emit("shapes"); select(P.sel); }
    function select(i) { P.sel = i; draw(); opts.onSelect && opts.onSelect(i >= 0 ? P.d.shapes[i] : null, i); }
    function finishDraft() {
      const dr = P.draft; P.draft = null;
      if (!dr) return;
      if (dr.kind === "room" && dr.pts.length >= 3) commit({ type: "room", name: opts.nextRoomName ? opts.nextRoomName() : "部屋", pts: dr.pts, floor: true, wall: true, ceil: true });
      else if (dr.kind === "wall" && dr.pts.length >= 2) commit({ type: "wall", pts: dr.pts });
      else draw();
    }

    let drag = null, pinch = null;
    const pointers = new Map();
    canvas.addEventListener("pointerdown", (e) => {
      if (!P.img) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s, x: view.x, y: view.y, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; drag = null; return; }
      const p = toImg(e);
      if (e.button === 1 || e.button === 2 || P.tool === "pan") { drag = { pan: true, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }; return; }
      if (P.tool === "select") {
        const i = hit(p);
        if (i >= 0) { select(i); const s = P.d.shapes[i]; drag = { move: i, start: p, orig: JSON.stringify(s), moved: false }; }
        else { select(-1); drag = { pan: true, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }; }
        return;
      }
      drag = { click: true, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, p };
    });
    canvas.addEventListener("pointermove", (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = canvas.getBoundingClientRect();
        const k = d / pinch.d, cx = pinch.cx - r.left, cy = pinch.cy - r.top;
        view.s = pinch.s * k; view.x = cx - (cx - pinch.x) * k; view.y = cy - (cy - pinch.y) * k; draw(); return;
      }
      if (drag && drag.pan) { view.x = drag.vx + e.clientX - drag.sx; view.y = drag.vy + e.clientY - drag.sy; draw(); return; }
      if (drag && drag.click && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { drag = { pan: true, sx: drag.sx, sy: drag.sy, vx: drag.vx, vy: drag.vy }; return; }
      if (drag && drag.move >= 0) {
        const p = toImg(e), s = P.d.shapes[drag.move], o = JSON.parse(drag.orig), dx = p.x - drag.start.x, dy = p.y - drag.start.y;
        if (!drag.moved) { if (Math.hypot(dx, dy) * view.s < 4) return; pushUndo(); drag.moved = true; }
        if (o.pts) s.pts = o.pts.map((q) => ({ x: q.x + dx, y: q.y + dy })); else { s.x = o.x + dx; s.y = o.y + dy; }
        draw(); return;
      }
      if (P.draft) { const p = toImg(e); P.draft.hover = snap(p, P.draft.pts[P.draft.pts.length - 1]); draw(); }
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pinch) { if (pointers.size < 2) pinch = null; return; }
      const dg = drag; drag = null;
      if (dg && dg.move >= 0 && dg.moved) { emit("shapes"); return; }
      if (!dg || !dg.click) return;
      onClick(dg.p, e);
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); pinch = null; drag = null; });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("dblclick", () => { if (P.draft) { P.draft.pts.pop(); finishDraft(); } });
    canvas.addEventListener("wheel", (e) => {
      if (!P.img) return; e.preventDefault();
      const r = canvas.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top, k = Math.exp(-e.deltaY * 0.0015);
      view.x = cx - (cx - view.x) * k; view.y = cy - (cy - view.y) * k; view.s *= k; draw();
    }, { passive: false });

    let lastClick = 0;
    function onClick(p0, e) {
      const t = P.tool;
      if (t === "pt") { commit({ type: "pt", kind: P.ptKind, x: p0.x, y: p0.y, replace: false }); return; }
      if (t === "fill") {
        // 戻り値 { pts, name, est }：est（帖数の概算の部屋）が中にあれば、その室名を引き継いで概算を消す
        opts.fillRoom && opts.fillRoom(p0, P.d.shapes).then((r) => {
          if (!r) return;
          if (r.est) { const i = P.d.shapes.indexOf(r.est); if (i >= 0) P.d.shapes.splice(i, 1); }
          commit({ type: "room", name: r.name || (opts.nextRoomName ? opts.nextRoomName() : "部屋"), jo: r.est ? r.est.jo : undefined, pts: r.pts, floor: true, wall: true, ceil: true, auto: true });
        });
        return;
      }
      if (t === "origin") { P.d.origin = { x: p0.x, y: p0.y }; P.d.originSet = true; emit("calib"); draw(); return; }
      if (t === "scale") {
        if (!P.draft) { P.draft = { kind: "scale", pts: [p0] }; draw(); return; }
        const a = P.draft.pts[0], b = snap(p0, a); P.draft = null;
        const px = Math.hypot(b.x - a.x, b.y - a.y);
        if (px < 5) { draw(); return; }
        opts.askLength && opts.askLength((mm) => { if (mm > 0) { P.d.ppm = px / mm; P.d.scaleDen = 0; emit("calib"); } draw(); });
        return;
      }
      if (t === "room" || t === "wall") {
        const now = Date.now(), dbl = now - lastClick < 300; lastClick = now;
        if (!P.draft) { P.draft = { kind: t, pts: [snap(p0)] }; draw(); return; }
        const p = snap(p0, P.draft.pts[P.draft.pts.length - 1]);
        const first = P.draft.pts[0];
        if (t === "room" && P.draft.pts.length >= 3 && Math.hypot(p.x - first.x, p.y - first.y) * view.s < 12) { finishDraft(); return; }
        if (dbl) return; // ダブルクリックは dblclick で確定
        P.draft.pts.push(p); draw();
      }
    }
    G.addEventListener("keydown", (e) => {
      if (!opts.isActive || !opts.isActive()) return;
      if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || "")) return;
      if (e.key === "Escape") { P.draft = null; draw(); }
      else if (e.key === "Enter") finishDraft();
      else if ((e.key === "Delete" || e.key === "Backspace") && P.sel >= 0) { API.remove(P.sel); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { API.undo(); e.preventDefault(); }
    });
    new ResizeObserver(() => { resize(); }).observe(canvas);

    const API = {
      P,
      async load(d, url, side) {
        P.d = d; P.side = side; P.sel = -1; P.draft = null; P.overlay = null; undo.length = 0;
        P.img = url ? await loadImg(url) : null;
        resize(); fit();
      },
      setTool(t) { P.tool = t; P.draft = null; draw(); },
      setPtKind(k) { P.ptKind = k; },
      setGhost(shapes) { P.ghost = shapes; draw(); },
      setOverlay(o) { P.overlay = o; draw(); },
      toggleGhost(v) { P.showGhost = v; draw(); },
      remove(i) { pushUndo(); P.d.shapes.splice(i, 1); select(-1); emit("shapes"); },
      undo() { if (!undo.length) return; P.d.shapes = JSON.parse(undo.pop()); select(-1); emit("shapes"); },
      changed() { draw(); emit("shapes"); },
      finish: finishDraft, fit, draw,
      zoom(k) { const W = canvas.clientWidth / 2, H = canvas.clientHeight / 2; view.x = W - (W - view.x) * k; view.y = H - (H - view.y) * k; view.s *= k; draw(); }
    };
    return API;
  }

  // 他方の図面の図形を、この図面の px 座標へ写す（mm 経由）
  function mapShapes(from, to) {
    if (!from || !to || !(from.ppm > 0) || !(to.ppm > 0)) return null;
    const fo = from.origin || { x: 0, y: 0 }, to0 = to.origin || { x: 0, y: 0 }, k = to.ppm / from.ppm;
    const f = (p) => ({ x: (p.x - fo.x) * k + to0.x, y: (p.y - fo.y) * k + to0.y });
    return (from.shapes || []).map((s) => (s.pts ? Object.assign({}, s, { pts: s.pts.map(f) }) : Object.assign({}, s, f(s))));
  }

  G.Drawing = { floodRoom, detectWallChanges, pdfOpts, importDrawing, autoAlign, diffOverlay, Pad, mapShapes, loadScript, renderPdfPage, textFromItems, loadImg, readAs };
})(window);
