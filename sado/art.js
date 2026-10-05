// ===== 茶の湯みち：絵（SVG） =====
// 道具・人物・まっちゃん（案内役の茶碗）・お菓子・茶花・茶室・歩き方ステージの盤面の絵。
// どれも 100×100（茶室は 360×230、盤面は 316×356）の座標で描く。
// 文字は入れない（フリガナの対象外にするため・小さく表示しても読めるように）。
// 作法の動画では o.anim が true になり、SVG の animate で人や道具が動く。

const ART = (function () {
  const svg = (body, vb) => `<svg viewBox="${vb || '0 0 100 100'}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
  // 100×100 で描いた絵を、中心(50,50)が (x,y) に来るよう s 倍で置く
  const place = (body, x, y, s, rot) => `<g transform="translate(${x},${y})${rot ? ` rotate(${rot})` : ''} scale(${s}) translate(-50,-50)">${body}</g>`;
  // 原点中心で描いた部品を (x,y) に s 倍で置く
  const at = (x, y, s, body, rot) => `<g transform="translate(${x},${y})${rot ? ` rotate(${rot})` : ''} scale(${s})">${body}</g>`;
  const flip = (body) => `<g transform="translate(100,0) scale(-1,1)">${body}</g>`;
  const SKIN = '#f6d9bf', HAIR = '#2b2622', GUEST = '#e98ca0', ARROW = '#e0603e', FUKUSA = '#6b3a7a', BLUSH = '#f4a3a8';
  const GUEST_M = '#5f86b0', HAKAMA = '#6f6a62', FUKUSA_F = '#d0503a';
  // 男手前／女手前（人物の髪・袴・帛紗の色が変わる）。app.js が ART.setGender で切り替える
  let MALE = false;
  const schoolColor = (id) => (SCHOOLS[id] || SCHOOLS.ura).color;
  const n1 = (v) => v.toFixed(1);

  // ---------- 動き（作法の動画用） ----------
  const tr = (type, values, dur) => `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}s" repeatCount="indefinite"/>`;
  const MOVE = {
    float: tr('translate', '0 0;0 -3;0 0', 2.4),
    lift: tr('translate', '0 5;0 -4;0 -4;0 5', 2.8),
    slideR: tr('translate', '0 0;14 0;14 0;0 0', 3),
    slideL: tr('translate', '0 0;-14 0;-14 0;0 0', 3),
    sway: tr('translate', '-5 0;5 0;-5 0', 0.6),
    wipe: tr('translate', '0 0;-14 5;0 0', 1.6),
    poke: tr('translate', '0 0;-5 9;0 0', 1.8),
    drop: tr('translate', '0 -8;0 4', 1.2),
    turnCW: tr('rotate', '0;90;90', 3),
    turnCCW: tr('rotate', '0;-90;-90', 3),
    pulse: '<animate attributeName="opacity" values="1;.3;1" dur="1.4s" repeatCount="indefinite"/>',
  };
  const an = (o, kind, body) => (o && o.anim ? `<g>${MOVE[kind]}${body}</g>` : body);

  // 決まった並びの点々（泡・粉など）
  function dots(n, col, r, spread, seed) {
    let x = seed || 7, s = '';
    const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * spread;
      s += `<circle cx="${n1(Math.cos(a) * d)}" cy="${n1(Math.sin(a) * d)}" r="${n1(r * (0.6 + rnd() * 0.8))}" fill="${col}"/>`;
    }
    return s;
  }
  // 梅の花の形（茶碗の正面の印・練り切りにも使う）
  function ume(x, y, r, c, ctr) {
    let s = '';
    for (let k = 0; k < 5; k++) {
      const a = (k * 72 - 90) * Math.PI / 180;
      s += `<circle cx="${n1(x + Math.cos(a) * r * .8)}" cy="${n1(y + Math.sin(a) * r * .8)}" r="${n1(r * .55)}" fill="${c}"/>`;
    }
    return s + `<circle cx="${x}" cy="${y}" r="${n1(r * .35)}" fill="${ctr || '#c9a23a'}"/>`;
  }
  // 花びら n 枚の花
  function fl(cx, cy, r, col, ctr, n) {
    n = n || 5;
    let s = '';
    for (let k = 0; k < n; k++) s += `<ellipse cx="${n1(r * .55)}" cy="0" rx="${n1(r * .55)}" ry="${n1(r * .4)}" fill="${col}" transform="translate(${cx},${cy}) rotate(${k * 360 / n - 90})"/>`;
    return s + `<circle cx="${cx}" cy="${cy}" r="${n1(r * .28)}" fill="${ctr || '#e3c03a'}"/>`;
  }
  const leaf = (x, y, len, ang, col) => `<path d="M0,0 Q${n1(len * .5)},${n1(-len * .3)} ${len},0 Q${n1(len * .5)},${n1(len * .3)} 0,0 Z" fill="${col || '#4e7a3a'}" transform="translate(${x},${y}) rotate(${ang})"/>`;
  const stem = (d, col, w) => `<path d="${d}" stroke="${col || '#4e7a3a'}" stroke-width="${w || 1.8}" fill="none" stroke-linecap="round"/>`;
  const sparkle = (x, y, s, c) => `<path d="M${x},${y - s} Q${n1(x + s * .2)},${n1(y - s * .2)} ${x + s},${y} Q${n1(x + s * .2)},${n1(y + s * .2)} ${x},${y + s} Q${n1(x - s * .2)},${n1(y + s * .2)} ${x - s},${y} Q${n1(x - s * .2)},${n1(y - s * .2)} ${x},${y - s} Z" fill="${c || '#f6c84b'}"/>`;
  const floor = '<rect x="0" y="92" width="100" height="8" fill="#d6c690"/>';
  const steam = (x, y, o) => `<path d="M${x},${y} q-4,-6 0,-12 q4,-6 0,-12" stroke="#b9b2a5" fill="none" stroke-width="1.6" opacity=".8">${o && o.anim ? '<animate attributeName="opacity" values=".1;.9;.1" dur="2.2s" repeatCount="indefinite"/>' : ''}</path>`;
  const stream = (d, o) => `<path d="${d}" stroke="#9cc9d6" stroke-width="3" fill="none" stroke-linecap="round"${o && o.anim ? ' stroke-dasharray="5 4"><animate attributeName="stroke-dashoffset" values="9;0" dur=".35s" repeatCount="indefinite"/></path>' : '/>'}`;

  // 矢印（円弧・横）
  function arcArrow(r, a0, a1, col) {
    const rad = (d) => d * Math.PI / 180, P = (d) => [r * Math.cos(rad(d)), r * Math.sin(rad(d))];
    const [x0, y0] = P(a0), [x1, y1] = P(a1), cw = a1 > a0;
    const tx = cw ? -Math.sin(rad(a1)) : Math.sin(rad(a1)), ty = cw ? Math.cos(rad(a1)) : -Math.cos(rad(a1));
    const nx = Math.cos(rad(a1)), ny = Math.sin(rad(a1));
    const f = (x, y) => `${n1(x)},${n1(y)}`;
    return `<path d="M${f(x0, y0)} A${r},${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${cw ? 1 : 0} ${f(x1, y1)}" fill="none" stroke="${col || ARROW}" stroke-width="3.2" stroke-linecap="round"/>`
      + `<path d="M${f(x1 + tx * 7, y1 + ty * 7)} L${f(x1 + nx * 5, y1 + ny * 5)} L${f(x1 - nx * 5, y1 - ny * 5)} Z" fill="${col || ARROW}"/>`;
  }
  function arrowH(x1, x2, y, col) {
    const d = x2 > x1 ? 1 : -1;
    return `<line x1="${x1}" y1="${y}" x2="${x2 - d * 6}" y2="${y}" stroke="${col || ARROW}" stroke-width="3.6" stroke-linecap="round"/><path d="M${x2},${y} L${x2 - d * 10},${y - 6.5} L${x2 - d * 10},${y + 6.5} Z" fill="${col || ARROW}"/>`;
  }
  const swish = (d) => `<path d="${d}" stroke="#8a7a5c" stroke-width="1.6" fill="none" stroke-dasharray="3 3" stroke-linecap="round"/>`;

  // ---------- 茶碗 ----------
  const TEA = { usucha: '#7aa23a', koicha: '#3d5a1e', empty: '#4a3f38' };
  // 横から見た茶碗（原点中心）。mark: 正面の印の位置 'left' | 'right' | 'center'
  function bowlBody(shape, tea, mark) {
    const t = TEA[tea || 'usucha'];
    let b;
    if (shape === 'tsutsu') b = `<path d="M-20,-30 L20,-30 L18,14 Q0,20 -18,14 Z" fill="#6b4a3a"/><ellipse cx="0" cy="-30" rx="20" ry="5" fill="${t}"/><ellipse cx="0" cy="-30" rx="20" ry="5" fill="none" stroke="#3d2a20" stroke-width="2"/><rect x="-9" y="14" width="18" height="6" rx="2" fill="#4d3428"/><path d="M-12,-22 L-11,8" stroke="#ffffff30" stroke-width="3" stroke-linecap="round"/>`;
    else if (shape === 'hira') b = `<path d="M-34,-10 L34,-10 Q30,10 0,12 Q-30,10 -34,-10 Z" fill="#c9b48a"/><ellipse cx="0" cy="-10" rx="34" ry="6" fill="${t}"/><ellipse cx="0" cy="-10" rx="34" ry="6" fill="none" stroke="#8e7650" stroke-width="2"/><rect x="-10" y="11" width="20" height="5" rx="2" fill="#a68f66"/><path d="M-24,-3 Q-12,4 0,4" stroke="#ffffff50" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    else b = `<path d="M-28,-18 L28,-18 Q26,12 0,16 Q-26,12 -28,-18 Z" fill="#2f2a28"/><ellipse cx="0" cy="-18" rx="28" ry="6" fill="${t}"/><ellipse cx="0" cy="-18" rx="28" ry="6" fill="none" stroke="#1d1a19" stroke-width="2"/><path d="M-20,-6 Q-6,0 4,-8" stroke="#6d5c4f" stroke-width="2" fill="none" opacity=".6"/><path d="M-19,-11 Q-17,2 -9,8" stroke="#ffffff2e" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="-10" y="14" width="20" height="6" rx="2" fill="#1d1a19"/>`;
    if (mark) b += ume(mark === 'left' ? -17 : mark === 'right' ? 17 : 0, -2, 4, '#f7d6dc', '#e0603e');
    return b;
  }
  const bowl = (shape, x, y, s, tea, mark) => at(x, y, s || 1, bowlBody(shape, tea, mark));

  // 上から見た茶碗（原点中心・半径31）。kind: full / mikazuki / koicha / empty
  function bowlTop(kind, mark) {
    let s = '<circle r="31" fill="#2f2a28"/><circle r="31" fill="none" stroke="#1d1a19" stroke-width="2"/><circle r="25.5" fill="#3a3330"/>';
    if (kind === 'full') s += '<circle r="24" fill="#c5d77c"/>' + dots(34, '#e4edb8', 1.4, 21, 11);
    else if (kind === 'mikazuki') s += '<circle r="24" fill="#c5d77c"/>' + dots(22, '#e4edb8', 1.3, 21, 5) + '<path d="M-20.8,-12 A24,24 0 0 1 20.8,-12 A45.8,45.8 0 0 0 -20.8,-12 Z" fill="#5f8a2a"/>';
    else if (kind === 'koicha') s += '<circle r="24" fill="#3d5a1e"/><ellipse cx="-7" cy="-9" rx="9" ry="4" fill="#ffffff2a" transform="rotate(-25)"/>';
    else s += '<circle r="24" fill="#4a3f38"/>';
    if (mark) s += ume(0, 28, 3.4, '#f7d6dc', '#e0603e');
    return s;
  }

  // ---------- 質感（グラデーションと影） ----------
  // 同じ絵がページに何度も出るので、グラデーションの id は呼ぶたびに新しくする
  let gidN = 0;
  const stopsSvg = (stops) => stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('');
  // 線形グラデーション。向きは 0〜1 の (x1,y1)→(x2,y2)。省略すると左→右
  function gLin(stops, x1, y1, x2, y2) {
    const id = `gl${++gidN}`;
    return { url: `url(#${id})`, def: `<linearGradient id="${id}" x1="${x1 || 0}" y1="${y1 || 0}" x2="${x2 === undefined ? 1 : x2}" y2="${y2 || 0}">${stopsSvg(stops)}</linearGradient>` };
  }
  // 絵の座標で向きを決める線形グラデーション（斜めに置いた細長い道具の、幅の方向の陰影に使う）
  function gLinU(stops, x1, y1, x2, y2) {
    const id = `gu${++gidN}`;
    return { url: `url(#${id})`, def: `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}">${stopsSvg(stops)}</linearGradient>` };
  }
  // 放射グラデーション。中心 (cx,cy) と半径 r は 0〜1
  function gRad(stops, cx, cy, r) {
    const id = `gr${++gidN}`;
    return { url: `url(#${id})`, def: `<radialGradient id="${id}" cx="${cx === undefined ? .5 : cx}" cy="${cy === undefined ? .5 : cy}" r="${r === undefined ? .5 : r}">${stopsSvg(stops)}</radialGradient>` };
  }
  const gDefs = (...g) => `<defs>${g.map((x) => x.def).join('')}</defs>`;
  // 置いた道具の下のやわらかい影
  const shade = (cx, cy, rx, ry, a) => { const k = a || .3, g = gRad([[0, '#000', k], [.55, '#000', k * .5], [1, '#000', 0]]); return gDefs(g) + `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${g.url}"/>`; };
  // つやの筋
  const gloss = (d, w, a) => `<path d="${d}" stroke="#fff" stroke-width="${w || 2.4}" stroke-linecap="round" fill="none" opacity="${a || .22}"/>`;

  // ---------- 道具（100×100） ----------
  // 釜（真形の鉄釜）。肌に霰（あられ）、両脇に鐶付、蓋は唐銅。wing は羽のある釜（透木釜）
  function kama(x, y, s, wing) {
    const iron = gLin([[0, '#151413'], [.2, '#3b3936'], [.36, '#5a5652'], [.55, '#2e2c2a'], [.85, '#121110'], [1, '#1d1b1a']]);
    const lid = gLin([[0, '#4e3f2a'], [.45, '#9a8358'], [.7, '#6e5a3c'], [1, '#3b301f']]);
    let ar = '';
    for (let r = 0; r < 3; r++) for (let i = -6; i <= 6; i++) {
      const ax = i * 4 + (r % 2 ? 2 : 0), ay = -9 + r * 4.4;
      if (Math.abs(ax) <= 21 - r * 1.5) ar += `<circle cx="${ax}" cy="${n1(ay)}" r="1" fill="#100f0e"/><circle cx="${n1(ax - .35)}" cy="${n1(ay - .4)}" r=".45" fill="#9a948d" opacity=".55"/>`;
    }
    return `<g transform="translate(${x},${y}) scale(${s || 1})">${gDefs(iron, lid)}`
      + (wing ? '<ellipse cx="0" cy="6.5" rx="34" ry="5" fill="#141313"/><ellipse cx="0" cy="5.5" rx="33.5" ry="4" fill="#3a3734"/>' : '')
      + `<path d="M-26,-6 Q-30,22 0,24 Q30,22 26,-6 Q20,-16 0,-16 Q-20,-16 -26,-6 Z" fill="${iron.url}"/>` + ar
      + '<path d="M-25.5,3 Q0,9 25.5,3" stroke="#000" stroke-width="1.1" opacity=".4" fill="none"/><path d="M-23,15 Q0,23 23,15" stroke="#000" stroke-width="5" opacity=".18" fill="none"/>'
      + '<rect x="-30.5" y="-4" width="5.5" height="8" rx="2.2" fill="#2a2826"/><rect x="25" y="-4" width="5.5" height="8" rx="2.2" fill="#2a2826"/>'
      + '<rect x="-29.5" y="-3" width="2" height="3" rx="1" fill="#6b6762" opacity=".6"/><rect x="26" y="-3" width="2" height="3" rx="1" fill="#6b6762" opacity=".6"/>'
      + `<ellipse cx="0" cy="-14" rx="13.5" ry="4.2" fill="${lid.url}"/><ellipse cx="0" cy="-14.8" rx="11" ry="2.6" fill="#b49a6a" opacity=".35"/>`
      + '<path d="M-2.6,-16 Q-2.6,-20.5 0,-20.5 Q2.6,-20.5 2.6,-16 Z" fill="#5c4a30"/><circle cx="-.9" cy="-19" r=".9" fill="#d9c49a" opacity=".7"/>'
      + gloss('M-18,-8 Q-21.5,4 -15,15', 2.6, .13) + '</g>';
  }
  // 茶筅：竹を細く割った穂。外穂は外へふくらんで先が内へ巻き、中に内穂。根元を糸で編み、下が持ち手
  const CH = {
    shira: { lt: '#f3ead0', md: '#d9c79a', dk: '#a8935f', h: ['#a8915c', '#efe2bb', '#cdb985'] },
    susu: { lt: '#c99a63', md: '#8e623a', dk: '#5a391d', h: ['#4e3218', '#a77548', '#6e4826'] },
  };
  function chasenBody(kind) {
    const c = CH[kind] || CH.shira;
    const hd = gLin([[0, c.h[0]], [.45, c.h[1]], [1, c.h[2]]]);
    const tine = (o, sx, col, w, op) => { const X = (k) => n1(50 + o * k * sx); return `<path d="M${X(6.5)},57 C${X(15.5)},50 ${X(22.5)},37 ${X(20.5)},27 C${X(19)},19.5 ${X(13.5)},14.5 ${X(9)},17.5" stroke="${col}" stroke-width="${w}" fill="none" opacity="${op}"/>`; };
    let s = gDefs(hd) + shade(50, 90, 12, 2.4, .25);
    for (let i = 0; i <= 26; i++) s += tine(i / 13 - 1, .9, c.dk, .9, .9);   // 外穂の奥側
    for (let i = 0; i <= 12; i++) { const o = i / 6 - 1; s += `<path d="M${n1(50 + o * 5)},57 C${n1(50 + o * 5.5)},44 ${n1(50 + o * 5)},32 ${n1(50 + o * 3.5)},23" stroke="${i % 2 ? c.md : c.lt}" stroke-width=".9" fill="none"/>`; }   // 内穂
    for (let i = 0; i <= 30; i++) s += tine(i / 15 - 1, 1, i % 3 === 0 ? c.md : c.lt, 1, 1);   // 外穂の手前側
    return s + '<path d="M42.5,55 Q50,57 57.5,55 L57.5,60.5 Q50,62.5 42.5,60.5 Z" fill="#1b1714"/><path d="M42.8,56.6 Q50,58.4 57.2,56.6" stroke="#5a5048" stroke-width=".6" fill="none"/>'
      + `<path d="M43,60.5 Q50,62.5 57,60.5 L57,87.5 Q50,90.5 43,87.5 Z" fill="${hd.url}"/>`
      + `<path d="M43,82.2 Q50,84.2 57,82.2" stroke="${c.dk}" stroke-width="1" fill="none"/><path d="M43,83.4 Q50,85.4 57,83.4" stroke="#fff" stroke-width=".5" opacity=".35" fill="none"/>`
      + `<ellipse cx="50" cy="88" rx="7" ry="1.6" fill="${c.dk}" opacity=".5"/>`;
  }
  // 主菓子（練り切り・薯蕷饅頭など）。上から光が当たったように
  const sweetP = (c) => {
    const hi = gRad([[0, '#fff', .7], [1, '#fff', 0]], .38, .3, .55), lo = gRad([[0, '#000', 0], [.68, '#000', 0], [1, '#000', .24]], .5, .38, .62);
    return gDefs(hi, lo) + `<ellipse cx="0" cy="0" rx="11" ry="7.5" fill="${c || '#f0b7c4'}"/><ellipse cx="0" cy="0" rx="11" ry="7.5" fill="${lo.url}"/><ellipse cx="-2" cy="-2" rx="7" ry="4" fill="${hi.url}"/>`
      + '<path d="M-5,-2.5 q5,-3.6 10,0" stroke="#fff" stroke-width=".9" fill="none" opacity=".55"/>';
  };
  // 菓子器（織部の菓子鉢）に主菓子を二つ。黒文字（箸）を一膳のせる。原点が中心
  const kashikiP = () => {
    const gz = gLin([[0, '#23422c'], [.35, '#4f8a5c'], [.65, '#3c7049'], [1, '#1d3825']]);
    const inside = gRad([[0, '#f6f1e3'], [.75, '#e6dcc4'], [1, '#c9bc9a']], .5, .4, .7);
    return gDefs(gz, inside) + '<ellipse cx="0" cy="11.5" rx="20" ry="2.4" fill="#000" opacity=".2"/><path d="M-8,9 L-7,12 L7,12 L8,9 Z" fill="#7a6447"/>'
      + `<path d="M-23.5,-5.5 Q-22.5,8 -6,10.2 L6,10.2 Q22.5,8 23.5,-5.5 Z" fill="${gz.url}"/>`
      + '<path d="M-3,-1 Q5,1 13,-1.5 L12,6.5 Q5,8.3 -2.5,6.8 Z" fill="#efe8d4"/><path d="M0,1 q3,2 6,0 M1,4 q3,1.6 6,-.4" stroke="#6b4a2a" stroke-width=".7" fill="none"/>'
      + `<ellipse cx="0" cy="-5.5" rx="23.5" ry="5.2" fill="#2f5a3a"/><ellipse cx="0" cy="-5.6" rx="21.6" ry="4.2" fill="${inside.url}"/>`
      + at(-7.5, -7.6, .62, sweetP('#f2b3c4')) + at(7.5, -8.2, .6, sweetP('#fbf7ef'))
      + '<g stroke-linecap="round" stroke-width="1.5"><line x1="-24.5" y1="-16" x2="23.5" y2="-9.5" stroke="#cdbf8f"/><line x1="-24.5" y1="-13.4" x2="23.5" y2="-6.9" stroke="#c4b583"/>'
      + '<line x1="-24.5" y1="-16" x2="-15" y2="-14.7" stroke="#5b4a2b"/><line x1="-24.5" y1="-13.4" x2="-15" y2="-12.1" stroke="#5b4a2b"/></g>';
  };
  // 懐紙＝真っ白な和紙を重ねて二つ折り（手前が折り目＝わ）。原点が中心
  const kaishiP = () => {
    const pp = gLin([[0, '#f3efe4'], [.6, '#fffefa'], [1, '#ece6d6']], 0, 0, 0, 1);
    return gDefs(pp) + '<rect x="-25" y="-12" width="50" height="28" rx="1.5" fill="#000" opacity=".12"/>'
      + '<rect x="-24" y="-11" width="48" height="26" rx="1" fill="#e6dfcd"/><rect x="-25" y="-13" width="48" height="26" rx="1" fill="#f3efe3"/>'
      + `<rect x="-26" y="-15" width="48" height="26" rx="1" fill="${pp.url}" stroke="#d8d0bc" stroke-width=".8"/>`
      + '<path d="M-26,10.2 L22,10.2" stroke="#cbc2ad" stroke-width="1.1"/><path d="M-26,9 L22,9" stroke="#fff" stroke-width=".6"/>'
      + '<g stroke="#e3dccb" stroke-width=".35" fill="none"><path d="M-20,-9 q6,2 12,0"/><path d="M-4,-4 q5,1.5 10,0"/><path d="M6,3 q4,1 8,0"/></g>';
  };
  // 帛紗（手順の絵）。色を渡さなければ、男手前は紫・女手前は朱
  const fukusaP = (c) => `<rect x="-20" y="-12" width="40" height="24" fill="${c || (MALE ? FUKUSA : FUKUSA_F)}"/><path d="M-20,-12 L0,2 L20,-12" stroke="#00000033" stroke-width="1.5" fill="none"/>`;
  function clothP(w, h, base, pat) {
    let s = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.5" fill="${base}"/>`;
    for (let yy = -h / 2 + 5; yy < h / 2 - 1; yy += 8) for (let xx = -w / 2 + 5; xx < w / 2 - 1; xx += 8) s += `<path d="M${xx},${yy - 2.2} L${xx + 2.2},${yy} L${xx},${yy + 2.2} L${xx - 2.2},${yy} Z" fill="${pat}"/>`;
    return s + `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.5" fill="none" stroke="#00000033"/>`;
  }
  // 濃茶で茶碗を受ける帛紗。古帛紗は小さく、出帛紗は帛紗と同じ大きさ。
  const dashiP = (kind) => kind === 'kobukusa' ? clothP(34, 30, '#2f4a6a', '#d8b24a') : clothP(58, 40, '#a8452e', '#e3c06a');
  // 斜めに置いた細長い道具（茶杓・柄杓の柄・扇子）の、点 A から B への向き
  const axisOf = (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy); return { dx, dy, nx: -dy / L, ny: dx / L, ang: n1(Math.atan2(dy, dx) * 180 / Math.PI) }; };

  // 図鑑・名前当ての一覧で、小さく見える道具の拡大率
  const ICON_ZOOM = { futaoki: 1.3, kogo: 1.25 };
  const TOOL = {
    // 黒楽茶碗：口縁はゆるやかに波打ち、少しすぼまった胴に、低い高台
    chawan: () => {
      const body = gLin([[0, '#3d3531'], [.16, '#1b1715'], [.42, '#2b2522'], [.6, '#141110'], [.86, '#0b0a09'], [1, '#221d1a']]);
      const inner = gLin([[0, '#5a4c43'], [.35, '#2a231f'], [.75, '#0e0c0b'], [1, '#1c1714']], 0, 0, 0, 1);
      const foot = gLin([[0, '#1d1714'], [.5, '#4a3a2e'], [1, '#18120e']]);
      const kase = gRad([[0, '#6b5444', .55], [1, '#6b5444', 0]]);
      return gDefs(body, inner, foot, kase) + shade(50, 87, 31, 4.2)
        + `<path d="M39,78 L40.5,85.6 Q50,88 59.5,85.6 L61,78 Z" fill="${foot.url}"/>`
        + `<path d="M15,40 C14,58 20,73 37,80 Q50,83 63,80 C80,73 86,58 85,40 Z" fill="${body.url}"/>`
        + `<ellipse cx="66" cy="62" rx="9" ry="6" fill="${kase.url}"/><ellipse cx="30" cy="70" rx="6" ry="4" fill="${kase.url}"/>`
        + '<path d="M15,40 Q23,33.6 33,32.2 Q42,30.6 50,31.4 Q60,30.4 68,32.4 Q78,34.2 85,40 Q68,49.4 50,49.6 Q32,49.4 15,40 Z" fill="#2e2724"/>'
        + `<path d="M18.6,40.2 Q26,35 34,33.8 Q42,32.6 50,33.2 Q59,32.4 67,34 Q75,35.4 81.4,40.2 Q66,47.4 50,47.6 Q34,47.4 18.6,40.2 Z" fill="${inner.url}"/>`
        + '<ellipse cx="50" cy="43.4" rx="8.5" ry="2.2" fill="#000" opacity=".45"/><path d="M24,38.5 Q37,34.6 50,34.4" stroke="#fff" stroke-width="1" fill="none" opacity=".18"/>'
        + gloss('M21.5,47 C21,58 24.5,67 32,74', 3, .16) + gloss('M75,46 C76.5,52 76,58 73.5,63', 1.6, .1)
        + '<circle cx="28" cy="52" r=".9" fill="#fff" opacity=".35"/><circle cx="58" cy="70" r=".7" fill="#fff" opacity=".2"/>';
    },
    chasen: (o) => chasenBody(o && o.chasen),
    // 茶杓：竹のへら。左下が櫂先（すくう所。少し反り上がる）、右上が切止、まん中に節
    chashaku: () => {
      const A = [15, 75], { dx, dy, nx, ny, ang } = axisOf(A, [87, 25]);
      const W = (t) => 1.25 * ((t < .035 ? 2.4 + t / .035 * 3.2 : t < .1 ? 5.6 + (t - .035) / .065 * 1.4 : t < .2 ? 7 - (t - .1) / .1 * 2.7 : 4.3 - (t - .2) * .8) + (Math.abs(t - .55) < .022 ? .8 : 0));
      const P = (t, k) => { const off = Math.sin(Math.PI * t) * 2.4 + W(t) / 2 * k; return [A[0] + dx * t + nx * off, A[1] + dy * t + ny * off]; };
      const ts = [...Array(61)].map((_, i) => i / 60), xy = (p) => `${n1(p[0])},${n1(p[1])}`;
      const outline = 'M' + ts.map((t) => P(t, 1)).concat(ts.slice().reverse().map((t) => P(t, -1))).map(xy).join(' L') + ' Z';
      const M = P(.5, 0);
      const g = gLinU([[0, '#4f331c'], [.28, '#94693d'], [.5, '#c39a62'], [.72, '#8a6036'], [1, '#4a301a']], M[0] - nx * 3, M[1] - ny * 3, M[0] + nx * 3, M[1] + ny * 3);
      const across = (t, col, w, op) => `<line x1="${n1(P(t, 1)[0])}" y1="${n1(P(t, 1)[1])}" x2="${n1(P(t, -1)[0])}" y2="${n1(P(t, -1)[1])}" stroke="${col}" stroke-width="${w}" opacity="${op}"/>`;
      const fib = (k) => 'M' + ts.filter((t) => t > .14).map((t) => P(t, k)).map(xy).join(' L');
      const rot = (p) => `transform="rotate(${ang} ${n1(p[0])} ${n1(p[1])})"`;
      const tip = P(.07, 0);
      return gDefs(g) + `<path d="${outline}" fill="#000" opacity=".16" transform="translate(1.4,2.2)"/><path d="${outline}" fill="${g.url}"/>`
        + `<path d="${fib(.35)}" stroke="#e8c995" stroke-width=".5" fill="none" opacity=".45"/><path d="${fib(-.4)}" stroke="#3a2412" stroke-width=".5" fill="none" opacity=".3"/>`
        + [.3, .42, .68, .8].map((t, i) => { const p = P(t, i % 2 ? .3 : -.2); return `<ellipse cx="${n1(p[0])}" cy="${n1(p[1])}" rx="${i % 2 ? 2.2 : 1.6}" ry=".9" ${rot(p)} fill="#3a2412" opacity=".28"/>`; }).join('')
        + across(.545, '#2e1c0e', 1.1, .8) + across(.558, '#f0d29a', .5, .6)
        + `<ellipse cx="${n1(tip[0])}" cy="${n1(tip[1])}" rx="4.6" ry="1.9" ${rot(tip)} fill="#2e1c0e" opacity=".3"/>`
        + `<ellipse cx="${n1(tip[0] - nx * .7)}" cy="${n1(tip[1] - ny * .7)}" rx="3.4" ry=".7" ${rot(tip)} fill="#f3d9a6" opacity=".5"/>`
        + across(.995, '#2e1c0e', 1, .6);
    },
    // 棗：黒の真塗り。肩から上が蓋。つやの映り込みと、金の蒔絵（秋草）
    natsume: () => {
      const body = gLin([[0, '#2c2826'], [.14, '#121010'], [.36, '#201c1a'], [.58, '#0b0a0a'], [.84, '#050505'], [1, '#171514']]);
      const lid = gRad([[0, '#4a4440'], [.45, '#1d1a18'], [1, '#080707']], .36, .25, .8);
      return gDefs(body, lid) + shade(50, 85, 29, 3.8)
        + `<path d="M22,47 C22,32 33,25 50,25 C67,25 78,32 78,47 L78,60 C78,75 66,83 50,83 C34,83 22,75 22,60 Z" fill="${body.url}"/>`
        + `<path d="M22,47 C22,32 33,25 50,25 C67,25 78,32 78,47 C65,51.2 35,51.2 22,47 Z" fill="${lid.url}"/>`
        + '<path d="M22.1,47.6 C35,51.8 65,51.8 77.9,47.6" stroke="#000" stroke-width="1.4" fill="none"/><path d="M22.4,49 C35,53.1 65,53.1 77.6,49" stroke="#fff" stroke-width=".5" fill="none" opacity=".18"/>'
        + gloss('M28.5,55 C28,63 30,71 35,76', 3.2, .17) + gloss('M30,41 C31.5,34.5 36,30.5 42.5,29', 2.4, .28)
        + '<circle cx="62" cy="30.5" r="1.4" fill="#fff" opacity=".35"/>'
        + '<g stroke="#c9a23a" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".9"><path d="M58,80 Q60,70 57,62"/><path d="M62,79 Q66,70 70,64"/><path d="M66,78 Q71,72 75,70"/><path d="M57,62 q-3,-2 -5,-1 M60,69 q4,-3 6,-2"/></g>'
        + '<g fill="#d9b44a"><circle cx="57" cy="61.5" r="1.3"/><circle cx="70.3" cy="63.5" r="1.1"/><circle cx="75.3" cy="69.6" r=".9"/><circle cx="52" cy="60.5" r=".8"/></g>';
    },
    // 茶入（肩衝）：茶褐色の釉が肩から流れ（なだれ）、裾は土見せ。蓋は象牙
    chaire: () => {
      const glaze = gLin([[0, '#2a170b'], [.2, '#6e3f1e'], [.42, '#9c6232'], [.62, '#61391b'], [1, '#22130a']]);
      const clay = gLin([[0, '#7a5a3e'], [.45, '#c4a07a'], [1, '#6e5036']]);
      const ivory = gLin([[0, '#d9cfb6'], [.5, '#fbf6ea'], [1, '#cfc4a8']]);
      return gDefs(glaze, clay, ivory) + shade(50, 87, 23, 3.4)
        + `<path d="M29,72 L30,82 Q50,87 70,82 L71,72 Z" fill="${clay.url}"/>`
        + `<path d="M42.5,31 L42,35 L28.5,38.5 Q26,40 26.4,44 L28.6,74 Q32,77 36,75 Q40,79 45,76 Q50,80 55,76.5 Q60,79 64,75 Q68,77 71.4,74 L73.6,44 Q74,40 71.5,38.5 L58,35 L57.5,31 Z" fill="${glaze.url}"/>`
        + '<path d="M40,36.5 Q38,48 39.5,58 Q40.5,66 37.5,72 Q35,76 38.5,77.5 Q42,76 41.5,70 Q41,62 43.5,52 Q45,44 44,36.8 Z" fill="#b8893f" opacity=".55"/>'
        + '<path d="M28.5,38.5 L71.5,38.5" stroke="#1a0d05" stroke-width=".8" opacity=".6"/>'
        + `<path d="M41.5,27.5 L42.5,31 L57.5,31 L58.5,27.5 Z" fill="${glaze.url}"/>`
        + `<rect x="40" y="23.6" width="20" height="3.6" rx="1.2" fill="${ivory.url}"/><ellipse cx="50" cy="23.8" rx="10" ry="1.6" fill="#fffaf0"/>`
        + gloss('M33,43 C32,53 33,63 34.5,70', 2.6, .22) + '<circle cx="64" cy="41.5" r="1.3" fill="#fff" opacity=".35"/>';
    },
    kama: () => kama(50, 54, 1.4),
    // 風炉（唐銅の鬼面風炉）に釜をかけたところ。下は敷板
    furo: () => {
      const br = gLin([[0, '#30251a'], [.18, '#6f5a3a'], [.38, '#a8905e'], [.56, '#6a5537'], [.82, '#3a2d1e'], [1, '#261d13']]);
      const board = gLin([[0, '#3a2c20'], [1, '#17110c']], 0, 0, 0, 1);
      const fire = gRad([[0, '#ffb15e', .9], [.5, '#e0603e', .55], [1, '#e0603e', 0]]);
      return gDefs(br, board, fire) + shade(50, 92, 44, 3.4, .32)
        + `<path d="M10,86 L90,86 L92,91.5 L8,91.5 Z" fill="${board.url}"/><path d="M10,86 L90,86" stroke="#6a5644" stroke-width=".8"/>`
        + '<rect x="25" y="79" width="7" height="7.5" rx="1" fill="#2a2015"/><rect x="68" y="79" width="7" height="7.5" rx="1" fill="#2a2015"/><rect x="46.5" y="80" width="7" height="6.5" rx="1" fill="#3a2d1e"/>'
        + `<path d="M19,42 Q14.5,50 16.5,60 Q19,74 30,81.5 L70,81.5 Q81,74 83.5,60 Q85.5,50 81,42 Z" fill="${br.url}"/>`
        + `<path d="M37.5,63 Q50,55 62.5,63 L60.5,77 Q50,73.5 39.5,77 Z" fill="#140e09"/><ellipse cx="50" cy="73" rx="9" ry="3.2" fill="${fire.url}"/>`
        + '<circle cx="18.5" cy="53" r="4" fill="#4a3a24"/><circle cx="18.5" cy="53" r="2.3" fill="none" stroke="#b39a66" stroke-width="1"/><circle cx="81.5" cy="53" r="4" fill="#4a3a24"/><circle cx="81.5" cy="53" r="2.3" fill="none" stroke="#b39a66" stroke-width="1"/>'
        + '<ellipse cx="31" cy="70" rx="4" ry="2.4" fill="#6f9b84" opacity=".22"/><ellipse cx="70" cy="48" rx="3" ry="1.8" fill="#6f9b84" opacity=".2"/>'
        + gloss('M24,50 C23,58 25,66 30,73', 2.6, .16)
        + kama(50, 32, 0.8)
        + `<path d="M17.5,41 Q50,51 82.5,41 L83,46.5 Q50,57 17,46.5 Z" fill="${br.url}"/><path d="M17.5,41 Q50,51 82.5,41" stroke="#c4ab78" stroke-width=".8" fill="none" opacity=".6"/>`;
    },
    // 炉：畳に切った炉。炉縁の中に灰、五徳に釜をかける
    ro: () => {
      const tat = gLin([[0, '#c7b97f'], [1, '#ddd09c']], 0, 0, 0, 1);
      const frame = gLin([[0, '#1c120c'], [.45, '#4b3122'], [.55, '#5a3b28'], [1, '#160e09']], 0, 0, 1, 1);
      const ash = gRad([[0, '#ddd8cf'], [.65, '#bdb6aa'], [1, '#8e877b']], .5, .35, .75);
      let w = '';
      for (let y = 51; y < 92; y += 3) w += `<line x1="4" y1="${y}" x2="96" y2="${y}" stroke="#b8a96e" stroke-width=".6" opacity=".55"/>`;
      return gDefs(tat, frame, ash) + `<rect x="4" y="48" width="92" height="44" fill="${tat.url}"/>${w}<path d="M4,48 L96,48" stroke="#2f3a2a" stroke-width="3"/>`
        + `<path d="M23,55 L77,55 L87,87 L13,87 Z" fill="${frame.url}"/><path d="M28,58.5 L72,58.5 L80,83 L20,83 Z" fill="${ash.url}"/>`
        + '<path d="M22,80 Q50,74 78,80" stroke="#9f978a" stroke-width="1" fill="none"/><path d="M27,63 Q50,60 73,63" stroke="#cfc9bf" stroke-width=".8" fill="none"/>'
        + '<g stroke="#1b1a19" stroke-width="2.2" stroke-linecap="round"><path d="M36,76 L33,82"/><path d="M64,76 L67,82"/><path d="M50,74 L50,80"/></g>'
        + kama(50, 61, .8)
        + `<path d="M13,87 L87,87 L84.5,79 L15.5,79 Z" fill="${frame.url}"/><path d="M15.5,79 L84.5,79" stroke="#7a5238" stroke-width=".7" opacity=".7"/>`
        + gloss('M24.5,56 L75.5,56', 1, .15);
    },
    // 柄杓：竹。右上の合（湯をくむ筒）に、長い柄を差し通す
    hishaku: () => {
      const A = [15, 87], B = [72, 33], { dx, dy, nx, ny } = axisOf(A, B);
      const q = (t, w) => [A[0] + dx * t + nx * w, A[1] + dy * t + ny * w];
      const pts = [q(0, 2.4), q(1, 2), q(1, -2), q(0, -2.4)].map((p) => `${n1(p[0])},${n1(p[1])}`).join(' L');
      const M = q(.5, 0);
      const g = gLinU([[0, '#9b7743'], [.45, '#ecd6a4'], [1, '#a98552']], M[0] - nx * 2, M[1] - ny * 2, M[0] + nx * 2, M[1] + ny * 2);
      const cup = gLin([[0, '#a47e47'], [.35, '#e9d3a1'], [.7, '#c9a66d'], [1, '#8d6a3a']]);
      const inside = gLin([[0, '#6b5130'], [1, '#b8955e']], 0, 0, 0, 1);
      return gDefs(g, cup, inside) + `<path d="M${pts} Z" fill="#000" opacity=".15" transform="translate(1.2,2)"/><path d="M${pts} Z" fill="${g.url}"/>`
        + `<path d="M${n1(A[0] - 1.2)},${n1(A[1] - 1.8)} L${n1(A[0] + 2.4)},${n1(A[1] + 1.2)}" stroke="#6b4e28" stroke-width="1.2"/>`
        + shade(79, 43.5, 14, 2.6, .2)
        + `<path d="M66,20 L66,38.5 Q79,44 92,38.5 L92,20 Z" fill="${cup.url}"/><path d="M66,38.5 Q79,44 92,38.5" stroke="#7a5a30" stroke-width=".9" fill="none"/>`
        + `<ellipse cx="79" cy="20" rx="13" ry="4.8" fill="#d9bd85"/><ellipse cx="79" cy="20.4" rx="11.2" ry="3.8" fill="${inside.url}"/>`
        + '<ellipse cx="91" cy="31.5" rx="1.5" ry="2" fill="#8d6a3a"/>' + gloss('M69.5,23.5 L69.5,36', 2, .3);
    },
    // 水指（染付）：白い磁器に藍の絵。蓋は黒の塗蓋
    mizusashi: () => {
      const po = gLin([[0, '#c3cdd1'], [.18, '#eef2f3'], [.42, '#ffffff'], [.72, '#dde3e6'], [1, '#aeb9be']]);
      const lac = gLin([[0, '#050404'], [.35, '#2c2725'], [.55, '#141211'], [1, '#050404']]);
      const ai = '#2c4a8f';
      return gDefs(po, lac) + shade(50, 88.5, 26, 3.4)
        + `<path d="M29,33 C28.5,52 29,70 30.5,81 Q50,88.5 69.5,81 C71,70 71.5,52 71,33 Z" fill="${po.url}"/><path d="M30.5,81 Q50,88.5 69.5,81" stroke="#9aa6ab" stroke-width="1" fill="none"/>`
        + `<g stroke="${ai}" fill="none" stroke-linecap="round"><path d="M29.3,39 Q50,44 70.7,39" stroke-width="1.1"/><path d="M29.2,42.5 Q50,47.5 70.8,42.5" stroke-width=".7"/>`
        + '<path d="M30.2,76 Q50,82 69.8,76" stroke-width="1.1"/><path d="M33,54 C38,48 44,60 50,54 S62,48 67,55" stroke-width="1.3"/><path d="M36,66 C41,60 46,71 52,65 S62,60 66,66" stroke-width="1"/></g>'
        + `<g fill="${ai}"><path d="M40,52 q3,-4 6,0 q-3,3 -6,0 Z"/><path d="M56,58 q3,-4 6,0 q-3,3 -6,0 Z"/><path d="M45,64 q2.5,-3.5 5,0 q-2.5,2.6 -5,0 Z"/><circle cx="50" cy="54" r="1.6"/><circle cx="62" cy="64" r="1.2"/></g>`
        + gloss('M34.5,40 C34,52 34.5,66 36,76', 3, .5)
        + `<path d="M27.4,31.8 L27.4,34.4 Q50,41.2 72.6,34.4 L72.6,31.8 Z" fill="#0b0a09"/><ellipse cx="50" cy="31.8" rx="22.6" ry="5.6" fill="${lac.url}"/>`
        + '<ellipse cx="50" cy="29.6" rx="3.6" ry="1.4" fill="#1a1715"/><path d="M46.4,29.6 L46.4,27.8 Q50,26.4 53.6,27.8 L53.6,29.6" fill="#221e1b"/>'
        + gloss('M33,30.5 Q42,27.5 52,27.2', 1.4, .28);
    },
    // 建水（曲）：薄い檜を曲げた器。合わせ目を桜の皮で綴じる
    kensui: () => {
      const wd = gLin([[0, '#b28650'], [.18, '#ddbd88'], [.5, '#f0d7a8'], [.82, '#cfa871'], [1, '#a17644']]);
      const inn = gLin([[0, '#7a5530'], [1, '#c09661']], 0, 0, 0, 1);
      const gr = [27, 33, 40, 47, 53, 59, 66, 72].map((x, i) => `<path d="M${x},${49 + (i % 3)} C${x + 1},60 ${x - 1},70 ${x + (x < 50 ? 1 : -1)},${79 + (i % 2)}" stroke="#b07f4a" stroke-width=".55" fill="none" opacity=".55"/>`).join('');
      return gDefs(wd, inn) + shade(50, 86.5, 31, 4)
        + `<path d="M22,46 L25.5,80 Q50,87.5 74.5,80 L78,46 Z" fill="${wd.url}"/>` + gr
        + '<path d="M61,48.4 L62,82.4 L66.4,81.8 L65.6,47.9 Z" fill="#c69a63"/>' + [52, 58, 64, 70, 76].map((y) => `<path d="M62.2,${y} l3.6,1.6" stroke="#5a3418" stroke-width="1.4"/>`).join('')
        + '<path d="M25.5,80 Q50,87.5 74.5,80" stroke="#8d6538" stroke-width="1.2" fill="none"/>'
        + `<ellipse cx="50" cy="46" rx="28" ry="6.6" fill="#e0c18e"/><ellipse cx="50" cy="46.3" rx="26.2" ry="5.3" fill="${inn.url}"/>`
        + gloss('M28,50 C28.5,60 29,70 30,77', 2.6, .22);
    },
    // 蓋置（竹）：風炉の季節は節が上の方にある「天節」
    futaoki: () => {
      const cn = gLin([[0, '#857141'], [.2, '#c5b07a'], [.45, '#e8d9a8'], [.72, '#b8a067'], [1, '#76623a']]);
      const fb = [39, 43, 47, 53, 57, 61].map((x) => `<line x1="${x}" y1="43" x2="${x}" y2="76" stroke="#9a8450" stroke-width=".45" opacity=".5"/>`).join('');
      return gDefs(cn) + shade(50, 79.5, 17, 2.8)
        + `<path d="M36,34 L36,77 Q50,81.5 64,77 L64,34 Z" fill="${cn.url}"/>` + fb
        + '<path d="M35.6,39.2 Q50,43.4 64.4,39.2 L64.4,42.6 Q50,46.8 35.6,42.6 Z" fill="#a38c55"/><path d="M35.8,42.6 Q50,46.8 64.2,42.6" stroke="#f1e4b8" stroke-width=".6" fill="none" opacity=".7"/>'
        + '<ellipse cx="50" cy="34" rx="14" ry="4.2" fill="#dccb95"/><ellipse cx="50" cy="34.4" rx="11.6" ry="3.1" fill="#5e4f2c"/>'
        + '<path d="M36,77 Q50,81.5 64,77" stroke="#6e5b33" stroke-width="1" fill="none"/>' + gloss('M40,46 L40,74', 2, .3);
    },
    // 帛紗：絹の布をたたんだところ（男性は紫、女性は朱）。つやが斜めに走る
    fukusa: () => {
      const c = MALE ? ['#3c1a49', '#7d4794', '#2d1238', '#5d2f70'] : ['#8e2a1b', '#dc5a3f', '#6c1d12', '#b8432c'];
      const silk = gLin([[0, c[0]], [.42, c[1]], [.62, c[3]], [1, c[2]]], 0, 0, 1, 1);
      const flap = gLin([[0, c[2]], [.6, c[3]], [1, c[1]]], 0, 1, 1, 0);
      const sh = gLin([[0, '#fff', 0], [.5, '#fff', .28], [1, '#fff', 0]], 0, 0, 1, 1);
      return gDefs(silk, flap, sh) + shade(50, 77, 35, 4)
        + `<path d="M17,33 Q50,30.5 83,33 L84,71 Q50,74 16,71 Z" fill="${silk.url}"/>`
        + `<path d="M17,33 L50,33 L17,58 Z" fill="${flap.url}"/><path d="M50,33 L17,58" stroke="#000" stroke-width=".8" opacity=".25"/>`
        + `<path d="M24,66 Q52,40 80,38 L82,46 Q55,48 30,70 Z" fill="${sh.url}"/>`
        + '<path d="M20,69 Q50,71.6 80,69" stroke="#fff" stroke-width=".5" stroke-dasharray="1.5 1.2" fill="none" opacity=".35"/>';
    },
    // 茶巾：麻の布を湿らせてたたんだもの。細かな織り目と、たたんだ折り山
    chakin: () => {
      const ln = gLin([[0, '#e4dfd2'], [.5, '#fbf9f3'], [1, '#d9d3c4']], 0, 0, 0, 1);
      let tx = '';
      for (let y = 40; y < 70; y += 2.2) tx += `<line x1="19" y1="${n1(y)}" x2="81" y2="${n1(y)}" stroke="#d3ccb9" stroke-width=".35"/>`;
      for (let x = 21; x < 80; x += 2.2) tx += `<line x1="${n1(x)}" y1="39" x2="${n1(x)}" y2="69" stroke="#ddd6c4" stroke-width=".3"/>`;
      const edge = 'M18,45 Q18,38 26,38 L74,38 Q82,38 82,45 L82,63 Q82,70 74,70 L26,70 Q18,70 18,63 Z';
      return gDefs(ln) + shade(50, 72, 35, 4) + `<path d="${edge}" fill="${ln.url}"/>` + tx
        + '<path d="M18,54 Q50,56.5 82,54" stroke="#b9b19c" stroke-width="1.2" fill="none"/><path d="M18,55.5 Q50,58 82,55.5" stroke="#fff" stroke-width=".7" fill="none" opacity=".8"/>'
        + `<path d="${edge}" fill="none" stroke="#c9c1ac" stroke-width="1.2"/>`;
    },
    // 香合（塗物）：黒塗りの丸い蓋物に、金の蒔絵（梅）
    kogo: () => {
      const lac = gLin([[0, '#262220'], [.18, '#0e0c0b'], [.45, '#221e1c'], [.7, '#090808'], [1, '#1c1917']]);
      const top = gRad([[0, '#3b3532'], [.6, '#171413'], [1, '#0a0909']], .38, .35, .75);
      const ume1 = (x, y, r) => [0, 1, 2, 3, 4].map((k) => { const a = (k * 72 - 90) * Math.PI / 180; return `<circle cx="${n1(x + Math.cos(a) * r * .75)}" cy="${n1(y + Math.sin(a) * r * .42)}" r="${n1(r * .5)}"/>`; }).join('');
      return gDefs(lac, top) + shade(50, 72, 30, 3.6)
        + `<path d="M23,52 L23,64 Q50,75 77,64 L77,52 Z" fill="${lac.url}"/>`
        + '<path d="M23,58.2 Q50,68.6 77,58.2" stroke="#000" stroke-width="1" fill="none"/><path d="M23.4,59.4 Q50,69.8 76.6,59.4" stroke="#fff" stroke-width=".4" fill="none" opacity=".2"/>'
        + `<ellipse cx="50" cy="52" rx="27" ry="10" fill="${top.url}"/>`
        + '<path d="M31,55 Q40,47 52,49 Q60,50 66,45" stroke="#b8902e" stroke-width="1" fill="none"/>'
        + `<g fill="#d9b44a">${ume1(42, 49, 3.4)}${ume1(58, 52.5, 2.8)}${ume1(64, 46.4, 2.2)}</g><g fill="#8a6a1e"><circle cx="42" cy="49" r=".8"/><circle cx="58" cy="52.5" r=".7"/></g>`
        + gloss('M30,47.5 Q38,43.4 50,42.8', 1.8, .3) + gloss('M26.5,56 L27.2,63.5', 1.8, .2);
    },
    kashiki: () => at(50, 60, 1.6, kashikiP()),
    kaishi: () => at(52, 56, 1.5, kaishiP()),
    // 菓子切：懐紙にのせた主菓子と、銀の菓子切（楊枝）
    kashikiri: () => {
      const si = gLinU([[0, '#6f757b'], [.5, '#eef1f3'], [1, '#868c92']], 65.2, 39.1, 68.8, 40.9);
      const pick = 'M76.6,16.6 L79.4,18.4 L57.4,61.2 L55.6,64.6 L55,60 Z';
      return gDefs(si) + at(46, 66, 1.4, kaishiP()) + at(42, 62, 1.3, sweetP()) + '<line x1="45" y1="52.5" x2="43" y2="73" stroke="#fffefa" stroke-width="1.8" opacity=".9"/>'
        + `<path d="${pick}" fill="#000" opacity=".15" transform="translate(1.5,2)"/><path d="${pick}" fill="${si.url}"/><path d="M75,15.4 L81,19.4 L79.6,21.6 L73.8,17.6 Z" fill="#9aa0a6"/>`;
    },
    // 扇子（茶席で使う小さな扇子）：閉じて置いたところ。左下が要（かなめ）、先に向かって広がり、紙の折り目が見える
    sensu: () => {
      const A = [16, 82], { dx, dy, nx, ny } = axisOf(A, [84, 22]);
      const q = (t, w) => [A[0] + dx * t + nx * w, A[1] + dy * t + ny * w], xy = (p) => `${n1(p[0])},${n1(p[1])}`;
      const M = q(.55, 0);
      const bb = gLinU([[0, '#3f2815'], [.45, '#b08350'], [.6, '#9a6c3e'], [1, '#3a2412']], M[0] - nx * 6, M[1] - ny * 6, M[0] + nx * 6, M[1] + ny * 6);
      const pp = gLinU([[0, '#e9dfc2'], [.5, '#fbf6e6'], [1, '#e2d6b4']], M[0] - nx * 9, M[1] - ny * 9, M[0] + nx * 9, M[1] + ny * 9);
      // 紙（親骨の外に少しはみ出す）と、その先の折り山
      const paper = [q(.3, 3.2), q(1, 9.2), q(1, -9.2), q(.3, -3.2)].map(xy).join(' L');
      let pleats = '';
      for (let k = -4; k <= 4; k++) { const a = q(.42, k * .55), b = q(1, k * 2); pleats += `<line x1="${n1(a[0])}" y1="${n1(a[1])}" x2="${n1(b[0])}" y2="${n1(b[1])}" stroke="${k % 2 ? '#d8cba6' : '#fff'}" stroke-width="${k % 2 ? .6 : .5}"/>`; }
      const top = [-9.2, -6.9, -4.6, -2.3, 0, 2.3, 4.6, 6.9, 9.2].map((w, i) => xy(q(i % 2 ? .985 : 1.012, w))).join(' L');
      // 親骨（両側の太い骨）
      const rib = [q(0, 3.4), q(1, 7.4), q(1, 4.6), q(0, 1.2)].map(xy).join(' L');
      const rib2 = [q(0, -1.2), q(1, -4.6), q(1, -7.4), q(0, -3.4)].map(xy).join(' L');
      const kn = q(.035, 0);
      return gDefs(bb, pp) + `<path d="M${[q(0, 3.4), q(1, 9.2), q(1, -9.2), q(0, -3.4)].map(xy).join(' L')} Z" fill="#000" opacity=".16" transform="translate(1.6,2.4)"/>`
        + `<path d="M${paper} Z" fill="${pp.url}"/>` + pleats
        + `<path d="M${top}" stroke="#c9a23a" stroke-width="1.1" fill="none" stroke-linejoin="round"/>`
        + `<path d="M${rib} Z" fill="${bb.url}"/><path d="M${rib2} Z" fill="${bb.url}"/>`
        + `<path d="M${[q(0, 3.4), q(.3, 4.5), q(.3, -4.5), q(0, -3.4)].map(xy).join(' L')} Z" fill="${bb.url}"/>`
        + `<circle cx="${n1(kn[0])}" cy="${n1(kn[1])}" r="2" fill="#d6dadd" stroke="#6a6e72" stroke-width=".6"/>`
        + gloss(`M${xy(q(.08, 2.6))} L${xy(q(.95, 6.4))}`, .9, .35);
    },
  };

  // ---------- 人物（2頭身・右向き・正座。床は y=94） ----------
  const kimonoDots = (pts) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5" fill="#fff" opacity=".6"/>`).join('');
  function person(pose, K, opt) {
    opt = opt || {};
    const male = !!opt.male;
    const D = '#00000022';
    // 女性は着物に帯、男性は着物に袴（縦じま）。男性は短い髪で、かんざしなし
    const legs = `<path d="M22,94 C20,82 28,73 40,72 L62,73 C72,74 78,84 76,94 Z" fill="${male ? HAKAMA : K}"/><path d="M22,94 C22,88 27,84 34,83 L70,84 C74,86 76,90 76,94 Z" fill="${D}"/>`
      + (male ? '<path d="M32,76 L29,93 M42,73 L41,94 M52,73 L53,94 M63,75 L67,93" stroke="#00000030" stroke-width="1.3"/>' : kimonoDots([[34, 89], [48, 90], [62, 89], [42, 80], [57, 80]]));
    const torso = `<path d="M34,77 C32,63 36,51 44,47 L55,47 C60,52 61,64 59,77 Z" fill="${K}"/>` + (male ? '' : kimonoDots([[45, 55], [52, 52], [39, 74], [54, 75]]))
      + '<path d="M55,47.5 L50,60 L52.5,61 L57,49 Z" fill="#f6f1e4"/>'
      + (male
        ? `<path d="M33.6,64 L60.2,64 L60.3,67.5 L33.7,67.5 Z" fill="#3a3530"/><path d="M33.7,67.5 L60.3,67.5 L59.4,77 L34.2,77 Z" fill="${HAKAMA}"/><path d="M41,68 L40.5,77 M50,68 L50,77" stroke="#00000030" stroke-width="1.2"/>`
        : `<path d="M33.6,63 L60.2,63 L60.4,70 L33.8,70 Z" fill="${opt.obi || '#f2cf5b'}"/><line x1="34" y1="66.5" x2="60" y2="66.5" stroke="#e0603e" stroke-width="1.2"/>`)
      + (opt.fukusa ? `<rect x="35" y="${male ? 64.5 : 66}" width="5" height="9" rx="1" fill="${opt.fukusa}"/>` : '');
    const face = `<ellipse cx="57.5" cy="32.5" rx="1.6" ry="2.2" fill="${HAIR}"/><circle cx="58" cy="31.7" r=".65" fill="#fff"/>`
      + `<ellipse cx="57" cy="37.6" rx="2.7" ry="1.5" fill="${BLUSH}" opacity="${male ? .55 : .9}"/>`
      + '<path d="M59,39 q1.3,1 2.3,-.2" stroke="#8a4a3a" stroke-width=".9" fill="none" stroke-linecap="round"/>';
    const head = male
      ? `<rect x="47" y="40" width="7" height="8" fill="${SKIN}"/><circle cx="51" cy="32" r="12.5" fill="${SKIN}"/>`
        + `<path d="M38.8,34 C37.5,21 45,18 52,18.5 C59.5,19 63.8,23.5 63.6,28.5 C60,26 54.5,26.5 49.5,28.6 L48,37.5 C44.5,38.5 40.5,37.2 38.8,34 Z" fill="${HAIR}"/>` + face
      : `<rect x="47" y="40" width="7" height="8" fill="${SKIN}"/><circle cx="39" cy="22" r="6" fill="${HAIR}"/>`
        + `<circle cx="51" cy="32" r="12.5" fill="${SKIN}"/>`
        + `<path d="M38.6,34 C37,20 46,17.5 52,18 C60,18.5 64,24 63.5,29 C58,26.5 52,27 47,30 L46,42 C42,41 39,38 38.6,34 Z" fill="${HAIR}"/>`
        + '<circle cx="43" cy="18" r="2.6" fill="#e0603e"/><circle cx="43" cy="18" r="1" fill="#f6d36b"/>' + face;
    const sleeve = (d) => `<path d="${d}" fill="${K}"/><path d="${d}" fill="${D}"/>`;
    const hand = (x, y, rx) => `<ellipse cx="${x}" cy="${y}" rx="${rx || 3.3}" ry="2.5" fill="${SKIN}"/>`;
    const lap = sleeve('M47,49 C55,52 60,60 62,69 L55,72 C53,64 49,58 45,56 Z') + hand(61, 71.5);
    const rot = (deg, body) => `<g transform="rotate(${deg} 46 76)">${body}</g>`;
    const rotAnim = (vals, dur, body) => `<g>${tr('rotate', vals, dur)}${body}</g>`;
    const moving = (vals, dur, body) => (opt.anim ? `<g>${tr('translate', vals, dur)}${body}</g>` : body);
    const item = opt.item || '';
    switch (pose) {
      case 'eshaku': return legs + (opt.anim ? rotAnim('0 46 76;15 46 76;15 46 76;0 46 76;0 46 76', 3.5, torso + head + lap) : rot(15, torso + head + lap));
      case 'bow': return opt.anim
        ? legs + rotAnim('0 46 76;40 46 76;40 46 76;0 46 76;0 46 76', 4, torso + head + lap)
        : legs + rot(45, torso + head) + sleeve('M63,57 C71,62 78,76 82,88 L76,91 C72,80 66,70 60,65 Z') + hand(80, 91, 4);
      case 'hold': return legs + torso + head + moving('0 5;0 -3;0 -3;0 5', 2.8, sleeve('M46,49 C52,52 55,58 56,64 L65,57 L69,60 L58,69 C53,68 48,62 44,57 Z') + item + hand(67, 58));
      // 胸の高さより下で、軽く持ち上げる（菓子器は高く上げない）
      case 'holdlow': return legs + torso + head + moving('0 3;0 -1;0 -1;0 3', 2.8, sleeve('M46,49 C52,53 55,59 56,66 L62,63 L66,67 L58,72 C53,70 48,63 44,57 Z') + item + hand(64, 67));
      case 'drink': return legs + torso + head + moving('0 2;0 -1;0 2', 2.4, sleeve('M46,49 C52,52 54,58 55,62 L58,46 L63,47 L60,66 C54,66 48,61 44,57 Z') + item + hand(60.5, 45));
      case 'view': return legs + rot(18, torso + head) + moving('0 0;0 -3;0 0', 3, sleeve('M57,52 C63,56 66,64 67,72 L74,78 L72,82 L63,76 C60,68 57,62 53,58 Z') + item + hand(73, 80));
      default: return legs + torso + head + lap;
    }
  }
  const fig = (body, x, y, s) => `<g transform="translate(${x},${y}) scale(${s})">${body}</g>`;
  const G = (pose, opt) => person(pose, MALE ? GUEST_M : GUEST, Object.assign({ male: MALE }, opt));
  const H = (pose, school, opt) => person(pose, schoolColor(school), Object.assign({ male: MALE, fukusa: MALE ? FUKUSA : FUKUSA_F, obi: '#e9dcb5' }, opt));
  const pair = (item, o) => floor + fig(G('sit'), -6, 36, .62) + fig(flip(G('eshaku', { anim: o && o.anim })), 40, 36, .62) + item;
  const bubble = (o) => `<g>${o && o.anim ? MOVE.pulse : ''}<path d="M66,8 h26 a4,4 0 0 1 4,4 v10 a4,4 0 0 1 -4,4 h-16 l-6,6 l1,-6 h-5 a4,4 0 0 1 -4,-4 v-10 a4,4 0 0 1 4,-4 z" fill="#fffdf7" stroke="#8a7a5c"/><circle cx="72" cy="17" r="1.8" fill="#8a7a5c"/><circle cx="79" cy="17" r="1.8" fill="#8a7a5c"/><circle cx="86" cy="17" r="1.8" fill="#8a7a5c"/></g>`;

  // ---------- 立ち姿・正面（歩き方ステージ） ----------
  const chibiFace = '<ellipse cx="43" cy="38" rx="2.6" ry="3.4" fill="#2b2622"/><ellipse cx="57" cy="38" rx="2.6" ry="3.4" fill="#2b2622"/><circle cx="42.2" cy="36.8" r="1" fill="#fff"/><circle cx="56.2" cy="36.8" r="1" fill="#fff"/>'
    + `<ellipse cx="37.5" cy="44" rx="3.8" ry="2.1" fill="${BLUSH}"/><ellipse cx="62.5" cy="44" rx="3.8" ry="2.1" fill="${BLUSH}"/><path d="M46.5,45 Q50,48.5 53.5,45" stroke="#8a4a3a" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  const chibiHead = `<circle cx="50" cy="15" r="7.5" fill="${HAIR}"/><circle cx="50" cy="35" r="20" fill="${SKIN}"/>`
    + `<path d="M30,38 C28,20 38,13 50,13 C62,13 72,20 70,38 C66,30 60,25.5 50,26.5 C40,25.5 34,30 30,38 Z" fill="${HAIR}"/>`
    + '<circle cx="57.5" cy="12" r="3" fill="#e0603e"/><circle cx="57.5" cy="12" r="1.2" fill="#f6d36b"/>' + chibiFace;
  const chibiHeadM = `<circle cx="50" cy="35" r="20" fill="${SKIN}"/>`
    + `<path d="M30,36 C29,19 39,12 50,12 C61,12 71,19 70,36 C67,29 61,25 50,26 C39,25 33,29 30,36 Z" fill="${HAIR}"/>` + chibiFace;
  // 立ち姿（歩き方ステージの自分・道具を運ぶ亭主）。男性は袴。front を渡すと、それを両手で帯の前に持つ
  function chibi(K, obi, male, front) {
    const sleeve = (x) => (front
      ? `<path d="M${x},56 h14 l${x < 50 ? 4 : -4},22 q-7,4 -14,0 Z" fill="${K}"/><path d="M${x},56 h14 l${x < 50 ? 4 : -4},22 q-7,4 -14,0 Z" fill="#0000001c"/>`
      : `<rect x="${x}" y="56" width="14" height="27" rx="6" fill="${K}"/><rect x="${x}" y="56" width="14" height="27" rx="6" fill="#0000001c"/>`);
    const hands = (front ? [[39, 76], [61, 76]] : [[28, 84], [72, 84]]).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${SKIN}"/>`).join('');
    return '<ellipse cx="50" cy="96" rx="18" ry="3" fill="#00000026"/>'
      + '<ellipse cx="43" cy="93" rx="5" ry="3" fill="#fff" stroke="#d6cfbd"/><ellipse cx="57" cy="93" rx="5" ry="3" fill="#fff" stroke="#d6cfbd"/>'
      + `<path d="M34,56 L66,56 L65,92 L35,92 Z" fill="${K}"/><path d="M50,57 L45,92" stroke="#00000022" stroke-width="1.5"/>`
      + (male ? `<path d="M34,69 L66,69 L68,92 L32,92 Z" fill="${HAKAMA}"/><path d="M42,71 L41,92 M50,71 L50,92 M58,71 L59,92" stroke="#00000030" stroke-width="1.4"/>` : '')
      + sleeve(21) + sleeve(65)
      + (male ? '' : kimonoDots([[40, 80], [58, 84], [52, 88], [28, 66], [72, 70]])) + (front ? '' : hands)
      + '<path d="M43,56 L50,66 L57,56" fill="none" stroke="#f6f1e4" stroke-width="3"/>'
      + (male ? '<rect x="34" y="65" width="32" height="5" fill="#3a3530"/>' : `<rect x="34" y="66" width="32" height="8" fill="${obi || '#f2cf5b'}"/><line x1="34" y1="70" x2="66" y2="70" stroke="#e0603e" stroke-width="1.4"/>`)
      + (male ? chibiHeadM : chibiHead)
      + (front ? front + hands : '');
  }
  // 正面を向いて座る人（盤面の亭主・席に着いた客）
  function chibiSeat(K, male, fukusa) {
    return '<ellipse cx="50" cy="94" rx="27" ry="4" fill="#00000026"/>'
      + `<path d="M22,94 Q22,62 50,57 Q78,62 78,94 Z" fill="${K}"/>`
      + (male ? `<path d="M22,94 Q23,76 34,73 L66,73 Q77,76 78,94 Z" fill="${HAKAMA}"/><path d="M36,76 L33,93 M50,74 L50,94 M64,76 L67,93" stroke="#00000030" stroke-width="1.4"/>` : '<path d="M22,94 Q24,80 34,78 L66,78 Q76,80 78,94 Z" fill="#0000001c"/>' + kimonoDots([[34, 86], [50, 88], [66, 86]]))
      + '<path d="M43,57 L50,67 L57,57" fill="none" stroke="#f6f1e4" stroke-width="3"/>'
      + (male ? '<rect x="31" y="67" width="38" height="5" fill="#3a3530"/>' : '<rect x="31" y="67" width="38" height="7" fill="#e9dcb5"/>')
      + (fukusa ? `<rect x="33" y="68" width="5" height="8" fill="${fukusa}"/>` : '')
      + `<ellipse cx="44" cy="82" rx="4" ry="2.8" fill="${SKIN}"/><ellipse cx="56" cy="82" rx="4" ry="2.8" fill="${SKIN}"/>`
      + (male ? chibiHeadM : chibiHead);
  }

  // ---------- まっちゃん（案内役の茶碗）。expr: happy / joy / oops / sad / think ----------
  function mascot(expr) {
    expr = expr || 'happy';
    const arm = (d) => `<path d="${d}" stroke="#e8cfa0" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    let s = expr === 'joy' ? arm('M18,58 Q8,46 10,34') + arm('M82,58 Q92,46 90,34')
      : expr === 'think' ? arm('M18,60 Q8,64 9,72') + arm('M82,62 Q74,74 64,72')
      : arm('M18,60 Q8,64 9,72') + arm('M82,60 Q92,64 91,72');
    s += '<path d="M14,44 Q14,88 50,90 Q86,88 86,44 Z" fill="#f3e2bd"/><path d="M14,44 Q14,88 50,90 Q86,88 86,44" fill="none" stroke="#c9a46a" stroke-width="2"/>'
      + '<path d="M20,76 Q50,86 80,76" stroke="#d98a5a" stroke-width="3" fill="none" opacity=".45"/><rect x="38" y="87" width="24" height="6" rx="3" fill="#c9a46a"/>'
      // 茶碗の口に、点てたお茶が少しふんわり見えるくらい（山盛りにしない）
      + '<ellipse cx="50" cy="44" rx="36" ry="8" fill="#c9a46a"/><ellipse cx="50" cy="43.5" rx="32.5" ry="6.2" fill="#7fb547"/>'
      + '<path d="M21,43.5 Q50,34 79,43.5 Q50,48 21,43.5 Z" fill="#9ccd5c"/>'
      + [[30, 42], [39, 39.5], [50, 38.5], [61, 39.5], [70, 42], [44, 43], [57, 43]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.3 : 1.8}" fill="#c4e48f"/>`).join('')
      + '<ellipse cx="38" cy="40" rx="5" ry="1.5" fill="#ffffff66"/>';
    const eye = (x) => `<ellipse cx="${x}" cy="59" rx="4.6" ry="6" fill="#2b2622"/><circle cx="${x - 1.6}" cy="56.5" r="1.8" fill="#fff"/>`;
    s += `<ellipse cx="27" cy="68" rx="6" ry="3.4" fill="${BLUSH}"/><ellipse cx="73" cy="68" rx="6" ry="3.4" fill="${BLUSH}"/>`;
    if (expr === 'joy') s += '<path d="M31,60 Q37,52 43,60 M57,60 Q63,52 69,60" stroke="#2b2622" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M41,65 Q50,79 59,65 Z" fill="#c84d4d"/><ellipse cx="50" cy="72" rx="4" ry="2.2" fill="#f08a8a"/>'
      + sparkle(10, 22, 6) + sparkle(90, 20, 5, '#f4a3a8') + sparkle(94, 46, 3.5);
    else if (expr === 'oops') s += eye(37) + eye(63) + '<circle cx="50" cy="70" r="3.4" fill="none" stroke="#2b2622" stroke-width="2"/><path d="M86,22 Q91,30 86,34 Q81,30 86,22 Z" fill="#8cc8ea"/>';
    else if (expr === 'sad') s += eye(37) + eye(63) + '<path d="M30,49 L42,52 M70,49 L58,52" stroke="#2b2622" stroke-width="2" stroke-linecap="round"/><path d="M44,72 Q50,66 56,72" stroke="#2b2622" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M33,66 Q30,74 33,77 Q36,74 33,66 Z" fill="#8cc8ea"/><path d="M67,66 Q64,74 67,77 Q70,74 67,66 Z" fill="#8cc8ea"/>';
    else if (expr === 'think') s += '<ellipse cx="37" cy="57" rx="4.6" ry="6" fill="#2b2622"/><ellipse cx="63" cy="57" rx="4.6" ry="6" fill="#2b2622"/><circle cx="38" cy="53.5" r="1.8" fill="#fff"/><circle cx="64" cy="53.5" r="1.8" fill="#fff"/><path d="M45,70 L55,69" stroke="#2b2622" stroke-width="2.2" stroke-linecap="round"/><path d="M84,10 q8,0 8,7 q0,5 -6,7 l0,4 M86,32 l0,.5" stroke="#8a7a5c" stroke-width="3" fill="none" stroke-linecap="round"/>';
    else s += eye(37) + eye(63) + '<path d="M43,66 Q50,74 57,66" stroke="#2b2622" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    return `<g transform="translate(0,-6)">${s}</g>`;   // お茶を減らした分、少し上に寄せる
  }

  // ---------- 作法の手順の絵 ----------
  const school = (o) => SCHOOLS[o.school] || SCHOOLS.ura;
  // 自分の席の前の畳：手前に膝、まん中に畳の縁（その手前が縁内、向こうが縁外）
  const matView = () => '<rect x="0" y="14" width="100" height="74" fill="#d6c690"/>' + [22, 30, 38, 62, 70, 78].map((y) => `<line x1="0" y1="${y}" x2="100" y2="${y}" stroke="#c8b77e" stroke-width="1"/>`).join('')
    + '<rect x="0" y="45" width="100" height="9" fill="#2f3a2a"/>'
    + `<path d="M14,100 Q16,86 34,84 L66,84 Q84,86 86,100 Z" fill="${MALE ? HAKAMA : GUEST}"/><path d="M50,85 L50,100" stroke="#00000022" stroke-width="1.5"/>`;
  // 亭主の立ち姿（点前の道具を運ぶ）。front は両手で前に持つ道具
  const hostChibi = (o, front) => chibi(schoolColor(o.school), '#e9dcb5', MALE, front);
  // 茶道口（右）の前に座ってお辞儀をする亭主。水指は表千家は膝前、裏千家は右側（手前）に置く。closing は襖を閉めるところ
  function sadoguchi(o, closing) {
    const side = o.school === 'ura';
    const door = '<rect x="76" y="12" width="20" height="80" fill="#e6d8a6"/>' + [30, 48, 66, 84].map((y) => `<line x1="76" y1="${y}" x2="96" y2="${y}" stroke="#d3c48e" stroke-width="1"/>`).join('')
      + (closing
        ? an(o, 'slideL', '<rect x="86" y="12" width="14" height="80" fill="#f3ecd8" stroke="#b9a77a"/><circle cx="89" cy="54" r="1.8" fill="#8a6c3b"/>')
        : '<rect x="93" y="12" width="7" height="80" fill="#f3ecd8" stroke="#b9a77a"/>')
      + '<rect x="73" y="8" width="27" height="5" fill="#8a6c3b"/><rect x="73" y="8" width="4" height="86" fill="#8a6c3b"/><rect x="96" y="8" width="4" height="86" fill="#8a6c3b"/>'
      + (closing ? arrowH(95, 79, 34) : '');
    const mz = side ? place(TOOL.mizusashi(), 40, 87, .26) : place(TOOL.mizusashi(), 64, 84, .27);
    return door + floor + (side ? '' : mz) + fig(H('bow', o.school, { anim: o.anim }), -10, 17, .82) + (side ? mz : '');
  }
  // 風炉の釜の口（蓋を取ったところ）。furo を (x, 64) に .72 倍で置いたときの位置
  const kamaMouth = (x) => `<ellipse cx="${x}" cy="43" rx="7.5" ry="2.3" fill="#1d1a19"/>`;
  const STEP = {
    'osakini': (o) => pair(at(48, 88, .3, kashikiP()), o),
    'bow-kashi': (o) => floor + fig(G('bow', o), -8, 9, .9) + at(83, 88, .36, kashikiP()),
    'lift-kashi': (o) => floor + fig(G('holdlow', { anim: o.anim, item: at(64, 60, .34, kashikiP()) }), 2, 9, .9),
    'kaishi': (o) => at(50, 64, 1.5, kaishiP()) + at(48, 62, 1.3, sweetP()) + an(o, 'poke', '<line x1="16" y1="30" x2="72" y2="52" stroke="#a87b44" stroke-width="2.4" stroke-linecap="round"/><line x1="18" y1="24" x2="74" y2="46" stroke="#a87b44" stroke-width="2.4" stroke-linecap="round"/>'),
    'send-kashi': (o) => an(o, 'slideR', at(36, 62, 1.15, kashikiP())) + arrowH(64, 95, 62),
    'kashikiri': (o) => at(48, 66, 1.5, kaishiP()) + at(44, 64, 1.4, sweetP()) + '<line x1="45" y1="52" x2="43" y2="76" stroke="#fffefa" stroke-width="2.2"/>' + an(o, 'poke', '<line x1="80" y1="20" x2="60" y2="58" stroke="#9aa0a6" stroke-width="3.2" stroke-linecap="round"/>'),
    // 縁内（膝と畳の縁のあいだ）と縁外（縁の向こう）。下に自分の膝、まん中に畳の縁
    'heri': (o) => matView() + an(o, 'drop', bowl('normal', 50, 70, .5)),
    'heri-out': (o) => matView() + an(o, 'drop', bowl('normal', 62, 33, .45)),
    'kaishi-heri': () => matView() + at(48, 70, .85, kaishiP()),
    'osakini-bowl': (o) => pair(bowl('normal', 48, 88, .26), o),
    'bow-bowl': (o) => floor + fig(G('bow', o), -8, 9, .9) + bowl('normal', 84, 87, .3),
    'lift-bowl': (o) => floor + fig(G('hold', { anim: o.anim, item: bowl('normal', 67, 51, .34) }), 2, 9, .9) + sparkle(86, 24, 4),
    'turn-cw': (o) => at(46, 52, 1.02, an(o, 'turnCW', bowlTop(school(o).foam, true))) + at(46, 52, 1, arcArrow(41, -45, 55)),
    'drink': (o) => floor + fig(G('drink', { anim: o.anim, item: `<g transform="translate(61,40) rotate(-28) scale(.32)">${bowlBody('normal')}</g>` }), 2, 9, .9) + sparkle(84, 18, 5, '#f4a3a8') + sparkle(92, 32, 3),
    'wipe-finger': (o) => bowl('normal', 50, 64, 1.2) + an(o, 'wipe', `<path d="M74,28 q7,-3 9,4 l-5,15 q-3,4 -7,1 Z" fill="${SKIN}"/>`) + swish('M60,36 q10,-8 22,-2') + at(18, 88, .45, kaishiP()),
    'turn-ccw': (o) => at(46, 52, 1.02, an(o, 'turnCCW', bowlTop(school(o).foam, true))) + at(46, 52, 1, arcArrow(41, 55, -45)),
    'view': (o) => floor + fig(G('view', { anim: o.anim, item: bowl('normal', 74, 76, .3) }), 0, 9, .9),
    'return': (o) => an(o, 'slideL', bowl('normal', 52, 52, 1.1, 'empty', 'left')) + arrowH(76, 22, 86),
    'omogashi': (o) => at(50, 68, 1.5, kaishiP()) + an(o, 'float', ume(50, 60, 13, '#f2b6c6', '#f2d36b')),
    'koicha': (o) => bowl('normal', 50, 64, 1.25, 'koicha') + steam(44, 32, o) + steam(56, 30, o),
    'dashi': (o) => at(50, 72, 1.25, dashiP(school(o).dashi)) + an(o, 'drop', bowl('normal', 50, 60, .6, 'koicha')),
    'bow-koicha': (o) => floor + fig(G('bow', o), -8, 9, .9) + bowl('normal', 84, 87, .3, 'koicha'),
    'turn-dashi': (o) => at(46, 54, 1.05, dashiP(school(o).dashi)) + at(46, 52, .8, an(o, 'turnCW', bowlTop('koicha', true))) + at(46, 52, 1, arcArrow(38, -45, 55)),
    'turn-dashi-ccw': (o) => at(46, 54, 1.05, dashiP(school(o).dashi)) + at(46, 52, .8, an(o, 'turnCCW', bowlTop('koicha', true))) + at(46, 52, 1, arcArrow(38, 55, -45)),
    'drink-talk': (o) => floor + fig(G('drink', { anim: o.anim, item: `<g transform="translate(61,40) rotate(-28) scale(.32)">${bowlBody('normal', 'koicha')}</g>` }), -6, 9, .9) + bubble(o),
    'wipe-kaishi': (o) => bowl('normal', 46, 66, 1.15, 'koicha') + an(o, 'wipe', '<g transform="translate(76,42) rotate(-20)"><rect x="-9" y="-6" width="18" height="12" fill="#fffefa" stroke="#d6cfbd"/></g>') + swish('M56,34 q10,-8 24,-2'),
    'send-bowl': (o) => an(o, 'slideR', bowl('normal', 36, 62, .9, 'koicha')) + arrowH(64, 95, 62),
    'okiawase': (o) => '<rect x="0" y="86" width="100" height="14" fill="#d6c690"/>' + place(TOOL.mizusashi(), 52, 46, .62) + an(o, 'slideL', bowl('normal', 32, 80, .45) + place(TOOL.natsume(), 70, 77, .42)),
    'kensui': (o) => '<rect x="0" y="86" width="100" height="14" fill="#d6c690"/>' + place(TOOL.kensui(), 40, 66, .8) + an(o, 'float', '<line x1="14" y1="58" x2="62" y2="50" stroke="#c9a96b" stroke-width="3.2" stroke-linecap="round"/><rect x="58" y="43" width="14" height="12" rx="2" fill="#d8bf87"/>') + place(TOOL.futaoki(), 82, 72, .5),
    'sorei': (o) => floor + fig(H('bow', o.school, { anim: o.anim }), 2, 9, .9),
    'fukusa': (o) => place(TOOL.natsume(), 44, 60, .8) + an(o, 'wipe', at(74, 34, .8, fukusaP(), -25)) + swish('M24,40 q20,-14 40,0'),
    'chasen': (o) => place(chasenBody(school(o).chasenKey), 22, 56, .62) + bowl('normal', 66, 78, .5, 'empty') + '<line x1="98" y1="8" x2="76" y2="32" stroke="#c9a96b" stroke-width="3" stroke-linecap="round"/><g transform="translate(73,37) rotate(35)"><rect x="-7" y="-6" width="14" height="12" rx="2" fill="#d8bf87"/></g>' + stream('M68,44 Q66,56 66,66', o),
    'chasen-toshi': (o) => bowl('normal', 50, 74, .85, 'empty') + an(o, 'sway', place(chasenBody(school(o).chasenKey), 50, 40, .62, 180)) + swish('M24,58 q-6,-12 2,-22') + swish('M76,58 q6,-12 -2,-22'),
    'chakin': (o) => bowl('normal', 48, 68, .95, 'empty') + an(o, 'wipe', '<g transform="translate(72,48) rotate(20)"><rect x="-8" y="-6" width="16" height="12" rx="1.5" fill="#f1ede1" stroke="#cfc8b4"/></g>') + swish('M22,44 q26,-18 52,-4'),
    'matcha': (o) => place(TOOL.natsume(), 22, 72, .48) + '<ellipse cx="22" cy="60" rx="10" ry="3" fill="#7aa23a"/>' + bowl('normal', 66, 78, .55, 'empty') + '<line x1="26" y1="44" x2="64" y2="58" stroke="#c9a96b" stroke-width="3" stroke-linecap="round"/><ellipse cx="64" cy="57" rx="4.5" ry="2.8" fill="#7aa23a"/>' + an(o, 'drop', at(66, 66, 1, dots(6, '#7aa23a', .9, 4, 9))),
    'pour': (o) => bowl('normal', 58, 76, .65) + '<line x1="4" y1="20" x2="40" y2="40" stroke="#c9a96b" stroke-width="3" stroke-linecap="round"/><g transform="translate(46,44) rotate(40)"><rect x="-8" y="-7" width="16" height="13" rx="2" fill="#d8bf87"/></g>' + stream('M52,50 Q56,58 56,66', o) + steam(72, 52, o),
    'foam': (o) => at(44, 52, 1.1, bowlTop(school(o).foam)) + an(o, 'sway', place(chasenBody(school(o).chasenKey), 88, 62, .45)),
    'serve': (o) => an(o, 'slideR', bowl('normal', 36, 62, .9, 'usucha', 'right')) + arrowH(64, 95, 62),
    'shimai': (o) => floor + fig(H('eshaku', o.school, { anim: o.anim }), 0, 9, .9) + place(TOOL.kensui(), 84, 82, .34),
    // ここから運び点前（水指の運び出し〜下がるまで）
    'sadoguchi': (o) => sadoguchi(o, false),
    'hakobi-mizusashi': (o) => floor + place(TOOL.furo(), 88, 76, .3) + an(o, 'float', fig(hostChibi(o, place(TOOL.mizusashi(), 50, 72, .44)), 2, 2, .92)),
    'hakobi-kensui': (o) => floor + an(o, 'float', fig(hostChibi(o) + place(TOOL.kensui(), 72, 91, .3)
      + `<line x1="60" y1="89" x2="90" y2="85" stroke="#c9a96b" stroke-width="2.2" stroke-linecap="round"/><rect x="86" y="81" width="7" height="6" rx="1.5" fill="#d8bf87"/><circle cx="72" cy="86" r="3.6" fill="${SKIN}"/>`, 6, 2, .92)),
    'narabe': (o) => '<rect x="0" y="78" width="100" height="22" fill="#d6c690"/>' + place(TOOL.mizusashi(), 72, 36, .42) + place(TOOL.kensui(), 13, 84, .34)
      + an(o, 'drop', bowl('normal', 46, 68, .5, 'empty')) + an(o, 'drop', place(TOOL.natsume(), 48, 89, .28)),
    // 帛紗をかけた手で釜の蓋を取り、右の蓋置へ
    'kama-futa': (o) => place(TOOL.furo(), 32, 64, .72) + kamaMouth(32) + steam(28, 40, o) + steam(36, 38, o) + place(TOOL.futaoki(), 84, 80, .4) + swish('M64,24 Q80,22 84,66')
      + an(o, 'slideR', `<ellipse cx="52" cy="27" rx="8.5" ry="2.8" fill="#6a5f58"/><path d="M45,25 Q52,14 59,25 Z" fill="${MALE ? FUKUSA : FUKUSA_F}"/><ellipse cx="52" cy="17" rx="4.2" ry="3" fill="${SKIN}"/>`),
    // 表千家：茶筅通しが、お菓子を取り回す合図
    'chasen-kashi': (o) => bowl('normal', 40, 72, .8, 'empty') + an(o, 'sway', place(chasenBody(school(o).chasenKey), 40, 40, .58, 180)) + swish('M14,58 q-6,-12 2,-22') + swish('M66,58 q6,-12 -2,-22')
      + at(84, 88, .42, kashikiP()) + an(o, 'pulse', sparkle(80, 70, 5) + sparkle(93, 63, 3.5, BLUSH)),
    // 裏千家：茶杓を取って「お菓子をどうぞ」
    'okashi': (o) => floor + fig(H('sit', o.school), -10, 9, .9) + '<line x1="43" y1="75" x2="58" y2="66" stroke="#c9a96b" stroke-width="2.6" stroke-linecap="round"/>' + bubble(o) + at(86, 88, .36, kashikiP()),
    'nakajimai': (o) => '<rect x="0" y="84" width="100" height="16" fill="#d6c690"/>'
      + an(o, 'slideL', bowl('normal', 40, 72, .62, 'empty') + '<path d="M23,59 Q40,55 58,57" stroke="#c9a96b" stroke-width="2.6" fill="none" stroke-linecap="round"/>') + an(o, 'drop', place(TOOL.natsume(), 72, 74, .4)),
    'kama-mizu': (o) => place(TOOL.furo(), 40, 64, .72) + kamaMouth(40) + '<line x1="98" y1="10" x2="66" y2="28" stroke="#c9a96b" stroke-width="3" stroke-linecap="round"/><g transform="translate(60,32) rotate(35)"><rect x="-7" y="-6" width="14" height="12" rx="2" fill="#d8bf87"/></g>'
      + stream('M55,37 Q46,38 42,42', o) + place(TOOL.mizusashi(), 86, 80, .3),
    'taishutsu': (o) => sadoguchi(o, true),
  };

  // 歩き方ステージで拝見したときの絵
  const VIEW_PIC = {
    toko: () => '<rect x="56" y="8" width="40" height="84" fill="#d9ccab" stroke="#6b5a40" stroke-width="2"/><rect x="66" y="14" width="20" height="48" fill="#f7f3e8" stroke="#a89668"/><path d="M76,22 q-3,6 1,10 q4,4 -1,8 M73,48 l6,0" stroke="#2b2622" stroke-width="1.6" fill="none"/><path d="M70,90 L82,90 L80,74 L72,74 Z" fill="#6b5a40"/><circle cx="74" cy="70" r="3.5" fill="#d04a5a"/><circle cx="79" cy="72" r="3" fill="#d04a5a"/>' + floor + fig(G('bow'), -16, 9, .8) + '<rect x="40" y="89" width="12" height="3" rx="1.5" fill="#8a6c3b"/>',
    kama: () => floor + place(TOOL.furo(), 76, 58, .62) + fig(G('view'), -12, 9, .82),
    seat: () => floor + fig(G('sit'), 6, 9, .88) + sparkle(80, 26, 7) + sparkle(90, 44, 4, BLUSH) + sparkle(70, 12, 4),
    // お詰めが入口の戸を閉める
    door: () => '<rect x="56" y="22" width="40" height="70" fill="#d9ccab" stroke="#6b5a40" stroke-width="2"/><rect x="60" y="54" width="32" height="38" fill="#3a3530"/><rect x="66" y="54" width="26" height="38" fill="#efe9d6" stroke="#8a7448" stroke-width="1.5"/><path d="M70,58 L70,88 M86,58 L86,88" stroke="#b9ad8f"/>'
      + arrowH(88, 72, 46) + floor + fig(G('sit'), -10, 9, .82),
  };

  // ---------- お菓子 ----------
  const plate = '<path d="M14,72 L84,68 L88,90 L12,92 Z" fill="#fbf9f2" stroke="#ddd5c2"/>';
  const SWEETS = {
    '花びら餅': '<rect x="16" y="57" width="68" height="3.4" rx="1.7" fill="#8a5a2b" transform="rotate(-6 50 59)"/><path d="M26,72 Q50,32 74,72 Z" fill="#fbf6ee" stroke="#e5d9c6"/><path d="M35,70 Q50,48 65,70 Z" fill="#f2bfcb" opacity=".75"/>',
    'うぐいす餅': '<path d="M20,68 Q50,38 80,68 Q50,76 20,68 Z" fill="#9fae55"/>' + at(52, 62, 1, dots(12, '#c5cf86', 1, 13, 4)) + '<circle cx="30" cy="62" r="1.8" fill="#2b2622"/><path d="M21,66 L15,67.5 L21,69 Z" fill="#e3a34a"/>',
    '草餅': '<ellipse cx="50" cy="66" rx="20" ry="12" fill="#6f8f3a"/>' + at(50, 66, 1, dots(14, '#4f6f2a', .9, 15, 8)) + '<ellipse cx="44" cy="61" rx="7" ry="3" fill="#ffffff26"/>',
    '桜餅': '<path d="M24,72 Q34,40 76,46 Q70,78 24,72 Z" fill="#7d8a3a"/><path d="M30,68 Q50,58 72,50" stroke="#5f6a2a" stroke-width="1.2" fill="none"/><ellipse cx="48" cy="60" rx="16" ry="12" fill="#f3b6c6"/>' + at(48, 60, 1, dots(16, '#f8d2dc', 1, 12, 6)),
    '柏餅': '<path d="M26,74 Q50,40 74,74 Z" fill="#f6f1e6" stroke="#e2d8c5"/><path d="M18,72 Q22,44 42,40 Q64,34 80,50 Q84,64 74,74 Q50,62 18,72 Z" fill="#5e8c3a"/><path d="M24,68 Q48,52 76,52" stroke="#3f6a2a" stroke-width="1.4" fill="none"/>',
    '水無月': '<path d="M22,76 L78,76 L50,40 Z" fill="#f4efe4" stroke="#e2d8c5"/>' + at(50, 54, 1, dots(16, '#7a2f2f', 1.6, 9, 2)),
    '葛まんじゅう': '<path d="M20,74 Q40,56 80,64 Q60,84 20,74 Z" fill="#6f9a3a"/><ellipse cx="50" cy="62" rx="9" ry="7" fill="#6b2f2f"/><ellipse cx="50" cy="62" rx="18" ry="13" fill="#e4f1f3" opacity=".72" stroke="#c7dde0"/><ellipse cx="44" cy="56" rx="5" ry="2.4" fill="#ffffffaa"/>',
    '水羊羹': '<path d="M30,54 L38,46 L76,46 L68,54 Z" fill="#7a2e31"/><rect x="30" y="54" width="38" height="22" fill="#5a1f22"/><path d="M68,54 L76,46 L76,68 L68,76 Z" fill="#46171a"/><line x1="34" y1="58" x2="50" y2="58" stroke="#ffffff33" stroke-width="2"/>',
    '月見団子': [[36, 70], [50, 70], [64, 70], [43, 58], [57, 58], [50, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="#fbf8f0" stroke="#e2d8c5"/>`).join(''),
    '栗きんとん': '<path d="M32,72 Q30,50 50,46 Q70,50 68,72 Q50,78 32,72 Z" fill="#d9a944"/><path d="M44,48 q6,-6 12,0 M42,54 q8,-5 16,0" stroke="#b8862a" stroke-width="1.5" fill="none"/>' + at(50, 64, 1, dots(12, '#c4922f', .9, 13, 7)),
    '亥の子餅': '<path d="M38,55 L41,48 L45,54 Z" fill="#8a5a2e"/><ellipse cx="50" cy="64" rx="21" ry="12" fill="#9a6a3a"/><path d="M38,60 Q52,54 67,60 M37,65 Q52,59 68,65 M39,70 Q52,64 66,70" stroke="#5a3a1e" stroke-width="1.6" fill="none"/><circle cx="36" cy="60" r="1.7" fill="#2b2622"/><ellipse cx="30" cy="66" rx="3.2" ry="2.6" fill="#7a4a28"/><circle cx="29" cy="66" r=".6" fill="#2b2622"/><circle cx="31.2" cy="66" r=".6" fill="#2b2622"/>',
    '柚子饅頭': '<circle cx="50" cy="62" r="14" fill="#e8c23a"/>' + at(50, 62, 1, dots(14, '#d4ab22', .9, 11, 5)) + '<line x1="50" y1="48" x2="51" y2="44" stroke="#5a4a2a" stroke-width="1.6"/>' + leaf(51, 45, 10, -20, '#4e7a3a'),
  };

  // ---------- 茶花（竹の花入） ----------
  const vase = '<path d="M41,60 L59,60 L58,96 L42,96 Z" fill="#c9b47a"/><line x1="41.4" y1="72" x2="58.6" y2="72" stroke="#a08850" stroke-width="1.5"/><ellipse cx="50" cy="60" rx="9" ry="2.5" fill="#8a7448"/>';
  const FLOWERS = {
    '結び柳': stem('M50,60 C47,30 30,14 18,30 C10,42 12,66 16,84', '#8aa84a', 1.3) + stem('M50,60 C54,28 72,12 84,30 C92,44 88,70 84,92', '#8aa84a', 1.3) + stem('M50,60 C50,36 40,22 30,40 C24,52 26,76 28,94', '#9cb85a', 1.1) + '<circle cx="16" cy="88" r="4.5" fill="none" stroke="#8aa84a" stroke-width="1.4"/>' + [[22, 26], [80, 26], [88, 46], [14, 50], [30, 44], [86, 66], [26, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#b5cf6e"/>`).join(''),
    '梅': stem('M50,60 L46,44 L56,30 L50,14', '#4a3426', 2.6) + stem('M47,46 L30,36', '#4a3426', 2) + stem('M55,32 L70,24', '#4a3426', 1.8) + fl(46, 44, 7, '#fbe7ec', '#c0272d') + fl(56, 30, 6, '#fbe7ec', '#c0272d') + fl(30, 36, 6, '#fbe7ec', '#c0272d') + fl(70, 24, 5, '#fbe7ec', '#c0272d') + '<circle cx="50" cy="14" r="2.6" fill="#e9a0ae"/><circle cx="38" cy="41" r="2.2" fill="#e9a0ae"/>',
    '桃': stem('M50,60 L48,40 L56,22', '#5a3a2a', 2.4) + stem('M49,44 L34,32', '#5a3a2a', 1.8) + leaf(56, 24, 12, -60, '#6f9a3a') + leaf(34, 32, 11, -140, '#6f9a3a') + leaf(50, 46, 11, 10, '#6f9a3a') + fl(48, 40, 7, '#f19ec2', '#c0476f') + fl(56, 22, 6, '#f19ec2', '#c0476f') + fl(34, 32, 6, '#f6b6d2', '#c0476f'),
    '山吹': stem('M50,60 C44,40 30,30 18,34', '#5f8a3a') + stem('M50,60 C56,36 70,26 82,30', '#5f8a3a') + stem('M50,60 C50,40 48,26 46,14', '#5f8a3a') + leaf(30, 32, 10, 200, '#6f9a3a') + leaf(68, 28, 10, -30, '#6f9a3a') + leaf(48, 30, 10, -120, '#6f9a3a') + fl(18, 34, 7, '#f2c230', '#d99a12') + fl(82, 30, 7, '#f2c230', '#d99a12') + fl(46, 14, 6, '#f2c230', '#d99a12'),
    '杜若': '<path d="M44,60 C42,40 40,26 37,10 C43,26 46,42 47,60 Z" fill="#4e7a3a"/><path d="M53,60 C55,42 58,30 62,16 C60,32 57,46 56,60 Z" fill="#4e7a3a"/><path d="M48,60 C48,46 49,36 50,30 C51,40 51,50 51,60 Z" fill="#5f8a3a"/><ellipse cx="44" cy="30" rx="7" ry="4" fill="#4f4fa8" transform="rotate(30 44 30)"/><ellipse cx="57" cy="30" rx="7" ry="4" fill="#4f4fa8" transform="rotate(-30 57 30)"/><ellipse cx="50.5" cy="22" rx="3.5" ry="7" fill="#6a6ac4"/><path d="M42,30 l5,2 M59,30 l-5,2" stroke="#f2e6a0" stroke-width="1.4"/>',
    '紫陽花': leaf(50, 46, 20, 160, '#4e7a3a') + leaf(50, 46, 20, 20, '#5f8a3a') + [[50, 30], [40, 26], [60, 26], [44, 38], [56, 38], [36, 34], [64, 34], [50, 20], [42, 18], [58, 18], [50, 40]].map(([x, y], i) => fl(x, y, 5, ['#7d8fd1', '#9aa6e0', '#8a7fd0'][i % 3], '#e8ecff', 4)).join(''),
    '槿': stem('M50,60 L50,34', '#4e7a3a') + leaf(50, 46, 14, 200, '#4e7a3a') + leaf(50, 42, 14, -20, '#5f8a3a') + fl(48, 28, 12, '#fbfaf5', '#c0272d') + '<ellipse cx="66" cy="40" rx="3" ry="5" fill="#e8efe0" transform="rotate(30 66 40)"/>',
    '桔梗': stem('M50,60 L50,26', '#4e7a3a', 1.4) + stem('M50,48 L64,40', '#4e7a3a', 1.2) + leaf(50, 52, 9, 210, '#5f8a3a') + leaf(50, 44, 9, -30, '#5f8a3a') + fl(50, 24, 11, '#5a63b8', '#e8e4f8') + '<ellipse cx="65" cy="38" rx="4.5" ry="5.5" fill="#7a82cc"/>',
    '萩・すすき': stem('M52,60 C54,40 60,24 72,10', '#a8956a', 1.4) + [[66, 16], [69, 13], [63, 20], [72, 10], [60, 24]].map(([x, y]) => `<path d="M${x},${y} q8,2 12,8" stroke="#d8c49a" stroke-width="2" fill="none" stroke-linecap="round"/>`).join('') + stem('M48,60 C40,44 28,36 14,40', '#6b8a4a', 1.2) + stem('M48,60 C44,48 36,30 30,22', '#6b8a4a', 1.2) + [[18, 39], [24, 37], [30, 37], [36, 40], [32, 26], [35, 31], [40, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#b980b8"/>`).join(''),
    '秋明菊': stem('M50,60 C50,46 48,34 46,26', '#5f8a3a', 1.2) + stem('M49,44 C54,40 58,38 62,34', '#5f8a3a', 1.1) + leaf(49, 54, 10, 200, '#4e7a3a') + fl(46, 24, 11, '#efb0c4', '#e3c03a', 6) + '<circle cx="62" cy="33" r="3" fill="#8aa84a"/>',
    '照葉と白玉椿': stem('M50,60 L44,40 L30,28', '#5a3a2a', 1.8) + leaf(30, 28, 12, 200, '#c8532c') + leaf(38, 34, 11, -110, '#e08a2e') + leaf(44, 42, 10, 190, '#d0612e') + stem('M51,60 L56,40', '#3f5a2a', 1.6) + leaf(56, 44, 12, -10, '#2f5a2a') + leaf(56, 44, 12, 170, '#2f5a2a') + fl(58, 32, 11, '#fbfaf5', '#e8c23a'),
    '侘助（椿）': stem('M50,60 L50,38', '#3f5a2a', 1.6) + leaf(50, 48, 14, -25, '#2f5a2a') + leaf(50, 44, 14, 205, '#2f5a2a') + leaf(50, 38, 11, -70, '#3f6a2a') + '<path d="M42,32 Q50,18 58,32 Q56,40 50,40 Q44,40 42,32 Z" fill="#d04a5a"/><path d="M46,30 Q50,22 54,30" stroke="#f0a0aa" stroke-width="1.4" fill="none"/><circle cx="50" cy="30" r="2" fill="#f2d36b"/><ellipse cx="64" cy="44" rx="3" ry="4.5" fill="#b8384a" transform="rotate(25 64 44)"/>',
  };

  // ---------- 季節シミュレーションの選択肢の絵 ----------
  const tatamiSide = '<rect x="4" y="74" width="92" height="22" fill="#d6c690"/>';
  const roSide = (w) => `<rect x="${50 - w / 2}" y="78" width="${w}" height="12" fill="#2a2421" stroke="#3a2d22" stroke-width="4"/>`;
  const tatamiTop = '<rect x="6" y="20" width="88" height="60" fill="#d6c690"/><rect x="6" y="20" width="88" height="5" fill="#2f3a2a"/><rect x="6" y="75" width="88" height="5" fill="#2f3a2a"/>';
  const KAMA_PIC = {
    normal: () => tatamiSide + roSide(52) + kama(50, 66, 1),
    tsuri: () => tatamiSide + roSide(52) + '<line x1="50" y1="2" x2="50" y2="40" stroke="#555" stroke-width="2.2" stroke-dasharray="4 2"/>' + kama(50, 54, 1),
    sukigi: () => tatamiSide + roSide(52) + '<rect x="18" y="70" width="14" height="6" fill="#a68d58"/><rect x="68" y="70" width="14" height="6" fill="#a68d58"/>' + kama(50, 60, 1, true),
    nakaoki: () => tatamiTop + '<line x1="50" y1="25" x2="50" y2="75" stroke="#8a7a5c" stroke-width="1.4" stroke-dasharray="3 3"/><circle cx="50" cy="50" r="14" fill="#7d6a55"/><circle cx="50" cy="50" r="9" fill="#3a3533"/><circle cx="80" cy="50" r="7" fill="#5d6e7a"/>',
    dairo: () => tatamiTop + '<rect x="28" y="28" width="44" height="44" fill="#2a2421" stroke="#3a2d22" stroke-width="5"/><circle cx="50" cy="50" r="12" fill="#3a3533"/><circle cx="50" cy="50" r="5" fill="#6a5f58"/>',
  };
  const OPT = {
    hearth: { '炉': TOOL.ro, '風炉': TOOL.furo },
    ko: {
      '練香': () => '<ellipse cx="50" cy="66" rx="30" ry="10" fill="#f4f1ea" stroke="#d6cfbd"/><circle cx="40" cy="60" r="6" fill="#4a3426"/><circle cx="54" cy="58" r="6" fill="#5a3f2e"/><circle cx="63" cy="64" r="5.5" fill="#4a3426"/>',
      '香木（白檀など）': () => '<path d="M16,56 L80,52 L84,76 L14,80 Z" fill="#fbf9f2" stroke="#d6cfbd"/><rect x="32" y="60" width="18" height="5" rx="1" fill="#c9a26b" transform="rotate(-12 41 62)"/><rect x="50" y="64" width="15" height="5" rx="1" fill="#b98f58" transform="rotate(8 57 66)"/><rect x="40" y="69" width="13" height="4" rx="1" fill="#d4b07a" transform="rotate(-4 46 71)"/>',
    },
    kogo: {
      '陶磁器': () => '<path d="M26,62 Q26,80 50,80 Q74,80 74,62 Z" fill="#f4f1ea" stroke="#d6cfbd"/><path d="M26,62 Q26,44 50,44 Q74,44 74,62 Z" fill="#faf8f2" stroke="#d6cfbd"/><path d="M36,55 q7,-7 14,0 q7,7 14,0" stroke="#2f4f8f" stroke-width="2" fill="none"/><path d="M34,70 q8,5 16,0 q8,-5 16,0" stroke="#2f4f8f" stroke-width="2" fill="none"/><circle cx="50" cy="44" r="3" fill="#2f4f8f"/>',
      '木地・塗物': () => '<ellipse cx="50" cy="68" rx="28" ry="12" fill="#141210"/><rect x="22" y="56" width="56" height="12" fill="#1d1a19"/><ellipse cx="50" cy="56" rx="28" ry="12" fill="#2a2522"/><path d="M36,56 q6,-6 12,0 M50,52 q6,-6 12,0" stroke="#c9a23a" stroke-width="1.8" fill="none"/><circle cx="44" cy="59" r="2" fill="#c9a23a"/>',
    },
  };
  function opt(key, value) {
    const pick = (map) => Object.keys(map).find((k) => map[k] === value);
    let body = '';
    if (OPT[key] && OPT[key][value]) body = OPT[key][value]();
    else if (key === 'kama') { const k = pick(KAMA); if (k) body = KAMA_PIC[k](); }
    else if (key === 'cup') { const k = pick(CUP); if (k) body = bowl(k, 50, 62, k === 'hira' ? 1.15 : 1.25); }
    else if (key === 'kashi' && SWEETS[value]) body = place(plate + SWEETS[value], 50, 40, 1.3);
    else if (key === 'hana' && FLOWERS[value]) body = vase + FLOWERS[value];
    else if (key === 'chasen') { const k = pick(CHASEN); if (k) body = chasenBody(k); }
    else if (key === 'foam') { const k = pick(FOAM); if (k) body = at(50, 50, 1.3, bowlTop(k)); }
    else if (key === 'dashi') { const k = pick(DASHI); if (k) body = at(50, 66, 1.25, dashiP(k)) + bowl('normal', 50, 56, .6, 'koicha'); }
    return body ? svg(body) : '';
  }

  // ---------- 茶室・草庵・掛軸 ----------
  const teahouse = () => '<rect x="0" y="78" width="100" height="22" fill="#cfd9b0"/><rect x="18" y="46" width="64" height="34" fill="#d8c49a"/><rect x="18" y="70" width="64" height="10" fill="#b9a57a"/><path d="M6,52 L28,24 L72,24 L94,52 Z" fill="#9a8758"/><path d="M28,24 L72,24 L70,28 L30,28 Z" fill="#7a6a42"/>' + [16, 26, 36, 46, 56, 66, 76, 86].map((x) => `<line x1="${x}" y1="50" x2="${n1(28 + (x - 6) * 44 / 88)}" y2="28" stroke="#857346" stroke-width="1"/>`).join('') + '<rect x="14" y="50" width="72" height="4" fill="#00000022"/><circle cx="34" cy="60" r="7" fill="#f3ead2" stroke="#8a7448" stroke-width="1.5"/><path d="M29,57 L39,63 M29,63 L39,57 M34,53 L34,67" stroke="#a08850" stroke-width="1"/><rect x="56" y="64" width="15" height="15" fill="#6b5232"/><line x1="63.5" y1="64" x2="63.5" y2="79" stroke="#4e3a22"/><ellipse cx="66" cy="88" rx="8" ry="3" fill="#a9a39a"/><ellipse cx="52" cy="94" rx="7" ry="2.6" fill="#a9a39a"/><ellipse cx="38" cy="90" rx="6" ry="2.4" fill="#a9a39a"/>' + sparkle(88, 14, 4) + '<circle cx="12" cy="14" r="6" fill="#f6d36b" opacity=".9"/>';
  const scroll = () => '<rect x="30" y="10" width="40" height="5" rx="1" fill="#7a5c3a"/><rect x="33" y="15" width="34" height="68" fill="#d9ccab"/><rect x="37" y="20" width="26" height="56" fill="#f7f3e8"/><path d="M50,26 q-4,6 1,10 q5,4 -1,9 M45,52 l10,0 M50,56 q-5,6 0,12" stroke="#2b2622" stroke-width="2.4" fill="none" stroke-linecap="round"/><rect x="30" y="83" width="40" height="5" rx="1" fill="#7a5c3a"/><circle cx="28" cy="85.5" r="3" fill="#5a4026"/><circle cx="72" cy="85.5" r="3" fill="#5a4026"/>';

  const SCROLL = ['', '寿', '春光', '桃花笑', '春風', '薫風', '青山', '瀧', '清風', '月', '紅葉', '福寿', '無事'];
  const FLOWER_COLOR = ['', '#9cb85a', '#fbe7ec', '#f19ec2', '#f2c230', '#5b5fb5', '#7d8fd1', '#fbfaf5', '#5a63b8', '#b980b8', '#efb0c4', '#fbfaf5', '#d04a5a'];
  // 茶室の絵。pick = 遊んだ人が選んだ道具（間違っていても、そのまま描く）。亭主も座る。
  function room(m, pick, o) {
    o = o || {};
    const isRo = pick.hearth === '炉';
    const kamaKey = pick.kama;
    const hx = (kamaKey === 'nakaoki' && !isRo) ? 206 : 232;
    const scr = SCROLL[m].split('').map((c, i) => `<text x="62" y="${52 + i * 18}" font-size="15" text-anchor="middle" fill="#222" font-family="serif">${c}</text>`).join('');
    let hearth;
    if (isRo) {
      const w = kamaKey === 'dairo' ? 70 : 52;
      hearth = `<rect x="${hx - w / 2}" y="180" width="${w}" height="16" fill="#2a2421" stroke="#3a2d22" stroke-width="4"/>`;
      if (kamaKey === 'tsuri') hearth += `<line x1="${hx}" y1="0" x2="${hx}" y2="150" stroke="#555" stroke-width="2" stroke-dasharray="4 2"/>` + kama(hx, 162, 0.85);
      else if (kamaKey === 'sukigi') hearth += `<rect x="${hx - 34}" y="176" width="12" height="5" fill="#a68d58"/><rect x="${hx + 22}" y="176" width="12" height="5" fill="#a68d58"/>` + kama(hx, 168, 0.85, true);
      else hearth += kama(hx, 174, 0.85);
    } else {
      hearth = place(TOOL.furo(), hx, 152, .95);   // 道具の絵の風炉（敷板・釜つき）
    }
    const summer = m === 7 || m === 8;
    const fc = FLOWER_COLOR[m];
    return svg(`
      <rect width="360" height="230" fill="#efe6d0"/>
      <rect x="0" y="0" width="360" height="140" fill="#e6dbc0"/>
      <rect x="20" y="10" width="86" height="160" fill="#d9ccab" stroke="#6b5a40" stroke-width="3"/>
      <rect x="44" y="22" width="36" height="100" fill="#f7f3e8" stroke="#a89668"/>
      <rect x="40" y="18" width="44" height="6" fill="#7a5c3a"/><rect x="40" y="120" width="44" height="6" fill="#7a5c3a"/>
      ${scr}
      <path d="M54,170 L70,170 L66,146 L58,146 Z" fill="#6b5a40"/>
      <line x1="62" y1="146" x2="56" y2="128" stroke="#4e7a3a" stroke-width="2"/><line x1="62" y1="146" x2="68" y2="132" stroke="#4e7a3a" stroke-width="2"/>
      <circle cx="56" cy="128" r="5" fill="${fc}" stroke="#0003"/><circle cx="68" cy="132" r="4" fill="${fc}" stroke="#0003"/>
      <rect x="0" y="170" width="360" height="60" fill="#d6c690"/>
      <line x1="120" y1="170" x2="120" y2="230" stroke="#3a3a2a" stroke-width="3"/>
      <line x1="0" y1="170" x2="360" y2="170" stroke="#6b5a40" stroke-width="3"/>
      ${hearth}
      <g transform="translate(280,192)"><path d="M-15,-28 L15,-28 L14,6 Q0,10 -14,6 Z" fill="${summer ? '#9ccfd6' : '#5d6e7a'}" opacity="${summer ? .85 : 1}"/><ellipse cx="0" cy="-28" rx="15" ry="4" fill="#2d2a28"/></g>
      ${fig(flip(H('sit', o.school)), 292, 124, .78)}
      ${bowl(pick.cupKey || 'normal', 184, 208, 0.7)}
      <g transform="translate(148,198)"><ellipse cx="0" cy="0" rx="22" ry="6" fill="#1d1a19"/><ellipse cx="0" cy="-5" rx="9" ry="6" fill="#f0d9de"/></g>
    `, '0 0 360 230');
  }

  // ---------- 歩き方ステージの盤面（茶室を上から見た図） ----------
  // 半畳を1区画（U＝104px）とし、区画の中央と区画の境目をマス（52px）にする（data.js の ROOMS の説明を参照）。
  // 境目のマスは、同じ畳なら畳のまん中、違う畳なら畳の縁（へり）。縁は、畳と畳のすき間の色で描く。
  const WALL = 10, TOKO = 40, U = 104, CELL = 52;
  function walkCell(gx, gy) { return { x: WALL + CELL / 2 + gx * CELL, y: TOKO + WALL + CELL / 2 + gy * CELL, w: CELL, h: CELL }; }
  const unitRect = (ux0, uy0, ux1, uy1) => ({ x: WALL + ux0 * U, y: TOKO + WALL + uy0 * U, w: (ux1 - ux0 + 1) * U, h: (uy1 - uy0 + 1) * U });
  // 出入口（左の壁か下の壁）。small＝にじり口（小さな戸）、そうでなければ襖（茶道口・広間の入口）
  function wallDoor(d, small, W, Hh) {
    const len = small ? 66 : U - 16, col = small ? ['#c9b47a', '#8a7448'] : ['#efe9d6', '#b9ad8f'];
    if (d.side === 'bottom') {
      const x = unitRect(d.u, 0, d.u, 0).x + (U - len) / 2;
      return `<rect x="${x}" y="${Hh - WALL}" width="${len}" height="${WALL}" fill="${col[0]}"/><line x1="${x + 4}" y1="${Hh - 5}" x2="${x + len - 4}" y2="${Hh - 5}" stroke="${col[1]}" stroke-width="2"/>`;
    }
    const y = unitRect(0, d.u, 0, d.u).y + (U - len) / 2, x = d.side === 'left' ? 0 : W - WALL;
    return `<rect x="${x}" y="${y}" width="${WALL}" height="${len}" fill="${col[0]}"/><line x1="${x + 5}" y1="${y + 4}" x2="${x + 5}" y2="${y + len - 4}" stroke="${col[1]}" stroke-width="2"/>`;
  }
  // room: ROOMS の1つ。o: { winter, school, color（自分の着物の色）, noMe（自分の人形を出さない＝下見用） }
  function walkBoard(room, o) {
    const L = matsOf(room, o.winter), uw = L[0].length, uh = L.length;
    const W = uw * U + WALL * 2, Hh = TOKO + WALL * 2 + uh * U;
    const mat = (r, vertical) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#dccf98"/>` + (vertical
      ? [...Array(Math.floor(r.w / 6))].map((_, i) => `<line x1="${r.x + 3 + i * 6}" y1="${r.y}" x2="${r.x + 3 + i * 6}" y2="${r.y + r.h}" stroke="#cbbd84" stroke-width="1"/>`).join('')
      : [...Array(Math.floor(r.h / 6))].map((_, i) => `<line x1="${r.x}" y1="${r.y + 3 + i * 6}" x2="${r.x + r.w}" y2="${r.y + 3 + i * 6}" stroke="#cbbd84" stroke-width="1"/>`).join(''));
    let s = `<rect width="${W}" height="${Hh}" fill="#efe6d0"/>`;
    // 床の間（上の壁の、区画 toko の上）。掛物と花
    const tk = unitRect(room.toko[0], 0, room.toko[1], 0), cx = tk.x + tk.w / 2;
    s += `<rect x="${tk.x}" y="0" width="${tk.w}" height="${TOKO + WALL}" fill="#e6dbc0"/><rect x="${tk.x}" y="${TOKO}" width="${tk.w}" height="${WALL}" fill="#b89a6a"/><rect x="${tk.x}" y="${TOKO + WALL - 3}" width="${tk.w}" height="3" fill="#2b2622"/>`
      + `<rect x="${cx - 40}" y="4" width="26" height="34" fill="#f7f3e8" stroke="#a89668"/><rect x="${cx - 43}" y="2" width="32" height="4" fill="#7a5c3a"/><path d="M${cx - 27},10 q-3,5 1,8 q4,3 -1,7" stroke="#2b2622" stroke-width="1.6" fill="none"/>`
      + `<path d="M${cx + 24},40 L${cx + 36},40 L${cx + 34},26 L${cx + 26},26 Z" fill="#c9b47a"/>${o.winter ? fl(cx + 30, 22, 6, '#d04a5a', '#f2d36b') : fl(cx + 30, 22, 6, '#5a63b8', '#e8e4f8')}`;
    // 壁（床の間の左右の上の壁と、左・右・下の壁）
    s += `<rect x="0" y="0" width="${tk.x}" height="${TOKO + WALL}" fill="#7a5c3a"/><rect x="${tk.x + tk.w}" y="0" width="${W - tk.x - tk.w}" height="${TOKO + WALL}" fill="#7a5c3a"/>`
      + `<rect x="0" y="0" width="${WALL}" height="${Hh}" fill="#7a5c3a"/><rect x="${W - WALL}" y="0" width="${WALL}" height="${Hh}" fill="#7a5c3a"/><rect x="0" y="${Hh - WALL}" width="${W}" height="${WALL}" fill="#7a5c3a"/>`;
    // 畳：下地を縁の色で塗り、一枚ずつ少し内側に描く（違う畳どうしのすき間が縁になる）。点前畳 B は少し色分け
    s += `<rect x="${WALL}" y="${TOKO + WALL}" width="${uw * U}" height="${uh * U}" fill="#2f3a2a"/>`;
    [...new Set(L.join(''))].forEach((ch) => {
      let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
      L.forEach((row, uy) => [...row].forEach((c, ux) => { if (c === ch) { x0 = Math.min(x0, ux); y0 = Math.min(y0, uy); x1 = Math.max(x1, ux); y1 = Math.max(y1, uy); } }));
      const u = unitRect(x0, y0, x1, y1), r = { x: u.x + 3, y: u.y + 3, w: u.w - 6, h: u.h - 6 };
      s += mat(r, y1 - y0 > x1 - x0);
      if (ch === 'B') s += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#e0603e" opacity=".12"/>`;
    });
    // 出入口：客の入口（小間はにじり口、広間は襖）と、亭主の茶道口
    s += wallDoor(room.gate, room.small, W, Hh) + wallDoor(room.sado, false, W, Hh);
    // 炉（冬）は、その半畳の左上の角に一尺四寸角（点前畳の長い辺の真ん中から下座側）。風炉（夏）は点前畳の上半分の左寄り
    if (o.winter) {
      const r = unitRect(room.ro[0] / 2, room.ro[1] / 2, room.ro[0] / 2, room.ro[1] / 2), sz = 46, x = r.x + 3, y = r.y + 3;
      s += `<rect x="${x}" y="${y}" width="${sz}" height="${sz}" fill="#2a2421" stroke="#6b4a2a" stroke-width="5"/><circle cx="${x + sz / 2}" cy="${y + sz / 2}" r="12" fill="#3a3533"/><circle cx="${x + sz / 2}" cy="${y + sz / 2}" r="5" fill="#6a5f58"/>`;
    } else {
      const r = unitRect(room.furo[0] / 2, room.furo[1] / 2, room.furo[0] / 2, room.furo[1] / 2), x = r.x + 38, y = r.y + 46;
      s += `<rect x="${x - 25}" y="${y - 25}" width="50" height="50" fill="#a07d50" opacity=".5"/><circle cx="${x}" cy="${y}" r="19" fill="#7d6a55"/><circle cx="${x}" cy="${y}" r="12" fill="#3a3533"/><circle cx="${x}" cy="${y}" r="5" fill="#6a5f58"/>`;
    }
    // 亭主は席入りのあいだ茶道口の向こうで待つ。客が全員座ったら walkHost で入ってくる
    s += '<g id="wk-goal"></g><g id="wk-npc"></g><g id="wk-fp"></g>'
      + (o.noMe ? '' : `<g id="wk-me" style="transition:transform .28s"><g class="bob"><g transform="translate(-24,-50) scale(.48)">${chibi(o.color || GUEST, null, MALE)}</g></g></g>`);
    return svg(s, `0 0 ${W} ${Hh}`);
  }
  // 席に着いているほかの客
  // 客が全員座ったあとに入ってくる亭主（点前座に座る）
  const walkHost = (room, sch) => { const c = walkCell(room.host[0], room.host[1]); return `<g class="npc host" transform="translate(${c.x + c.w / 2 - 25},${c.y + c.h - 50}) scale(.5)">${chibiSeat(schoolColor(sch), MALE, MALE ? FUKUSA : FUKUSA_F)}</g>`; };
  const walkNpc = (gx, gy, color, male) => { const c = walkCell(gx, gy); return `<g class="npc" transform="translate(${c.x + c.w / 2 - 22},${c.y + c.h - 46}) scale(.44)">${chibiSeat(color, male)}</g>`; };
  // 足あと（次に進めるマス）
  function walkFoot(c) {
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    return `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="transparent"/><ellipse cx="${cx - 4}" cy="${cy}" rx="3.4" ry="6" fill="#8a5a2b" opacity=".55"/><ellipse cx="${cx + 4}" cy="${cy - 3}" rx="3.4" ry="6" fill="#8a5a2b" opacity=".55"/>`;
  }
  const walkGoal = (c) => `<rect class="goalmark" x="${c.x + 2}" y="${c.y + 2}" width="${c.w - 4}" height="${c.h - 4}" rx="8" fill="#f6c84b" opacity=".45"/>`;

  // ---------- クイズ・メニューの絵 ----------
  // 上から順に、問題文に含まれる語で絵を選ぶ（答えを絵でばらさない順にしてある）
  const twoChasen = () => place(chasenBody('susu'), 32, 52, .72) + place(chasenBody('shira'), 68, 52, .72);
  const QUIZ_PIC = [
    ['茶筅の竹', twoChasen], ['点て方', TOOL.chawan],
    ['茶筅', () => chasenBody('shira')], ['茶杓', TOOL.chashaku], ['棗', TOOL.natsume], ['茶入', TOOL.chaire], ['水指', TOOL.mizusashi],
    ['建水', TOOL.kensui], ['蓋置', TOOL.futaoki], ['柄杓', TOOL.hishaku], ['帛紗', TOOL.fukusa], ['茶巾', TOOL.chakin],
    ['風炉', TOOL.furo], ['炉', TOOL.ro], ['香合', OPT.kogo['陶磁器']], ['香', OPT.ko['練香']], ['扇子', TOOL.sensu], ['釜', TOOL.kama],
    ['お辞儀', () => floor + fig(G('bow'), -4, 9, .9)], ['拝見', () => floor + fig(G('view', { item: bowl('normal', 74, 76, .3) }), 0, 9, .9)],
    ['茶碗', TOOL.chawan], ['菓子', TOOL.kashiki], ['花', () => vase + FLOWERS['槿']], ['濃茶', () => bowl('normal', 50, 60, 1.2, 'koicha')],
    ['薄茶', () => at(50, 50, 1.3, bowlTop('full'))], ['茶室', teahouse], ['入口', teahouse], ['茶事', scroll], ['茶席', scroll],
  ];
  function quiz(text) {
    const hit = QUIZ_PIC.find(([k]) => text.includes(k));
    if (hit) return svg(hit[1]());
    if (/庵号|家元|興した|組織|由来|千家/.test(text)) return svg(teahouse());
    return svg(mascot('think'));
  }
  function menu(id, sch, m) {
    const o = { school: sch };
    switch (id) {
      case 'course': return svg(teahouse());
      case 'seq': return svg(floor + fig(G('bow'), -4, 9, .9));
      case 'sim': return svg(vase + FLOWERS[MONTHS[m].hana]);
      case 'quiz': return svg(mascot('think'));
      case 'dougu': return svg(place(TOOL.natsume(), 34, 60, .62) + place(TOOL.chashaku(), 58, 66, .55) + '<circle cx="76" cy="26" r="15" fill="#fffdf7" stroke="#e0603e" stroke-width="3"/><path d="M71,22 q0,-7 6,-7 q6,0 6,6 q0,4 -6,6 l0,4 M77,37 l0,.5" stroke="#e0603e" stroke-width="3.2" fill="none" stroke-linecap="round"/>');
      case 'walk': return svg('<rect x="6" y="56" width="88" height="40" fill="#dccf98"/><rect x="6" y="72" width="88" height="6" fill="#2f3a2a"/><ellipse cx="22" cy="88" rx="3" ry="5" fill="#8a5a2b" opacity=".55"/><ellipse cx="30" cy="85" rx="3" ry="5" fill="#8a5a2b" opacity=".55"/>' + place(chibi(MALE ? GUEST_M : GUEST, null, MALE), 62, 50, .6));
      case 'video': return svg('<rect x="8" y="18" width="84" height="60" rx="8" fill="#2b2622"/><rect x="13" y="23" width="74" height="50" rx="4" fill="#f6efe0"/>' + place(mascot('happy'), 50, 48, .42) + '<circle cx="78" cy="68" r="12" fill="#e0603e"/><path d="M74,62 L84,68 L74,74 Z" fill="#fff"/><rect x="30" y="80" width="40" height="5" rx="2" fill="#7a5c3a"/>');
      case 'app': return svg('<rect x="27" y="5" width="46" height="90" rx="9" fill="#2b2622"/><rect x="31" y="13" width="38" height="72" rx="3" fill="#f6efe0"/><circle cx="50" cy="90" r="2.4" fill="#8a7a5c"/>' + place(mascot('happy'), 50, 49, .38) + sparkle(78, 18, 5) + sparkle(20, 30, 3.5, BLUSH));
      case 'zukan': return svg(place(chasenBody(school(o).chasenKey), 34, 50, .9) + place(TOOL.chashaku(), 62, 54, .8));
      case 'compare': return svg(twoChasen());
    }
    return '';
  }
  // 残りのお茶（ミスの残り回数）
  const life = (full) => svg(full
    ? '<path d="M2,8 L22,8 Q21,20 12,21 Q3,20 2,8 Z" fill="#2f2a28"/><ellipse cx="12" cy="8" rx="10" ry="2.6" fill="#8fc24f"/><path d="M9,4 q-1.5,-2 0,-3.5 M14,4 q-1.5,-2 0,-3.5" stroke="#b9b2a5" stroke-width="1.2" fill="none"/>'
    : '<path d="M2,8 L22,8 Q21,20 12,21 Q3,20 2,8 Z" fill="none" stroke="#c9bfa8" stroke-width="1.6" stroke-dasharray="2 2"/><ellipse cx="12" cy="8" rx="10" ry="2.6" fill="none" stroke="#c9bfa8" stroke-width="1.4"/>', '0 0 24 24');

  // 公開アドレス https://wataru0220.github.io/4-osero/sado/ の QR コード（29×29・誤り訂正M）。アドレスが変わったら作り直す
  const QR_PATH = 'M0 0h7v1h-7zM8 0h1v1h-1zM11 0h1v1h-1zM13 0h1v1h-1zM17 0h4v1h-4zM22 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h1v1h-1zM11 1h1v1h-1zM13 1h1v1h-1zM16 1h2v1h-2zM20 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM9 2h2v1h-2zM12 2h4v1h-4zM19 2h2v1h-2zM22 2h1v1h-1zM24 2h3v1h-3zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h1v1h-1zM10 3h2v1h-2zM13 3h2v1h-2zM17 3h1v1h-1zM20 3h1v1h-1zM22 3h1v1h-1zM24 3h3v1h-3zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM10 4h1v1h-1zM12 4h1v1h-1zM15 4h5v1h-5zM22 4h1v1h-1zM24 4h3v1h-3zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM11 5h1v1h-1zM16 5h1v1h-1zM18 5h3v1h-3zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h7v1h-7zM8 7h1v1h-1zM10 7h2v1h-2zM15 7h1v1h-1zM17 7h2v1h-2zM20 7h1v1h-1zM0 8h1v1h-1zM2 8h2v1h-2zM5 8h3v1h-3zM9 8h1v1h-1zM11 8h2v1h-2zM14 8h1v1h-1zM17 8h2v1h-2zM22 8h1v1h-1zM25 8h1v1h-1zM27 8h2v1h-2zM0 9h5v1h-5zM7 9h1v1h-1zM9 9h1v1h-1zM12 9h1v1h-1zM16 9h1v1h-1zM18 9h3v1h-3zM22 9h3v1h-3zM28 9h1v1h-1zM2 10h2v1h-2zM6 10h1v1h-1zM9 10h1v1h-1zM12 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1zM26 10h2v1h-2zM1 11h1v1h-1zM8 11h1v1h-1zM11 11h4v1h-4zM20 11h1v1h-1zM28 11h1v1h-1zM2 12h3v1h-3zM6 12h1v1h-1zM10 12h6v1h-6zM17 12h2v1h-2zM25 12h2v1h-2zM0 13h4v1h-4zM7 13h1v1h-1zM11 13h2v1h-2zM14 13h3v1h-3zM19 13h1v1h-1zM21 13h2v1h-2zM26 13h3v1h-3zM0 14h1v1h-1zM2 14h3v1h-3zM6 14h1v1h-1zM10 14h5v1h-5zM17 14h3v1h-3zM21 14h2v1h-2zM26 14h3v1h-3zM3 15h1v1h-1zM5 15h1v1h-1zM8 15h1v1h-1zM12 15h1v1h-1zM18 15h3v1h-3zM23 15h2v1h-2zM27 15h1v1h-1zM0 16h1v1h-1zM4 16h10v1h-10zM16 16h1v1h-1zM18 16h3v1h-3zM24 16h2v1h-2zM27 16h1v1h-1zM1 17h4v1h-4zM9 17h1v1h-1zM11 17h1v1h-1zM15 17h1v1h-1zM17 17h1v1h-1zM21 17h1v1h-1zM23 17h1v1h-1zM25 17h3v1h-3zM0 18h1v1h-1zM4 18h1v1h-1zM6 18h1v1h-1zM8 18h4v1h-4zM13 18h4v1h-4zM18 18h1v1h-1zM21 18h1v1h-1zM23 18h2v1h-2zM26 18h1v1h-1zM2 19h3v1h-3zM15 19h4v1h-4zM20 19h1v1h-1zM23 19h1v1h-1zM26 19h1v1h-1zM1 20h2v1h-2zM5 20h3v1h-3zM9 20h1v1h-1zM15 20h12v1h-12zM8 21h1v1h-1zM10 21h1v1h-1zM13 21h1v1h-1zM16 21h5v1h-5zM24 21h5v1h-5zM0 22h7v1h-7zM8 22h1v1h-1zM10 22h4v1h-4zM16 22h1v1h-1zM18 22h3v1h-3zM22 22h1v1h-1zM24 22h2v1h-2zM27 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM8 23h2v1h-2zM12 23h3v1h-3zM18 23h3v1h-3zM24 23h2v1h-2zM0 24h1v1h-1zM2 24h3v1h-3zM6 24h1v1h-1zM11 24h2v1h-2zM17 24h2v1h-2zM20 24h5v1h-5zM26 24h3v1h-3zM0 25h1v1h-1zM2 25h3v1h-3zM6 25h1v1h-1zM8 25h8v1h-8zM23 25h3v1h-3zM28 25h1v1h-1zM0 26h1v1h-1zM2 26h3v1h-3zM6 26h1v1h-1zM8 26h2v1h-2zM12 26h2v1h-2zM16 26h4v1h-4zM21 26h1v1h-1zM23 26h1v1h-1zM26 26h1v1h-1zM28 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM9 27h1v1h-1zM15 27h2v1h-2zM19 27h3v1h-3zM23 27h1v1h-1zM25 27h1v1h-1zM27 27h1v1h-1zM0 28h7v1h-7zM8 28h2v1h-2zM12 28h3v1h-3zM16 28h1v1h-1zM20 28h1v1h-1zM22 28h1v1h-1zM25 28h1v1h-1zM27 28h1v1h-1z';
  const qr = () => `<svg viewBox="-4 -4 37 37" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QRコード"><rect x="-4" y="-4" width="37" height="37" fill="#fff"/><path d="${QR_PATH}" fill="#000" shape-rendering="crispEdges"/></svg>`;

  return {
    qr,
    // 図鑑・名前当てのアイコン。小さな道具（蓋置・香合）は少し大きく見せる
    icon: (id, sch) => (TOOL[id] ? svg(place(TOOL[id]({ chasen: school({ school: sch }).chasenKey }), 50, 50, ICON_ZOOM[id] || 1)) : ''),
    step: (p, sch, anim) => (STEP[p] ? svg(STEP[p]({ school: sch, anim: !!anim })) : ''),
    viewPic: (k) => svg(VIEW_PIC[k]()),
    opt, room, quiz, menu, life, walkBoard, walkCell, walkFoot, walkGoal, walkNpc, walkHost,
    setGender: (g) => { MALE = g === 'm'; },
    mascot: (expr) => svg(mascot(expr)),
    chasen: (kind) => svg(chasenBody(kind)),
    foam: (kind) => svg(at(50, 50, 1.4, bowlTop(kind))),
    dashi: (kind) => svg(at(50, 66, 1.25, dashiP(kind)) + bowl('normal', 50, 56, .6, 'koicha')),
    teahouse: () => svg(teahouse()),
  };
})();
