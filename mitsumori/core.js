// ===== 栗駒見積帳 計算の中核（画面に依存しない純粋な関数だけ。node でもテストできる） =====
// ① 現況図と完成図の比較から数量を出す（measure / autoLines）
// ② 担当者の補正（数量・単価の上書き）を残したまま再計算
// ④ 請求書の読み取り結果から原価実行を集計し、標準単価を学習（learn / actuals / parseDocText）
// ⑤ 案件ごとの利益率で見積金額を出す（unitPrice / calc / solveRate）
(function (G) {
  "use strict";

  // ---------- 初期の単価表（Excel「栗駒見積帳」の標準単価表＋図面連動キー） ----------
  // auto … 図面から数量を自動で入れるキー（AUTO_KEYS）。'+' で足し合わせ。空なら手入力の項目。
  const KOUSHU = ["仮設工事", "解体工事", "木工事", "屋根工事", "外装工事", "内装工事", "建具工事", "電気設備工事", "給排水設備工事", "その他"];

  const DEFAULT_PRICES = [
    ["仮設工事", "養生費", "床・壁・共用部", "式", 30000, 18000, "lump"],
    ["仮設工事", "廃材処分費", "混合廃棄物", "㎥", 18000, 12000, "waste"],
    ["解体工事", "床解体撤去", "既存フローリング", "㎡", 2500, 1500, "floor_demo"],
    ["解体工事", "内壁解体撤去", "石膏ボード", "㎡", 2000, 1200, "wall_demo_area"],
    ["解体工事", "建具撤去", "枠共", "箇所", 8000, 5000, "pt_rm_door"],
    ["木工事", "床下地調整", "合板増し張り t12", "㎡", 3500, 2100, "floor_area"],
    ["木工事", "間仕切壁新設", "LGS下地・PB両面", "m", 18000, 11000, "wall_new_len"],
    ["木工事", "大工手間", "造作工事", "人工", 28000, 20000, ""],
    ["内装工事", "複合フローリング張り", "t12 303幅", "㎡", 9800, 6200, "floor_area"],
    ["内装工事", "壁ビニールクロス張り", "量産品", "㎡", 1500, 950, "wall_area"],
    ["内装工事", "天井ビニールクロス張り", "量産品", "㎡", 1500, 950, "ceil_area"],
    ["内装工事", "巾木取付", "ソフト巾木 H60", "m", 1200, 700, "baseboard"],
    ["建具工事", "室内ドア交換", "片開き 枠共", "箇所", 85000, 58000, "pt_rep_door"],
    ["建具工事", "室内ドア新設", "片開き 枠共", "箇所", 95000, 64000, "pt_new_door"],
    ["建具工事", "内窓取付手間", "樹脂内窓", "箇所", 8000, 5000, "pt_rep_window+pt_new_window"],
    ["電気設備工事", "照明器具取付", "ダウンライト LED", "箇所", 6500, 3800, "pt_new_light+pt_rep_light"],
    ["電気設備工事", "コンセント増設", "2口・露出配線", "箇所", 9000, 5000, "pt_new_outlet"],
    ["給排水設備工事", "水栓交換", "シングルレバー", "箇所", 32000, 21000, "pt_rep_faucet+pt_new_faucet"]
  ];
  function defaultPrices() {
    const o = {};
    DEFAULT_PRICES.forEach((r, i) => {
      const id = "p" + String(i + 1).padStart(3, "0");
      o[id] = { koushu: r[0], name: r[1], spec: r[2], unit: r[3], std: r[4], cost: r[5], auto: r[6], order: i + 1 };
    });
    return o;
  }
  const DEFAULT_SETTINGS = { keihiRate: 0.08, taxRate: 0.1, targetMargin: 0.25, halfLifeDays: 365, wastePerM2: 0.03, listRate: 0, defaultCh: 2400 };

  // 図面から出す数量の種類（単価表の「図面連動」で選ぶ）
  const PT_KINDS = { door: "ドア", window: "窓", light: "照明", outlet: "コンセント", faucet: "水栓", other: "その他" };
  const AUTO_KEYS = {
    lump: "1式（工事があれば）",
    waste: "廃材量 ㎥（解体面積から）",
    floor_area: "床の張替面積 ㎡",
    wall_area: "壁の張替面積 ㎡（周長×天井高＋新設壁の両面）",
    ceil_area: "天井の張替面積 ㎡",
    baseboard: "巾木の長さ m",
    floor_demo: "既存床の解体面積 ㎡",
    wall_demo_area: "撤去する壁の面積 ㎡",
    wall_demo_len: "撤去する壁の長さ m",
    wall_new_len: "新設する壁の長さ m",
    wall_new_area: "新設する壁の面積 ㎡（片面）"
  };
  Object.keys(PT_KINDS).forEach((k) => {
    AUTO_KEYS["pt_new_" + k] = PT_KINDS[k] + "：新設 箇所";
    AUTO_KEYS["pt_rep_" + k] = PT_KINDS[k] + "：交換・改修 箇所";
    AUTO_KEYS["pt_rm_" + k] = PT_KINDS[k] + "：撤去 箇所";
  });

  const JO_M2 = 1.62; // 1帖＝1.62㎡（不動産の表示に関する公正競争規約の基準）

  // ---------- 小物 ----------
  const r2 = (n) => Math.round(n * 100) / 100;
  const ceilTo = (n, u) => Math.ceil(Math.round(n * 1000) / 1000 / u) * u;
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const has = (v) => v !== null && v !== undefined && v !== "";
  function uid(p) { return (p || "") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ---------- 図形の計算（座標は mm） ----------
  function toMm(d, p) { const o = d.origin || { x: 0, y: 0 }; return { x: (p.x - o.x) / d.ppm, y: (p.y - o.y) / d.ppm }; }
  function polyArea(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; }
  function polyLen(pts, closed) { let s = 0; const n = closed ? pts.length : pts.length - 1; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += Math.hypot(b.x - a.x, b.y - a.y); } return s; }
  function centroid(pts) { let x = 0, y = 0; pts.forEach((p) => { x += p.x; y += p.y; }); return { x: x / pts.length, y: y / pts.length }; }
  function inPoly(p, pts) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  }
  function segDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
    let t = L ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  function segs(pts) { const s = []; for (let i = 0; i < pts.length - 1; i++) s.push([pts[i], pts[i + 1]]); return s; }
  // 壁 a の各部分が、もう一方の図面の壁 others から tol(mm) 以内にある割合 → 残る長さ
  function coveredLen(a, b, others, tol) {
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (!others.length || L < 1) return 0;
    const n = Math.max(2, Math.ceil(L / 50));
    let hit = 0;
    for (let i = 0; i <= n; i++) {
      const p = { x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n };
      if (others.some((s) => segDist(p, s[0], s[1]) <= tol)) hit++;
    }
    return (L * hit) / (n + 1);
  }

  // 図面1枚 → 部屋・壁・点（mm 座標）
  function readDrawing(d) {
    const out = { rooms: [], walls: [], pts: [], ok: !!(d && d.ppm > 0) };
    if (!d || !d.shapes) return out;
    const ch = num(d.ch) || DEFAULT_SETTINGS.defaultCh;
    d.shapes.forEach((s) => {
      if (s.type === "room") {
        let area, per, poly = null, c = null;
        if (s.est || !out.ok) {
          if (!s.est) return;
          area = num(s.area); per = 4.1 * Math.sqrt(area);
          if (out.ok) c = toMm(d, s);
        } else {
          poly = s.pts.map((p) => toMm(d, p));
          area = polyArea(poly) / 1e6; per = polyLen(poly, true) / 1000; c = centroid(poly);
        }
        out.rooms.push({
          name: s.name || "部屋", area, per, poly, c, ch: num(s.ch) || ch,
          floor: s.floor !== false, wall: s.wall !== false, ceil: s.ceil !== false, est: !!s.est
        });
      } else if (s.type === "wall" && out.ok && s.pts && s.pts.length > 1) {
        out.walls.push({ pts: s.pts.map((p) => toMm(d, p)), ch: num(s.ch) || ch });
      } else if (s.type === "pt" && out.ok) {
        out.pts.push(Object.assign({ kind: s.kind || "other", replace: !!s.replace, keep: !!s.keep }, toMm(d, s)));
      }
    });
    return out;
  }

  // ① 現況図(genkyo)と完成図(kansei)を比べて数量を出す
  function measure(genkyo, kansei, settings) {
    const S = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const G0 = readDrawing(genkyo), K = readDrawing(kansei);
    const m = {}, det = {}, warn = [];
    const add = (k, v, why) => { if (!v) return; m[k] = r2((m[k] || 0) + v); (det[k] = det[k] || []).push(why); };

    if (genkyo && genkyo.shapes && genkyo.shapes.length && !G0.ok) warn.push("現況図の縮尺が未設定です（縮尺を合わせると壁・建具も計算されます）");
    if (kansei && kansei.shapes && kansei.shapes.length && !K.ok) warn.push("完成図の縮尺が未設定です");

    // 部屋（仕上げは完成図の部屋で決める。完成図に部屋がなければ現況図の部屋を使う）
    const rooms = K.rooms.length ? K.rooms : G0.rooms;
    rooms.forEach((r) => {
      const tag = r.name + (r.est ? "（帖数から概算）" : "");
      const existed = !G0.rooms.length || rooms === G0.rooms ||
        G0.rooms.some((g) => g.name === r.name || (g.poly && r.c && inPoly(r.c, g.poly)));
      if (r.floor) {
        add("floor_area", r.area, `${tag} ${r2(r.area)}㎡`);
        add("baseboard", r.per, `${tag} 周長 ${r2(r.per)}m`);
        if (existed) add("floor_demo", r.area, `${tag} ${r2(r.area)}㎡`);
      }
      if (r.wall) add("wall_area", r.per * r.ch / 1000, `${tag} 周長${r2(r.per)}m×天井高${r.ch / 1000}m`);
      if (r.ceil) add("ceil_area", r.area, `${tag} ${r2(r.area)}㎡`);
    });

    // 壁：現況にあって完成にない＝撤去、完成にあって現況にない＝新設
    const TOL = 150;
    const gS = [], kS = [];
    G0.walls.forEach((w) => segs(w.pts).forEach((s) => gS.push(s)));
    K.walls.forEach((w) => segs(w.pts).forEach((s) => kS.push(s)));
    if (G0.walls.length && !K.walls.length) warn.push("現況図にだけ壁があります。完成図に「残す壁」も描かないと、全部撤去として計算されます");
    G0.walls.forEach((w) => segs(w.pts).forEach(([a, b]) => {
      const L = Math.hypot(b.x - a.x, b.y - a.y), keep = coveredLen(a, b, kS, TOL), gone = (L - keep) / 1000;
      if (gone > 0.1) { add("wall_demo_len", gone, `撤去 ${r2(gone)}m`); add("wall_demo_area", gone * w.ch / 1000, `撤去 ${r2(gone)}m×${w.ch / 1000}m`); }
    }));
    K.walls.forEach((w) => segs(w.pts).forEach(([a, b]) => {
      const L = Math.hypot(b.x - a.x, b.y - a.y), had = coveredLen(a, b, gS, TOL), nw = (L - had) / 1000;
      if (nw > 0.1) {
        add("wall_new_len", nw, `新設 ${r2(nw)}m`);
        add("wall_new_area", nw * w.ch / 1000, `新設 ${r2(nw)}m×${w.ch / 1000}m`);
        add("wall_area", nw * w.ch / 1000 * 2, `新設壁の両面 ${r2(nw)}m×${w.ch / 1000}m×2`);
      }
    }));

    // 建具・設備の点：同じ種類が 600mm 以内にあれば既存。既存で「交換」なら交換、相手がいなければ新設／撤去
    const PT_TOL = 600, used = new Set();
    K.pts.forEach((p) => {
      let best = -1, bd = PT_TOL;
      G0.pts.forEach((g, i) => { if (!used.has(i) && g.kind === p.kind) { const dd = Math.hypot(g.x - p.x, g.y - p.y); if (dd <= bd) { bd = dd; best = i; } } });
      const nm = PT_KINDS[p.kind] || p.kind;
      if (best >= 0) { used.add(best); if (p.replace) add("pt_rep_" + p.kind, 1, `${nm} 交換`); }
      else if (!G0.ok && p.replace) add("pt_rep_" + p.kind, 1, `${nm} 交換`);
      else if (!p.keep) add("pt_new_" + p.kind, 1, `${nm} 新設`);
    });
    G0.pts.forEach((g, i) => {
      if (used.has(i)) return;
      if (g.replace) add("pt_rep_" + g.kind, 1, `${PT_KINDS[g.kind] || g.kind} 交換（現況図で指定）`);
      else if (K.ok && !g.keep) add("pt_rm_" + g.kind, 1, `${PT_KINDS[g.kind] || g.kind} 撤去`);
    });

    const demo = (m.floor_demo || 0) + (m.wall_demo_area || 0) * 2;
    if (demo > 0) add("waste", Math.max(1, Math.round(demo * S.wastePerM2 * 10) / 10), `解体 ${r2(demo)}㎡×${S.wastePerM2}㎥`);
    if (Object.keys(m).length) { m.lump = 1; det.lump = ["工事あり"]; }
    return { metrics: m, detail: det, warnings: warn };
  }

  function autoQty(key, metrics) {
    if (!key) return 0;
    return r2(key.split("+").reduce((s, k) => s + num(metrics[k.trim()]), 0));
  }

  // 単価表の「図面連動」項目から見積行を作る。担当者が補正した値（qty / price / cost）はそのまま残す
  function autoLines(metrics, prices, lines) {
    const out = [];
    const seen = new Set();
    (lines || []).forEach((l) => {
      if (l.src !== "図面") { out.push(l); return; }
      const p = prices[l.priceId];
      const q = p ? autoQty(p.auto, metrics) : 0;
      seen.add(l.priceId);
      if (q <= 0 && !has(l.qty)) return; // 図面から消えて、補正もない行は消す
      out.push(Object.assign({}, l, p ? { koushu: p.koushu, name: p.name, spec: p.spec, unit: p.unit, priceStd: num(p.std), costStd: num(p.cost), auto: p.auto } : {}, { qtyAuto: q }));
    });
    const add = Object.keys(prices || {}).filter((id) => prices[id].auto && !seen.has(id))
      .map((id) => [id, prices[id]]).sort((a, b) => kIdx(a[1].koushu) - kIdx(b[1].koushu) || num(a[1].order) - num(b[1].order));
    add.forEach(([id, p]) => {
      const q = autoQty(p.auto, metrics);
      if (q > 0) out.push(newLine({ priceId: id, koushu: p.koushu, name: p.name, spec: p.spec, unit: p.unit, priceStd: num(p.std), costStd: num(p.cost), auto: p.auto, qtyAuto: q, src: "図面" }));
    });
    return sortLines(out);
  }
  function kIdx(k) { const i = KOUSHU.indexOf(k); return i < 0 ? 99 : i; }
  function sortLines(ls) { return ls.map((l, i) => [l, i]).sort((a, b) => kIdx(a[0].koushu) - kIdx(b[0].koushu) || a[1] - b[1]).map((x) => x[0]); }
  function newLine(o) {
    return Object.assign({ id: uid("L"), priceId: "", koushu: "その他", name: "", spec: "", unit: "式", auto: "", qtyAuto: 0, qty: null, priceStd: 0, costStd: 0, price: null, cost: null, listPrice: 0, src: "手入力", memo: "" }, o);
  }

  // ---------- ⑤ 金額計算（案件ごとの利益率） ----------
  // margin.mode: "std"＝単価表の標準単価どおり / "rate"＝原価 ÷ (1 − 利益率)（工種ごとの上書き byKoushu）
  function lineQty(l) { return has(l.qty) ? num(l.qty) : num(l.qtyAuto); }
  function lineCost(l) { return has(l.cost) ? num(l.cost) : num(l.costStd); }
  function rateFor(l, margin) {
    const mg = margin || {};
    const k = mg.byKoushu && has(mg.byKoushu[l.koushu]) ? num(mg.byKoushu[l.koushu]) : num(mg.rate);
    return Math.min(0.9, Math.max(-0.5, k));
  }
  function unitPrice(l, margin) {
    if (has(l.price)) return num(l.price);
    const mg = margin || {};
    if (mg.mode === "rate" && lineCost(l) > 0) return ceilTo(lineCost(l) / (1 - rateFor(l, mg)), 10);
    return num(l.priceStd);
  }
  function calc(project, settings, marginOverride) {
    const S = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const P = project || {};
    const margin = marginOverride || P.margin || { mode: "std" };
    const keihiRate = has(P.keihiRate) ? num(P.keihiRate) : S.keihiRate;
    const rows = [], byK = {};
    let direct = 0, cost = 0;
    (P.lines || []).forEach((l) => {
      const q = lineQty(l), up = unitPrice(l, margin), cu = lineCost(l);
      const amount = Math.round(q * up), costAmt = Math.round(q * cu);
      direct += amount; cost += costAmt;
      const k = l.koushu || "その他";
      byK[k] = byK[k] || { amount: 0, cost: 0 };
      byK[k].amount += amount; byK[k].cost += costAmt;
      rows.push({ line: l, qty: q, unitPrice: up, unitCost: cu, amount, costAmt, rate: amount ? (amount - costAmt) / amount : 0,
        corrected: has(l.qty) || has(l.price) || has(l.cost) });
    });
    const keihi = Math.round(direct * keihiRate);
    const nebiki = num(P.nebiki);
    const net = direct + keihi - nebiki;
    const tax = Math.floor(net * S.taxRate); // 消費税は1円未満切り捨て
    const total = net + tax;
    const subsidy = (P.subsidy || []).reduce((s, x) => s + num(x.amount), 0);
    const gross = net - cost;
    return { rows, byKoushu: byK, direct, keihi, keihiRate, nebiki, net, tax, total, cost, gross, grossRate: net ? gross / net : 0, subsidy, burden: total - subsidy, taxRate: S.taxRate };
  }
  // 税込の目標金額に近づく利益率を逆算（rate モード・工種別の上書きなしの前提）
  function solveRate(project, settings, targetTotal) {
    let lo = -0.5, hi = 0.9;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const t = calc(project, settings, { mode: "rate", rate: mid, byKoushu: (project.margin || {}).byKoushu }).total;
      if (t < targetTotal) lo = mid; else hi = mid;
    }
    return Math.round(((lo + hi) / 2) * 1000) / 1000;
  }

  // ---------- ④ 原価実行と単価の学習 ----------
  function invLineUnit(l) {
    if (num(l.unitPrice) > 0) return num(l.unitPrice);
    return num(l.qty) > 0 && num(l.amount) > 0 ? num(l.amount) / num(l.qty) : 0;
  }
  // 請求書を案件・工種別に集計（実行金額）
  function actuals(invoices, prices) {
    const byP = {};
    Object.keys(invoices || {}).forEach((id) => {
      const inv = invoices[id];
      const pid = inv.projectId || "_none";
      const P = (byP[pid] = byP[pid] || { total: 0, byKoushu: {}, count: 0 });
      P.count++;
      (inv.lines || []).forEach((l) => {
        const k = l.koushu || (prices && prices[l.priceId] && prices[l.priceId].koushu) || "その他";
        const a = num(l.amount) || Math.round(num(l.qty) * num(l.unitPrice));
        P.byKoushu[k] = (P.byKoushu[k] || 0) + a;
        P.total += a;
      });
    });
    return byP;
  }
  // 標準単価の学習：請求書の実際の単価（原価）を、新しいほど重く（半減期 halfLifeDays）平均。
  // 中央値の 1/2〜2倍 から外れる値は読み取り違い等として除外。提案売価＝学習原価÷(1−目標粗利率)。
  function learn(prices, invoices, projects, settings, nowMs) {
    const S = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const now = nowMs || Date.now();
    const samples = {};
    Object.keys(invoices || {}).forEach((id) => {
      const inv = invoices[id];
      const t = Date.parse(inv.date) || inv.created || now;
      (inv.lines || []).forEach((l) => {
        if (!l.priceId || !prices[l.priceId]) return;
        const u = invLineUnit(l);
        if (u > 0) (samples[l.priceId] = samples[l.priceId] || []).push({ u, t, q: num(l.qty) || 1, vendor: inv.vendor || "" });
      });
    });
    const corr = {};
    Object.keys(projects || {}).forEach((pid) => (projects[pid].lines || []).forEach((l) => {
      if (!l.priceId || !has(l.price) || !(num(l.priceStd) > 0)) return;
      (corr[l.priceId] = corr[l.priceId] || []).push(num(l.price) / num(l.priceStd));
    }));
    const out = {};
    Object.keys(prices || {}).forEach((id) => {
      const ss = samples[id] || [], cs = corr[id] || [];
      const o = { n: 0, cost: 0, min: 0, max: 0, last: 0, suggestedStd: 0, corrN: cs.length, corrAvg: cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : 0, vendors: [] };
      if (ss.length) {
        const sorted = ss.map((s) => s.u).sort((a, b) => a - b);
        const med = sorted[Math.floor(sorted.length / 2)];
        const ok = ss.filter((s) => s.u >= med / 2 && s.u <= med * 2);
        let w = 0, sum = 0;
        ok.forEach((s) => { const ww = Math.pow(0.5, Math.max(0, now - s.t) / 86400000 / S.halfLifeDays); w += ww; sum += ww * s.u; });
        o.n = ok.length; o.excluded = ss.length - ok.length;
        o.cost = Math.round(sum / w);
        o.min = Math.min.apply(null, ok.map((s) => s.u)); o.max = Math.max.apply(null, ok.map((s) => s.u));
        o.last = Math.max.apply(null, ok.map((s) => s.t));
        o.vendors = Array.from(new Set(ok.map((s) => s.vendor).filter(Boolean)));
        o.suggestedStd = ceilTo(o.cost / (1 - S.targetMargin), 100);
      }
      out[id] = o;
    });
    return out;
  }

  // ---------- ④ 請求書・仕入見積の文字から明細を拾う ----------
  const UNITS = ["㎡", "㎥", "m", "本", "枚", "箇所", "ヶ所", "ケ所", "カ所", "か所", "式", "人工", "人", "台", "個", "セット", "組", "坪", "kg", "缶", "巻", "袋", "日", "回", "枚", "ロール", "ケース", "箱", "丁", "脚", "基", "ｍ", "M"];
  const SKIP = /(小計|合計|総額|消費税|税込|税抜|御請求|ご請求|請求金額|振込|口座|銀行|支店|TEL|FAX|電話|〒|登録番号|インボイス|ページ|御見積総金額|御見積金額|製品代計|前回|今回|繰越|入金)/i;
  function normText(t) {
    return String(t || "")
      .replace(/㎡|m²|m2(?![0-9])/g, " \uE001 ").replace(/㎥|m³|m3(?![0-9])/g, " \uE002 ") // NFKC で ㎡→m2 にならないよう退避
      .normalize("NFKC")
      .replace(/\uE001/g, "㎡").replace(/\uE002/g, "㎥")
      .replace(/([\u3000-\u9fff\uff00-\uffef])[ \t\u3000]+(?=[\u3000-\u9fff\uff00-\uffef])/g, "$1") // OCR が日本語の間に入れる空白を詰める（改行は残す）
      .replace(/[¥￥\\]/g, " ")
      .replace(/(\d),(?=\d{3}(\D|$))/g, "$1")
      .replace(/[ \t]+/g, " ");
  }
  function parseDocText(text, ownName) {
    const lines = normText(text).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const res = { vendor: "", date: "", total: 0, lines: [] };
    const own = ownName ? normText(ownName).replace(/\s/g, "") : "";
    let ctx = "";
    lines.forEach((ln) => {
      const flat = ln.replace(/\s/g, "");
      const hd = ln.match(/^【\s*([^】]+?)\s*】/);
      if (hd && !/\d{3,}\s*$/.test(ln)) { ctx = /工事|特注|材料/.test(hd[1]) && hd[1].length < 6 ? "" : hd[1].replace(/\s+/g, " "); return; }
      if (/^[･・.\-=＊*]{6,}/.test(flat) || /^＊?\*?小計/.test(flat)) { if (!/^＊?\*?小計/.test(flat)) ctx = ""; return; }
      if (!res.vendor && /(株式会社|有限会社|合同会社|\(株\)|\(有\)|㈱|㈲|工業|工務店|設備|電気|建材|住器)/.test(flat) && !(own && flat.indexOf(own) >= 0) && !/御中|様/.test(flat))
        res.vendor = ln.replace(/^(請求元|発行元|会社名)[:：]?/, "").replace(/^\([^)]*\)\s*/, "").trim();
      if (!res.date) {
        let mt = flat.match(/(20\d{2})[年\/.-](\d{1,2})[月\/.-](\d{1,2})/);
        if (mt) res.date = `${mt[1]}-${String(mt[2]).padStart(2, "0")}-${String(mt[3]).padStart(2, "0")}`;
        else if ((mt = flat.match(/令和(\d{1,2}|元)年(\d{1,2})月(\d{1,2})日/))) {
          const y = 2018 + (mt[1] === "元" ? 1 : +mt[1]);
          res.date = `${y}-${String(mt[2]).padStart(2, "0")}-${String(mt[3]).padStart(2, "0")}`;
        }
      }
      if (/(御請求金額|ご請求金額|請求金額|合計|総額)/.test(flat)) {
        const ns = (ln.match(/\d+(\.\d+)?/g) || []).map(Number).filter((n) => n >= 100);
        if (ns.length) res.total = Math.max(res.total, ns[ns.length - 1]);
      }
      if (SKIP.test(flat)) return;
      const item = parseItemLine(ln);
      if (item) { if (ctx && item.name.indexOf(ctx) < 0) item.name = ctx + " " + item.name; res.lines.push(item); }
    });
    return res;
  }
  // 1行から「名称 … 数量 単位 単価 金額 (上代)」を推定。行末に並ぶ数字の列だけを数字として扱い（品名の「2枚建」などは名称）、
  // その中で 数量×単価≒金額 になる組を探す
  const GAP_RE = new RegExp("^(?:[\\s@×x円/]|" + UNITS.join("|") + ")*$"); // 数字の間にあってよいのは空白・単位・記号だけ
  const unitIn = (seg) => { const u = UNITS.find((u) => seg.indexOf(u) >= 0); return u ? u.replace(/ヶ所|ケ所|カ所|か所/, "箇所").replace(/^ｍ$|^M$/, "m") : ""; };
  function parseItemLine(ln) {
    const all = [];
    const re = /-?\d+(?:\.\d+)?/g; let mt;
    while ((mt = re.exec(ln))) all.push({ v: Number(mt[0]), i: mt.index, e: mt.index + mt[0].length });
    if (!all.length || !GAP_RE.test(ln.slice(all[all.length - 1].e))) return null;
    let st = all.length - 1;
    while (st > 0 && GAP_RE.test(ln.slice(all[st - 1].e, all[st].i))) st--;
    const toks = all.slice(st);
    let name = ln.slice(0, toks[0].i).replace(/^\d+[\s.)]+/, "").replace(/^[\s\-・*★【\[]+|[\s:：]+$/g, "").trim();
    let nameUnit = "";
    const su = name.match(/[\/／](ヶ所|ケ所|カ所|箇所|式|本|枚|台|個|セット|㎡|m)$/);
    if (su) { nameUnit = unitIn(su[1]); name = name.slice(0, su.index).trim(); }
    // 名称は日本語を含むか、英字3文字以上（"P1:567mm" のような注記行を除く）
    if (!name || !(/[\u3040-\u9fff]/.test(name) || /[A-Za-z]{3,}/.test(name))) return null;
    const n = toks.length;
    for (let back = 0; back <= Math.min(1, n - 3); back++) {
      const k = n - 1 - back, amount = toks[k].v;
      if (amount <= 0) continue;
      for (let j = k - 1; j >= 1; j--) for (let i = j - 1; i >= 0; i--) {
        const q = toks[i].v, p = toks[j].v;
        if (q > 0 && p > 0 && Math.abs(q * p - amount) <= Math.max(1, amount * 0.01)) {
          const unit = unitIn(ln.slice(toks[i].e, toks[j].i)) || nameUnit || unitIn(ln.slice(toks[i].e)) || "式";
          return { name, qty: q, unit, unitPrice: p, amount, listPrice: back ? toks[n - 1].v : 0 };
        }
      }
    }
    // 組が見つからない：「金額」だけ、または「数量 金額」の行（"741 848" のような寸法だけの行は除く）
    const last = toks[n - 1].v, q0 = n === 2 ? toks[0].v : 1;
    if (last >= 100 && (n === 1 || (n === 2 && q0 > 0 && q0 <= 100)))
      return { name, qty: q0, unit: nameUnit || unitIn(ln.slice(toks[0].i)) || "式", unitPrice: Math.round((last / q0) * 100) / 100, amount: last, listPrice: 0, guess: true };
    return null;
  }

  // 名称の近さ（2文字ずつの一致率）で単価表の項目を推定
  // 表記ゆれをそろえる（貼り→張り、ビニール・材工などの飾りを外す）
  function canon(s) { return normText(s).replace(/貼/g, "張").replace(/ビニール|材工共?|材工|手間|工事|取付け?|取り付け/g, "").replace(/ダウンライト|DL/g, "照明").replace(/[\s・\-()（）]/g, ""); }
  function bigrams(s) { const t = canon(s); const o = []; for (let i = 0; i < t.length - 1; i++) o.push(t.slice(i, i + 2)); return o.length ? o : [t]; }
  function similarity(a, b) {
    const A = bigrams(a), B = bigrams(b); let hit = 0; const pool = B.slice();
    A.forEach((g) => { const i = pool.indexOf(g); if (i >= 0) { hit++; pool.splice(i, 1); } });
    return (2 * hit) / (A.length + B.length);
  }
  function matchPrice(name, prices) {
    let best = "", bs = 0;
    Object.keys(prices || {}).forEach((id) => {
      const p = prices[id];
      const s = Math.max(similarity(name, p.name), similarity(name, p.name + p.spec) * 0.95);
      if (s > bs) { bs = s; best = id; }
    });
    return bs >= 0.4 ? { id: best, score: bs } : { id: "", score: bs };
  }

  // ---------- ① 図面の文字から縮尺・部屋（帖数）を読み取る ----------
  function detectScale(text) {
    const t = normText(text);
    const m = t.match(/(?:S|縮尺|SCALE)\s*[=:]?\s*1\s*[\/:]\s*(\d{2,3})/i) || t.match(/\b1\s*\/\s*(50|100|200|30|20)\b/);
    return m ? +m[1] : 0;
  }
  const ROOM_RE = /(LDK|LD|DK|リビング|ダイニング|キッチン|台所|居間|主寝室|寝室|子供室|子ども室|洋室\d*|和室\d*|書斎|納戸|WIC|SIC|WCL|クローゼット|収納|玄関|ホール|廊下|洗面脱衣室?|洗面所|洗面室?|脱衣室?|浴室|トイレ|便所|WC|パントリー|ユーティリティ|家事室|応接室|仏間|事務所|店舗)/;
  // items: [{str, x, y}]（px）。部屋名と、近くの「◯帖/畳/J」を組にする
  function detectRooms(items) {
    const its = items.map((it) => ({ s: normText(it.str).trim(), x: it.x, y: it.y })).filter((it) => it.s);
    const names = [], jos = [];
    its.forEach((it) => {
      const nm = it.s.match(ROOM_RE), jo = it.s.match(/(\d+(?:\.\d+)?)\s*(帖|畳|J|j|帖半)/);
      if (nm) names.push({ name: nm[1], x: it.x, y: it.y, jo: jo ? +jo[1] + (/帖半/.test(it.s) ? 0.5 : 0) : 0 });
      else if (jo) jos.push({ jo: +jo[1], x: it.x, y: it.y, used: false });
    });
    const xs = its.map((i) => i.x), ys = its.map((i) => i.y);
    const span = Math.max(1, Math.max.apply(null, xs.concat([1])) - Math.min.apply(null, xs.concat([0])), Math.max.apply(null, ys.concat([1])) - Math.min.apply(null, ys.concat([0])));
    names.forEach((n) => {
      if (n.jo) return;
      let best = null, bd = span * 0.06;
      jos.forEach((j) => { if (j.used) return; const d = Math.hypot(j.x - n.x, (j.y - n.y) * 1.5); if (d < bd) { bd = d; best = j; } });
      if (best) { best.used = true; n.jo = best.jo; }
    });
    return names.filter((n) => n.jo > 0).map((n) => ({ name: n.name, jo: n.jo, area: r2(n.jo * JO_M2), x: n.x, y: n.y }));
  }

  // ---------- 仕入見積の明細 → 見積行（原価＝仕切、売価＝上代×掛率 か 原価÷(1−目標粗利率)） ----------
  function supplierLine(it, settings, koushu) {
    const S = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const cost = num(it.unitPrice);
    const std = it.listPrice && S.listRate > 0 ? ceilTo((num(it.listPrice) / Math.max(1, num(it.qty))) * S.listRate, 10) : ceilTo(cost / (1 - S.targetMargin), 10);
    return newLine({ koushu: koushu || "その他", name: it.name, unit: it.unit || "式", qtyAuto: num(it.qty) || 1, priceStd: std, costStd: cost, listPrice: num(it.listPrice), src: "仕入見積" });
  }

  // ---------- 契約書：印紙税（参考） ----------
  // 建設工事の請負契約書。消費税額が区分記載されていれば税抜の工事価格で判定。
  // 軽減措置（平成26年4月1日〜令和9年3月31日に作成する契約書）と本則。[上限額, 税額]
  const STAMP_REDUCED = [[9999, 0], [2000000, 200], [3000000, 500], [5000000, 1000], [10000000, 5000], [50000000, 10000], [100000000, 30000], [500000000, 60000], [1000000000, 160000], [5000000000, 320000], [Infinity, 480000]];
  const STAMP_BASE = [[9999, 0], [1000000, 200], [2000000, 400], [3000000, 1000], [5000000, 2000], [10000000, 10000], [50000000, 20000], [100000000, 60000], [500000000, 100000], [1000000000, 200000], [5000000000, 400000], [Infinity, 600000]];
  function stampDuty(net, dateStr) {
    const reduced = !dateStr || dateStr <= "2027-03-31";
    const t = reduced ? STAMP_REDUCED : STAMP_BASE;
    for (const [max, tax] of t) if (num(net) <= max) return { tax, reduced };
    return { tax: 0, reduced };
  }

  // ---------- 請求書：区分ごとの金額 ----------
  // 契約金・中間金は 税抜×割合（四捨五入）、消費税は切り捨て。完成金は残り全部（端数の差をここで吸収）。
  const BILL_KINDS = ["契約金", "中間金", "完成金", "全額", "追加・その他"];
  function billStages(project, settings) {
    const c = calc(project, settings);
    const pay = (project.pay || [0.3, 0.4, 0.3]).map(num);
    const n1 = Math.round(c.net * pay[0]), n2 = Math.round(c.net * pay[1]);
    const t1 = Math.floor(n1 * c.taxRate), t2 = Math.floor(n2 * c.taxRate);
    const st = {
      契約金: { rate: pay[0], net: n1, tax: t1 },
      中間金: { rate: pay[1], net: n2, tax: t2 },
      完成金: { rate: pay[2], net: c.net - n1 - n2, tax: c.tax - t1 - t2 },
      全額: { rate: 1, net: c.net, tax: c.tax }
    };
    Object.keys(st).forEach((k) => (st[k].total = st[k].net + st[k].tax));
    return { stages: st, calc: c, payOk: Math.abs(pay[0] + pay[1] + pay[2] - 1) < 0.0001 };
  }
  // 1枚の請求書の金額（追加・その他は手入力の税抜額）
  function billAmount(bill, project, settings) {
    const b = billStages(project, settings);
    if (bill.kind === "追加・その他") {
      const net = Math.round(num(bill.net)), tax = Math.floor(net * b.calc.taxRate);
      return { net, tax, total: net + tax, rate: 0 };
    }
    return b.stages[bill.kind] || b.stages["全額"];
  }

  const API = { KOUSHU, stampDuty, BILL_KINDS, billStages, billAmount, DEFAULT_SETTINGS, AUTO_KEYS, PT_KINDS, JO_M2, defaultPrices, uid, r2, ceilTo, num, has,
    polyArea, polyLen, readDrawing, measure, autoQty, autoLines, newLine, sortLines,
    lineQty, lineCost, unitPrice, calc, solveRate, actuals, learn, parseDocText, parseItemLine, normText, similarity, matchPrice,
    detectScale, detectRooms, supplierLine };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else G.MQ = API;
})(typeof window !== "undefined" ? window : this);
