// ===== 茶の湯みち：絵（SVG） =====
// 道具・人物・お菓子・茶花・茶室の絵。どれも 100×100（茶室は 360×230）の座標で描く。
// 文字は入れない（フリガナの対象外にするため・小さく表示しても読めるように）。

const ART = (function () {
  const svg = (body, vb) => `<svg viewBox="${vb || '0 0 100 100'}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
  // 100×100 で描いた絵を、中心(50,50)が (x,y) に来るよう s 倍で置く
  const place = (body, x, y, s, rot) => `<g transform="translate(${x},${y})${rot ? ` rotate(${rot})` : ''} scale(${s}) translate(-50,-50)">${body}</g>`;
  // 原点中心で描いた部品を (x,y) に s 倍で置く
  const at = (x, y, s, body, rot) => `<g transform="translate(${x},${y})${rot ? ` rotate(${rot})` : ''} scale(${s})">${body}</g>`;
  const flip = (body) => `<g transform="translate(100,0) scale(-1,1)">${body}</g>`;
  const SKIN = '#f1d3b5', HAIR = '#2b2622', GUEST = '#7d93a8', ARROW = '#b5452b', FUKUSA = '#6b3a7a';
  const schoolColor = (id) => (SCHOOLS[id] || SCHOOLS.ura).color;
  const n1 = (v) => v.toFixed(1);

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
  const floor = '<rect x="0" y="92" width="100" height="8" fill="#d6c690"/>';
  const steam = (x, y) => `<path d="M${x},${y} q-4,-6 0,-12 q4,-6 0,-12" stroke="#b9b2a5" fill="none" stroke-width="1.6" opacity=".8"/>`;

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
    if (shape === 'tsutsu') b = `<path d="M-20,-30 L20,-30 L18,14 Q0,20 -18,14 Z" fill="#6b4a3a"/><ellipse cx="0" cy="-30" rx="20" ry="5" fill="${t}"/><ellipse cx="0" cy="-30" rx="20" ry="5" fill="none" stroke="#3d2a20" stroke-width="2"/><rect x="-9" y="14" width="18" height="6" rx="2" fill="#4d3428"/>`;
    else if (shape === 'hira') b = `<path d="M-34,-10 L34,-10 Q30,10 0,12 Q-30,10 -34,-10 Z" fill="#c9b48a"/><ellipse cx="0" cy="-10" rx="34" ry="6" fill="${t}"/><ellipse cx="0" cy="-10" rx="34" ry="6" fill="none" stroke="#8e7650" stroke-width="2"/><rect x="-10" y="11" width="20" height="5" rx="2" fill="#a68f66"/>`;
    else b = `<path d="M-28,-18 L28,-18 Q26,12 0,16 Q-26,12 -28,-18 Z" fill="#2f2a28"/><ellipse cx="0" cy="-18" rx="28" ry="6" fill="${t}"/><ellipse cx="0" cy="-18" rx="28" ry="6" fill="none" stroke="#1d1a19" stroke-width="2"/><path d="M-20,-6 Q-6,0 4,-8" stroke="#6d5c4f" stroke-width="2" fill="none" opacity=".6"/><rect x="-10" y="14" width="20" height="6" rx="2" fill="#1d1a19"/>`;
    if (mark) b += ume(mark === 'left' ? -17 : mark === 'right' ? 17 : 0, -2, 4, '#efe6d2');
    return b;
  }
  const bowl = (shape, x, y, s, tea, mark) => at(x, y, s || 1, bowlBody(shape, tea, mark));

  // 上から見た茶碗（原点中心・半径31）。kind: full / mikazuki / least / koicha / empty
  function bowlTop(kind, mark) {
    let s = '<circle r="31" fill="#2f2a28"/><circle r="31" fill="none" stroke="#1d1a19" stroke-width="2"/><circle r="25.5" fill="#3a3330"/>';
    if (kind === 'full') s += '<circle r="24" fill="#c5d77c"/>' + dots(34, '#e4edb8', 1.4, 21, 11);
    else if (kind === 'mikazuki') s += '<circle r="24" fill="#c5d77c"/>' + dots(22, '#e4edb8', 1.3, 21, 5) + '<path d="M-20.8,-12 A24,24 0 0 1 20.8,-12 A45.8,45.8 0 0 0 -20.8,-12 Z" fill="#5f8a2a"/>';
    else if (kind === 'least') s += '<circle r="24" fill="#6f9634"/>' + dots(10, '#b9cf76', 2.2, 11, 3);
    else if (kind === 'koicha') s += '<circle r="24" fill="#3d5a1e"/><ellipse cx="-7" cy="-9" rx="9" ry="4" fill="#ffffff2a" transform="rotate(-25)"/>';
    else s += '<circle r="24" fill="#4a3f38"/>';
    if (mark) s += ume(0, 28, 3.2, '#efe6d2');
    return s;
  }

  // ---------- 道具（100×100） ----------
  function kama(x, y, s, wing) {
    return `<g transform="translate(${x},${y}) scale(${s || 1})">
      ${wing ? '<ellipse cx="0" cy="6" rx="34" ry="5" fill="#2b2b2b"/>' : ''}
      <path d="M-26,-6 Q-30,22 0,24 Q30,22 26,-6 Q20,-16 0,-16 Q-20,-16 -26,-6 Z" fill="#3a3533"/>
      <ellipse cx="0" cy="-14" rx="13" ry="4" fill="#6a5f58"/><circle cx="0" cy="-18" r="3" fill="#6a5f58"/>
      <circle cx="-27" cy="0" r="3" fill="#6a5f58"/><circle cx="27" cy="0" r="3" fill="#6a5f58"/>
      <path d="M-22,6 Q0,12 22,6" stroke="#57504b" stroke-width="1.5" fill="none"/></g>`;
  }
  const CH = { shira: ['#eadfbf', '#b8a77c', '#d5c391'], susu: ['#b07a40', '#6e4520', '#7a4f28'], shichiku: ['#5a4650', '#241b20', '#33272d'] };
  function chasenBody(kind) {
    const c = CH[kind] || CH.shira;
    let s = `<path d="M37,19 Q50,11 63,19 L58,62 L42,62 Z" fill="${c[0]}"/>`;
    for (let i = 0; i < 9; i++) s += `<line x1="${n1(39 + i * 2.75)}" y1="20" x2="${n1(43.5 + i * 1.6)}" y2="60" stroke="${c[1]}" stroke-width="1"/>`;
    return s + `<rect x="44" y="60" width="12" height="28" rx="2" fill="${c[2]}"/><line x1="44" y1="65" x2="56" y2="65" stroke="#1d1a19" stroke-width="2"/>`;
  }
  const kashikiP = () => '<path d="M-22,-6 L22,-6 Q20,8 0,10 Q-20,8 -22,-6 Z" fill="#1d1a19"/><ellipse cx="0" cy="-6" rx="22" ry="5" fill="#7a2418"/><ellipse cx="-7" cy="-9" rx="7.5" ry="5" fill="#f2c0cb"/><ellipse cx="7" cy="-9.5" rx="7.5" ry="5" fill="#f7f0e2"/><line x1="-24" y1="-16" x2="23" y2="-9" stroke="#a87b44" stroke-width="1.6" stroke-linecap="round"/><line x1="-24" y1="-13" x2="23" y2="-6" stroke="#a87b44" stroke-width="1.6" stroke-linecap="round"/><rect x="-9" y="9" width="18" height="3" rx="1" fill="#1d1a19"/>';
  const kaishiP = () => '<path d="M-26,-11 L22,-15 L26,11 L-22,15 Z" fill="#ebe4d2"/><rect x="-24" y="-13" width="48" height="26" fill="#fbf9f2" stroke="#d6cfbd" stroke-width="1"/><line x1="-24" y1="0" x2="24" y2="0" stroke="#e6dfcf" stroke-width="1"/>';
  const sweetP = (c) => `<ellipse cx="0" cy="0" rx="11" ry="7.5" fill="${c || '#f0b7c4'}"/><path d="M-6,-3 q6,-4 12,0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/>`;
  const fukusaP = (c) => `<rect x="-20" y="-12" width="40" height="24" fill="${c || FUKUSA}"/><path d="M-20,-12 L0,2 L20,-12" stroke="#00000033" stroke-width="1.5" fill="none"/>`;
  function clothP(w, h, base, pat) {
    let s = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.5" fill="${base}"/>`;
    for (let yy = -h / 2 + 5; yy < h / 2 - 1; yy += 8) for (let xx = -w / 2 + 5; xx < w / 2 - 1; xx += 8) s += `<path d="M${xx},${yy - 2.2} L${xx + 2.2},${yy} L${xx},${yy + 2.2} L${xx - 2.2},${yy} Z" fill="${pat}"/>`;
    return s + `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.5" fill="none" stroke="#00000033"/>`;
  }
  // 濃茶で茶碗を受ける帛紗。古帛紗は小さく、出帛紗は帛紗と同じ大きさ。
  const dashiP = (kind) => kind === 'kobukusa' ? clothP(34, 30, '#2f4a6a', '#d8b24a') : clothP(58, 40, '#a8452e', '#e3c06a');

  const TOOL = {
    chawan: () => bowl('normal', 50, 58, 1.3),
    chasen: (o) => chasenBody(o && o.chasen),
    chashaku: () => '<path d="M14,78 Q12,70 20,68 L88,24 L90,28 L24,74 Q20,80 14,78 Z" fill="#c9a96b"/><line x1="56" y1="46" x2="60" y2="50" stroke="#8a6c3b" stroke-width="2"/>',
    natsume: () => '<path d="M24,46 Q24,82 50,84 Q76,82 76,46 Z" fill="#1d1a19"/><path d="M24,46 Q24,26 50,24 Q76,26 76,46 Z" fill="#2a2522"/><line x1="24" y1="46" x2="76" y2="46" stroke="#b08b3a" stroke-width="1.5"/><path d="M34,60 q6,-8 12,0 q6,8 12,0" stroke="#b08b3a" stroke-width="1.5" fill="none"/>',
    chaire: () => '<path d="M34,36 Q22,50 28,76 Q50,86 72,76 Q78,50 66,36 Z" fill="#7a4b2a"/><path d="M30,60 Q50,70 70,60 L72,76 Q50,86 28,76 Z" fill="#4e2e18"/><rect x="38" y="24" width="24" height="12" rx="3" fill="#f2ead8"/><rect x="47" y="18" width="6" height="7" rx="2" fill="#f2ead8"/>',
    kama: () => kama(50, 54, 1.4),
    furo: () => '<path d="M18,40 L82,40 L76,84 L24,84 Z" fill="#7d6a55"/><path d="M30,52 Q50,44 70,52 L68,66 Q50,60 32,66 Z" fill="#3d2f24"/><rect x="12" y="84" width="76" height="6" fill="#5b4a37"/>' + kama(50, 32, 0.8),
    ro: () => '<rect x="10" y="50" width="80" height="36" fill="#d8c9a0"/><rect x="26" y="56" width="48" height="26" fill="#2a2421"/><rect x="22" y="52" width="56" height="34" fill="none" stroke="#3a2d22" stroke-width="4"/>' + kama(50, 52, 0.85),
    hishaku: () => '<line x1="20" y1="80" x2="74" y2="30" stroke="#c9a96b" stroke-width="4" stroke-linecap="round"/><rect x="68" y="16" width="20" height="18" rx="3" fill="#d8bf87" transform="rotate(-42 78 25)"/>',
    mizusashi: () => '<path d="M28,30 L72,30 L70,82 Q50,88 30,82 Z" fill="#5d6e7a"/><ellipse cx="50" cy="30" rx="24" ry="6" fill="#2d2a28"/><circle cx="50" cy="26" r="3" fill="#2d2a28"/><path d="M30,50 Q50,58 70,50" stroke="#8fa3ae" stroke-width="2" fill="none"/>',
    kensui: () => '<path d="M22,46 L78,46 L72,80 Q50,86 28,80 Z" fill="#8a7046"/><ellipse cx="50" cy="46" rx="28" ry="7" fill="#5a462a"/>',
    futaoki: () => '<rect x="36" y="34" width="28" height="44" rx="3" fill="#c9b07a"/><ellipse cx="50" cy="34" rx="14" ry="4" fill="#a68d58"/><line x1="36" y1="56" x2="64" y2="56" stroke="#8d7546" stroke-width="2"/>',
    fukusa: () => '<path d="M18,30 L82,30 L82,74 L18,74 Z" fill="#6b3a7a"/><path d="M18,30 L50,52 L82,30" stroke="#4e2659" stroke-width="2" fill="none"/>',
    chakin: () => '<rect x="20" y="40" width="60" height="26" rx="2" fill="#f7f4ec" stroke="#d6cfbd" stroke-width="2"/><line x1="40" y1="40" x2="40" y2="66" stroke="#d6cfbd"/><line x1="60" y1="40" x2="60" y2="66" stroke="#d6cfbd"/>',
    kogo: () => '<ellipse cx="50" cy="60" rx="26" ry="14" fill="#a24030"/><ellipse cx="50" cy="52" rx="26" ry="12" fill="#c25742"/><circle cx="50" cy="50" r="5" fill="#e3b04b"/>',
    kashiki: () => at(50, 60, 1.6, kashikiP()),
    kaishi: () => at(50, 56, 1.5, kaishiP()),
    kashikiri: () => at(46, 64, 1.5, kaishiP()) + at(42, 62, 1.3, sweetP()) + '<line x1="76" y1="18" x2="54" y2="62" stroke="#9aa0a6" stroke-width="3.4" stroke-linecap="round"/>',
    sensu: () => '<path d="M50,82 L14,34 Q50,14 86,34 Z" fill="#efe3c2" stroke="#8a6c3b" stroke-width="1.5"/>' + [...Array(7)].map((_, i) => `<line x1="50" y1="82" x2="${20 + i * 10}" y2="${n1(32 - Math.sin(i / 6 * Math.PI) * 10)}" stroke="#b39b6b" stroke-width="1"/>`).join('') + '<circle cx="50" cy="80" r="3" fill="#3a2d22"/>',
  };

  // ---------- 人物（右向き・正座。床は y=94） ----------
  function person(pose, K, opt) {
    opt = opt || {};
    const D = '#0000002a';
    const legs = `<path d="M22,94 C20,82 28,73 40,72 L62,73 C72,74 78,84 76,94 Z" fill="${K}"/><path d="M22,94 C22,88 27,84 34,83 L70,84 C74,86 76,90 76,94 Z" fill="${D}"/>`;
    const torso = `<path d="M34,77 C32,63 36,51 44,47 L55,47 C60,52 61,64 59,77 Z" fill="${K}"/>`
      + '<path d="M55,47.5 L50,60 L52.5,61 L57,49 Z" fill="#f6f1e4"/>'
      + `<path d="M33.6,63 L60.2,63 L60.4,70 L33.8,70 Z" fill="${opt.obi || '#e3d3a5'}"/>`
      + (opt.fukusa ? `<rect x="35" y="66" width="5" height="9" rx="1" fill="${opt.fukusa}"/>` : '');
    const head = `<rect x="47" y="41" width="6" height="7" fill="${SKIN}"/><circle cx="50" cy="35" r="9" fill="${SKIN}"/>`
      + `<path d="M41,37 C39.5,27 46,23.5 51,24 C57,24.5 60,28.5 59.5,32 C55,30 50,30.5 46.5,33 L45,41 C42.5,40.5 41.2,39 41,37 Z" fill="${HAIR}"/>`
      + `<circle cx="55.6" cy="35.4" r="1" fill="${HAIR}"/>`;
    const sleeve = (d) => `<path d="${d}" fill="${K}"/><path d="${d}" fill="${D}"/>`;
    const hand = (x, y, rx) => `<ellipse cx="${x}" cy="${y}" rx="${rx || 3.3}" ry="2.5" fill="${SKIN}"/>`;
    const lap = sleeve('M47,49 C55,52 60,60 62,69 L55,72 C53,64 49,58 45,56 Z') + hand(61, 71.5);
    const rot = (deg, body) => `<g transform="rotate(${deg} 46 76)">${body}</g>`;
    const item = opt.item || '';
    switch (pose) {
      case 'eshaku': return legs + rot(15, torso + head + lap);
      case 'bow': return legs + rot(45, torso + head) + sleeve('M63,57 C71,62 78,76 82,88 L76,91 C72,80 66,70 60,65 Z') + hand(80, 91, 4);
      case 'hold': return legs + torso + head + sleeve('M46,49 C52,52 55,58 56,64 L65,57 L69,60 L58,69 C53,68 48,62 44,57 Z') + item + hand(67, 58);
      case 'drink': return legs + torso + head + sleeve('M46,49 C52,52 54,58 55,62 L58,46 L63,47 L60,66 C54,66 48,61 44,57 Z') + item + hand(60.5, 45);
      case 'view': return legs + rot(18, torso + head) + sleeve('M57,52 C63,56 66,64 67,72 L74,78 L72,82 L63,76 C60,68 57,62 53,58 Z') + item + hand(73, 80);
      default: return legs + torso + head + lap;
    }
  }
  const fig = (body, x, y, s) => `<g transform="translate(${x},${y}) scale(${s})">${body}</g>`;
  const G = (pose, opt) => person(pose, GUEST, opt);
  const H = (pose, school, opt) => person(pose, schoolColor(school), Object.assign({ fukusa: FUKUSA }, opt));
  const pair = (item) => floor + fig(G('sit'), -6, 36, .62) + fig(flip(G('eshaku')), 40, 36, .62) + item;
  const bubble = '<path d="M66,8 h26 a4,4 0 0 1 4,4 v10 a4,4 0 0 1 -4,4 h-16 l-6,6 l1,-6 h-5 a4,4 0 0 1 -4,-4 v-10 a4,4 0 0 1 4,-4 z" fill="#fffdf7" stroke="#8a7a5c"/><circle cx="72" cy="17" r="1.8" fill="#8a7a5c"/><circle cx="79" cy="17" r="1.8" fill="#8a7a5c"/><circle cx="86" cy="17" r="1.8" fill="#8a7a5c"/>';

  // ---------- 作法の手順の絵 ----------
  const school = (o) => SCHOOLS[o.school] || SCHOOLS.ura;
  const STEP = {
    'osakini': () => pair(at(48, 88, .3, kashikiP())),
    'bow-kashi': () => floor + fig(G('bow'), -8, 9, .9) + at(83, 88, .36, kashikiP()),
    'lift-kashi': () => floor + fig(G('hold', { item: at(67, 50, .36, kashikiP()) }), 2, 9, .9),
    'kaishi': () => at(50, 64, 1.5, kaishiP()) + at(48, 62, 1.3, sweetP()) + '<line x1="16" y1="30" x2="72" y2="52" stroke="#a87b44" stroke-width="2.4" stroke-linecap="round"/><line x1="18" y1="24" x2="74" y2="46" stroke="#a87b44" stroke-width="2.4" stroke-linecap="round"/>',
    'send-kashi': () => at(36, 62, 1.15, kashikiP()) + arrowH(64, 95, 62),
    'kashikiri': () => at(48, 66, 1.5, kaishiP()) + at(44, 64, 1.4, sweetP()) + '<line x1="45" y1="52" x2="43" y2="76" stroke="#fbf9f2" stroke-width="2.2"/><line x1="80" y1="20" x2="60" y2="58" stroke="#9aa0a6" stroke-width="3.2" stroke-linecap="round"/>',
    'heri': () => '<rect x="4" y="28" width="92" height="58" fill="#d6c690"/>' + [36, 44, 52, 60, 68, 76].map((y) => `<line x1="4" y1="${y}" x2="96" y2="${y}" stroke="#c8b77e" stroke-width="1"/>`).join('') + '<rect x="4" y="80" width="92" height="9" fill="#2f3a2a"/>' + bowl('normal', 50, 60, .7),
    'osakini-bowl': () => pair(bowl('normal', 48, 88, .26)),
    'bow-bowl': () => floor + fig(G('bow'), -8, 9, .9) + bowl('normal', 84, 87, .3),
    'lift-bowl': () => floor + fig(G('hold', { item: bowl('normal', 67, 51, .34) }), 2, 9, .9),
    'turn-cw': (o) => at(46, 52, 1.02, bowlTop(school(o).foam, true)) + at(46, 52, 1, arcArrow(41, -45, 55)),
    'drink': () => floor + fig(G('drink', { item: `<g transform="translate(61,40) rotate(-28) scale(.32)">${bowlBody('normal')}</g>` }), 2, 9, .9),
    'wipe-finger': () => bowl('normal', 50, 64, 1.2) + `<path d="M74,28 q7,-3 9,4 l-5,15 q-3,4 -7,1 Z" fill="${SKIN}"/>` + swish('M60,36 q10,-8 22,-2') + at(18, 88, .45, kaishiP()),
    'turn-ccw': (o) => at(46, 52, 1.02, bowlTop(school(o).foam, true)) + at(46, 52, 1, arcArrow(41, 55, -45)),
    'view': () => floor + fig(G('view', { item: bowl('normal', 74, 76, .3) }), 0, 9, .9),
    'return': () => bowl('normal', 52, 52, 1.1, 'empty', 'left') + arrowH(76, 22, 86),
    'omogashi': () => at(50, 68, 1.5, kaishiP()) + ume(50, 60, 13, '#f2b6c6', '#f2d36b'),
    'koicha': () => bowl('normal', 50, 64, 1.25, 'koicha') + steam(44, 32) + steam(56, 30),
    'dashi': (o) => at(50, 72, 1.25, dashiP(school(o).dashi)) + bowl('normal', 50, 60, .6, 'koicha'),
    'bow-koicha': () => floor + fig(G('bow'), -8, 9, .9) + bowl('normal', 84, 87, .3, 'koicha'),
    'turn-dashi': (o) => at(46, 54, 1.05, dashiP(school(o).dashi)) + at(46, 52, .8, bowlTop('koicha', true)) + at(46, 52, 1, arcArrow(38, -45, 55)),
    'drink-talk': () => floor + fig(G('drink', { item: `<g transform="translate(61,40) rotate(-28) scale(.32)">${bowlBody('normal', 'koicha')}</g>` }), -6, 9, .9) + bubble,
    'wipe-kaishi': () => bowl('normal', 46, 66, 1.15, 'koicha') + '<g transform="translate(76,42) rotate(-20)"><rect x="-9" y="-6" width="18" height="12" fill="#fbf9f2" stroke="#d6cfbd"/></g>' + swish('M56,34 q10,-8 24,-2'),
    'send-bowl': () => bowl('normal', 36, 62, .9, 'koicha') + arrowH(64, 95, 62),
    'okiawase': () => '<rect x="0" y="86" width="100" height="14" fill="#d6c690"/>' + place(TOOL.mizusashi(), 52, 46, .62) + bowl('normal', 32, 80, .45) + place(TOOL.natsume(), 70, 77, .42),
    'kensui': () => '<rect x="0" y="86" width="100" height="14" fill="#d6c690"/>' + place(TOOL.kensui(), 40, 66, .8) + '<line x1="14" y1="58" x2="62" y2="50" stroke="#c9a96b" stroke-width="3.2" stroke-linecap="round"/><rect x="58" y="43" width="14" height="12" rx="2" fill="#d8bf87"/>' + place(TOOL.futaoki(), 82, 72, .5),
    'sorei': (o) => floor + fig(H('bow', o.school), 2, 9, .9),
    'fukusa': () => place(TOOL.natsume(), 44, 60, .8) + at(74, 34, .8, fukusaP(), -25) + swish('M24,40 q20,-14 40,0'),
    'chasen': (o) => place(chasenBody(school(o).chasenKey), 22, 56, .62) + bowl('normal', 66, 78, .5, 'empty') + '<line x1="98" y1="8" x2="76" y2="32" stroke="#c9a96b" stroke-width="3" stroke-linecap="round"/><g transform="translate(73,37) rotate(35)"><rect x="-7" y="-6" width="14" height="12" rx="2" fill="#d8bf87"/></g><path d="M68,44 Q66,56 66,66" stroke="#9cc9d6" stroke-width="3" fill="none" stroke-linecap="round"/>',
    'chasen-toshi': (o) => bowl('normal', 50, 74, .85, 'empty') + place(chasenBody(school(o).chasenKey), 50, 40, .62, 180) + swish('M24,58 q-6,-12 2,-22') + swish('M76,58 q6,-12 -2,-22'),
    'chakin': () => bowl('normal', 48, 68, .95, 'empty') + '<g transform="translate(72,48) rotate(20)"><rect x="-8" y="-6" width="16" height="12" rx="1.5" fill="#f7f4ec" stroke="#d6cfbd"/></g>' + swish('M22,44 q26,-18 52,-4'),
    'matcha': () => place(TOOL.natsume(), 22, 72, .48) + '<ellipse cx="22" cy="60" rx="10" ry="3" fill="#7aa23a"/>' + bowl('normal', 66, 78, .55, 'empty') + '<line x1="26" y1="44" x2="64" y2="58" stroke="#c9a96b" stroke-width="3" stroke-linecap="round"/><ellipse cx="64" cy="57" rx="4.5" ry="2.8" fill="#7aa23a"/>' + at(66, 66, 1, dots(6, '#7aa23a', .9, 4, 9)),
    'pour': () => bowl('normal', 58, 76, .65) + '<line x1="4" y1="20" x2="40" y2="40" stroke="#c9a96b" stroke-width="3" stroke-linecap="round"/><g transform="translate(46,44) rotate(40)"><rect x="-8" y="-7" width="16" height="13" rx="2" fill="#d8bf87"/></g><path d="M52,50 Q56,58 56,66" stroke="#9cc9d6" stroke-width="3" fill="none" stroke-linecap="round"/>' + steam(72, 52),
    'foam': (o) => at(44, 52, 1.1, bowlTop(school(o).foam)) + place(chasenBody(school(o).chasenKey), 88, 62, .45),
    'serve': () => bowl('normal', 36, 62, .9, 'usucha', 'right') + arrowH(64, 95, 62),
    'shimai': (o) => floor + fig(H('eshaku', o.school), 0, 9, .9) + place(TOOL.kensui(), 84, 82, .34),
  };

  // ---------- お菓子 ----------
  const plate = '<path d="M14,72 L84,68 L88,90 L12,92 Z" fill="#fbf9f2" stroke="#ddd5c2"/>';
  const SWEETS = {
    '花びら餅': '<rect x="16" y="57" width="68" height="3.4" rx="1.7" fill="#8a5a2b" transform="rotate(-6 50 59)"/><path d="M26,72 Q50,32 74,72 Z" fill="#fbf6ee" stroke="#e5d9c6"/><path d="M35,70 Q50,48 65,70 Z" fill="#f2bfcb" opacity=".75"/>',
    'うぐいす餅': '<path d="M20,68 Q50,38 80,68 Q50,76 20,68 Z" fill="#9fae55"/>' + at(50, 62, 1, dots(14, '#c5cf86', 1, 14, 4)),
    '草餅': '<ellipse cx="50" cy="66" rx="20" ry="12" fill="#6f8f3a"/>' + at(50, 66, 1, dots(14, '#4f6f2a', .9, 15, 8)) + '<ellipse cx="44" cy="61" rx="7" ry="3" fill="#ffffff26"/>',
    '桜餅': '<path d="M24,72 Q34,40 76,46 Q70,78 24,72 Z" fill="#7d8a3a"/><path d="M30,68 Q50,58 72,50" stroke="#5f6a2a" stroke-width="1.2" fill="none"/><ellipse cx="48" cy="60" rx="16" ry="12" fill="#f3b6c6"/>' + at(48, 60, 1, dots(16, '#f8d2dc', 1, 12, 6)),
    '柏餅': '<path d="M26,74 Q50,40 74,74 Z" fill="#f6f1e6" stroke="#e2d8c5"/><path d="M18,72 Q22,44 42,40 Q64,34 80,50 Q84,64 74,74 Q50,62 18,72 Z" fill="#5e8c3a"/><path d="M24,68 Q48,52 76,52" stroke="#3f6a2a" stroke-width="1.4" fill="none"/>',
    '水無月': '<path d="M22,76 L78,76 L50,40 Z" fill="#f4efe4" stroke="#e2d8c5"/>' + at(50, 54, 1, dots(16, '#7a2f2f', 1.6, 9, 2)),
    '葛まんじゅう': '<path d="M20,74 Q40,56 80,64 Q60,84 20,74 Z" fill="#6f9a3a"/><ellipse cx="50" cy="62" rx="9" ry="7" fill="#6b2f2f"/><ellipse cx="50" cy="62" rx="18" ry="13" fill="#e4f1f3" opacity=".72" stroke="#c7dde0"/><ellipse cx="44" cy="56" rx="5" ry="2.4" fill="#ffffffaa"/>',
    '水羊羹': '<path d="M30,54 L38,46 L76,46 L68,54 Z" fill="#7a2e31"/><rect x="30" y="54" width="38" height="22" fill="#5a1f22"/><path d="M68,54 L76,46 L76,68 L68,76 Z" fill="#46171a"/><line x1="34" y1="58" x2="50" y2="58" stroke="#ffffff33" stroke-width="2"/>',
    '月見団子': [[36, 70], [50, 70], [64, 70], [43, 58], [57, 58], [50, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="#fbf8f0" stroke="#e2d8c5"/>`).join(''),
    '栗きんとん': '<path d="M32,72 Q30,50 50,46 Q70,50 68,72 Q50,78 32,72 Z" fill="#d9a944"/><path d="M44,48 q6,-6 12,0 M42,54 q8,-5 16,0" stroke="#b8862a" stroke-width="1.5" fill="none"/>' + at(50, 64, 1, dots(12, '#c4922f', .9, 13, 7)),
    '亥の子餅': '<ellipse cx="50" cy="64" rx="21" ry="12" fill="#9a6a3a"/><path d="M33,60 Q50,54 67,60 M32,65 Q50,59 68,65 M34,70 Q50,64 66,70" stroke="#5a3a1e" stroke-width="1.6" fill="none"/>',
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
  function opt(key, value, sch) {
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
  const teahouse = () => '<rect x="0" y="78" width="100" height="22" fill="#cfd9b0"/><rect x="18" y="46" width="64" height="34" fill="#d8c49a"/><rect x="18" y="70" width="64" height="10" fill="#b9a57a"/><path d="M6,52 L28,24 L72,24 L94,52 Z" fill="#9a8758"/><path d="M28,24 L72,24 L70,28 L30,28 Z" fill="#7a6a42"/>' + [16, 26, 36, 46, 56, 66, 76, 86].map((x) => `<line x1="${x}" y1="50" x2="${n1(28 + (x - 6) * 44 / 88)}" y2="28" stroke="#857346" stroke-width="1"/>`).join('') + '<rect x="14" y="50" width="72" height="4" fill="#00000022"/><circle cx="34" cy="60" r="7" fill="#f3ead2" stroke="#8a7448" stroke-width="1.5"/><path d="M29,57 L39,63 M29,63 L39,57 M34,53 L34,67" stroke="#a08850" stroke-width="1"/><rect x="56" y="64" width="15" height="15" fill="#6b5232"/><line x1="63.5" y1="64" x2="63.5" y2="79" stroke="#4e3a22"/><ellipse cx="66" cy="88" rx="8" ry="3" fill="#a9a39a"/><ellipse cx="52" cy="94" rx="7" ry="2.6" fill="#a9a39a"/><ellipse cx="38" cy="90" rx="6" ry="2.4" fill="#a9a39a"/>';
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
      hearth = `<rect x="${hx - 38}" y="186" width="76" height="6" fill="#5b4a37"/><path d="M${hx - 32},150 L${hx + 32},150 L${hx + 27},186 L${hx - 27},186 Z" fill="#7d6a55"/><path d="M${hx - 20},160 Q${hx},154 ${hx + 20},160 L${hx + 18},170 Q${hx},166 ${hx - 18},170 Z" fill="#3d2f24"/>` + kama(hx, 140, 0.75);
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

  // ---------- クイズ・メニューの絵 ----------
  // 上から順に、問題文に含まれる語で絵を選ぶ（答えを絵でばらさない順にしてある）
  const threeChasen = () => place(chasenBody('susu'), 22, 52, .7) + place(chasenBody('shira'), 50, 52, .7) + place(chasenBody('shichiku'), 78, 52, .7);
  const QUIZ_PIC = [
    ['茶筅の竹', threeChasen], ['点て方', TOOL.chawan],
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
    return svg(scroll());
  }
  function menu(id, sch, m) {
    const o = { school: sch };
    switch (id) {
      case 'course': return svg(teahouse());
      case 'seq': return svg(floor + fig(G('bow'), -4, 9, .9));
      case 'sim': return svg(vase + FLOWERS[MONTHS[m].hana]);
      case 'quiz': return svg(scroll());
      case 'zukan': return svg(place(chasenBody(school(o).chasenKey), 34, 50, .9) + place(TOOL.chashaku(), 62, 54, .8));
      case 'compare': return svg(threeChasen());
    }
    return '';
  }

  return {
    icon: (id, sch) => (TOOL[id] ? svg(TOOL[id]({ chasen: school({ school: sch }).chasenKey })) : ''),
    step: (p, sch) => (STEP[p] ? svg(STEP[p]({ school: sch })) : ''),
    opt, room, quiz, menu,
    chasen: (kind) => svg(chasenBody(kind)),
    foam: (kind) => svg(at(50, 50, 1.4, bowlTop(kind))),
    dashi: (kind) => svg(at(50, 66, 1.25, dashiP(kind)) + bowl('normal', 50, 56, .6, 'koicha')),
    teahouse: () => svg(teahouse()),
  };
})();
