/* ===== しりとり機関車 本体 ===== */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- しりとりの文字あつかい ---------------- */
  var SMALL = { 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ッ': 'ツ', 'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ', 'ヮ': 'ワ' };
  var DAKU = {
    'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ', 'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
    'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト', 'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
    'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ', 'ヴ': 'ウ'
  };
  // 小さい字は大きく、濁点・半濁点はおおめに見る（カ＝ガ＝…）
  function base(c) { c = SMALL[c] || c; return DAKU[c] || c; }
  // 語の「おしり」の字。「ー」は前の字であつかう
  function endOf(w) {
    var i = w.length - 1;
    while (i > 0 && w.charAt(i) === 'ー') i--;
    return base(w.charAt(i));
  }
  function startOf(w) { return base(w.charAt(0)); }
  function isTrap(w) { return w.charAt(w.length - 1) === 'ン'; }

  /* ---------------- ことばの読みこみ ---------------- */
  var NORMAL = [], TRAPS = [], BY = {}, BYT = {}, POOL = [];
  (function setup() {
    var all = (window.SL_WORDS || '').split('\n').map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 1; });
    NORMAL = all.filter(function (w) { return !isTrap(w); });
    TRAPS = all.filter(isTrap);
    // 行き止まり（その字ではじまる語が少ない）を取りのぞく
    for (;;) {
      var cnt = {};
      NORMAL.forEach(function (w) { var s = startOf(w); cnt[s] = (cnt[s] || 0) + 1; });
      var keep = NORMAL.filter(function (w) { return (cnt[endOf(w)] || 0) >= 4; });
      if (keep.length === NORMAL.length) break;
      NORMAL = keep;
    }
    NORMAL.forEach(function (w) { (BY[startOf(w)] = BY[startOf(w)] || []).push(w); });
    TRAPS.forEach(function (w) { (BYT[startOf(w)] = BYT[startOf(w)] || []).push(w); });
    POOL = NORMAL.concat(TRAPS);
  })();

  /* ---------------- 保存 ---------------- */
  var K_BEST = 'sl_best_v1';
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------------- 難易度 ---------------- */
  var LEVELS = {
    easy:   { name: 'のんびり',   speed: 40, accel: 1.035, miss: 5, conn: .40, trap: .07, look: .30, hint: true,  nDeath: false, gap: [50, 104],
              coal: 26, gainBase: 1.4, gainPer: 0.80 },
    normal: { name: 'ふつう',     speed: 58, accel: 1.050, miss: 3, conn: .30, trap: .14, look: .30, hint: false, nDeath: true,  gap: [42, 92],
              coal: 20, gainBase: 0.8, gainPer: 0.70 },
    rapid:  { name: 'とっきゅう', speed: 78, accel: 1.060, miss: 3, conn: .24, trap: .20, look: .28, hint: false, nDeath: true,  gap: [34, 80],
              coal: 16, gainBase: 0.5, gainPer: 0.65 }
  };
  var LANES = 4;          // 高さが測れないときの本数
  var COLORS = ['#ffd27a', '#ffb3a7', '#a9e6a3', '#a9d8ff', '#f4b8e4', '#ffe08a', '#bfe6d4', '#d7c4ff'];
  function hue(w) {
    var h = 0;
    for (var i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) % 9973;
    return h % COLORS.length;
  }

  /* ---------------- 日本地図と駅 ---------------- */
  // 10両つなぐごとに1駅すすむ。x,y は下の日本地図（viewBox 0 0 200 262）の座標
  var STATIONS = [
    { n: '札幌',   x: 156, y: 30,  m: 'ラーメンとカニ' },
    { n: '函館',   x: 140, y: 56,  m: '夜景とイカ' },
    { n: '青森',   x: 131, y: 73,  m: 'ねぶたとリンゴ' },
    { n: '仙台',   x: 122, y: 101, m: '牛タンと七夕' },
    { n: '東京',   x: 112, y: 128, m: 'スカイツリー' },
    { n: '静岡',   x: 103, y: 137, m: '富士山とお茶' },
    { n: '名古屋', x: 92,  y: 141, m: 'しゃちほこと手羽先' },
    { n: '京都',   x: 81,  y: 144, m: '金閣寺と八ツ橋' },
    { n: '大阪',   x: 77,  y: 149, m: 'たこ焼きと通天閣' },
    { n: '岡山',   x: 66,  y: 152, m: 'きびだんご' },
    { n: '広島',   x: 54,  y: 157, m: 'お好み焼きと宮島' },
    { n: '高松',   x: 69,  y: 166, m: 'うどん' },
    { n: '博多',   x: 39,  y: 172, m: 'とんこつラーメン' },
    { n: '熊本',   x: 37,  y: 187, m: '熊本城' },
    { n: '鹿児島', x: 40,  y: 201, m: '桜島とさつまいも' },
    { n: '那覇',   x: 21,  y: 239, m: '青い海（終点！）' }
  ];
  var PER_STATION = 10;          // 何両で1駅すすむか

  // ざっくりした日本地図。太い線を本州にみたてて描いている
  function mapSVG(cur) {
    var route = STATIONS.map(function (s) { return s.x + ',' + s.y; }).join(' ');
    var doneN = Math.min(STATIONS.length, cur + 1);
    var done = STATIONS.slice(0, doneN).map(function (s) { return s.x + ',' + s.y; }).join(' ');
    var dots = STATIONS.map(function (s, i) {
      if (i === cur) {
        return '<circle class="ping" cx="' + s.x + '" cy="' + s.y + '" r="5" fill="#ffc63d" opacity=".55"/>' +
               '<circle cx="' + s.x + '" cy="' + s.y + '" r="4.6" fill="#ffc63d" stroke="#fff" stroke-width="1.6"/>';
      }
      return '<circle cx="' + s.x + '" cy="' + s.y + '" r="2.6" fill="' +
             (i < cur ? '#ffd977' : '#7b88b8') + '"/>';
    }).join('');
    var label = STATIONS[cur] ? '<text x="' + (STATIONS[cur].x + (STATIONS[cur].x > 110 ? -9 : 9)) + '" y="' +
      (STATIONS[cur].y + 4) + '" fill="#fff" font-size="12" font-weight="700" text-anchor="' +
      (STATIONS[cur].x > 110 ? 'end' : 'start') + '">' + STATIONS[cur].n + '</text>' : '';
    return '<svg viewBox="0 0 200 262" width="196" height="257" aria-hidden="true">' +
      '<rect x="0" y="0" width="200" height="262" rx="12" fill="#16204a"/>' +
      '<g fill="#4a6a58" stroke="#6f9a82" stroke-width="2" stroke-linejoin="round">' +
        '<path d="M138,58 L146,30 L168,18 L184,34 L174,53 L156,62 Z"/>' +          // 北海道
        '<path d="M44,164 L54,177 L47,197 L35,208 L27,190 L31,170 Z"/>' +          // 九州
      '</g>' +
      '<polyline points="133,68 122,96 112,126 100,138 86,143 72,148 58,154" ' +
        'fill="none" stroke="#4a6a58" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<polyline points="133,68 122,96 112,126 100,138 86,143 72,148 58,154" ' +
        'fill="none" stroke="#6f9a82" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" ' +
        'opacity=".35"/>' +                                                        // 本州
      '<ellipse cx="70" cy="167" rx="13" ry="6.5" fill="#4a6a58" stroke="#6f9a82" stroke-width="2"/>' + // 四国
      '<ellipse cx="21" cy="239" rx="8" ry="3.5" fill="#4a6a58" stroke="#6f9a82" stroke-width="2"/>' +  // 沖縄
      '<polyline points="' + route + '" fill="none" stroke="#7b88b8" stroke-width="1.6" ' +
        'stroke-dasharray="3 4" opacity=".8"/>' +
      '<polyline points="' + done + '" fill="none" stroke="#ffc63d" stroke-width="2.6" ' +
        'stroke-linecap="round" stroke-linejoin="round"/>' +
      dots + label +
    '</svg>';
  }

  /* ---------------- 機関車のえ ---------------- */
  function locoSVG(w, slow) {
    return '' +
    '<svg class="loco' + (slow ? ' slow' : '') + '" viewBox="0 0 132 92" width="' + w + '" height="' + (w * 92 / 132) + '" aria-hidden="true">' +
      '<g fill="#e9edff" opacity=".75">' +
        '<circle class="pf" cx="30" cy="18" r="6"/>' +
        '<circle class="pf pf2" cx="30" cy="18" r="5"/>' +
        '<circle class="pf pf3" cx="30" cy="18" r="7"/>' +
      '</g>' +
      '<g stroke="#c2ccf0" stroke-width="2">' +
        '<rect x="23" y="20" width="13" height="18" fill="#4a5a94"/>' +
        '<rect x="19" y="14" width="21" height="9" rx="3" fill="#5d6ead"/>' +
        '<rect x="14" y="36" width="60" height="27" rx="13" fill="#4a5a94"/>' +
        '<rect x="72" y="21" width="37" height="42" rx="7" fill="#e94f5a"/>' +
        '<rect x="80" y="29" width="21" height="17" rx="3" fill="#ffe9a8"/>' +
        '<rect x="8" y="63" width="108" height="10" rx="4" fill="#33406e"/>' +
      '</g>' +
      '<rect x="46" y="37" width="5" height="25" fill="#ffc63d"/>' +
      '<polygon points="8,64 8,72 1,79 1,67" fill="#5d6ead" stroke="#c2ccf0" stroke-width="2"/>' +
      '<circle cx="15" cy="47" r="6.5" fill="#ffd977"/>' +
      '<circle cx="15" cy="47" r="10" fill="#ffd977" opacity=".22"/>' +
      wheel(41, 75, 13) + wheel(78, 75, 13) + wheel(20, 78, 8) +
    '</svg>';
  }
  function wheel(cx, cy, r) {
    return '<g>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#1d2442" stroke="#98a4c4" stroke-width="3"/>' +
      '<g class="spoke" style="transform-origin:' + cx + 'px ' + cy + 'px">' +
        '<line x1="' + (cx - r + 3) + '" y1="' + cy + '" x2="' + (cx + r - 3) + '" y2="' + cy + '" stroke="#98a4c4" stroke-width="2.5"/>' +
        '<line x1="' + cx + '" y1="' + (cy - r + 3) + '" x2="' + cx + '" y2="' + (cy + r - 3) + '" stroke="#98a4c4" stroke-width="2.5"/>' +
      '</g>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="2.5" fill="#ffc63d"/>' +
    '</g>';
  }

  /* ---------------- 状態 ---------------- */
  var S = {
    lv: 'normal', cfg: LEVELS.normal, speed: 0, score: 0, combo: 0, best: 0,
    miss: 0, need: '', chain: [], used: {}, onScreen: {},
    coal: 0, station: 0, cars: [], lanes: [], running: false, raf: 0, lastT: 0, tie: 0, noConn: 0
  };

  /* ---------------- ホーム ---------------- */
  function buildHome() {
    $('homeLoco').innerHTML = locoSVG(168, true);
    var box = $('levelBtns'), best = load(K_BEST, {}), cls = ['lv1', 'lv2', 'lv3'], i = 0;
    box.innerHTML = '';
    Object.keys(LEVELS).forEach(function (key) {
      var cfg = LEVELS[key], b = document.createElement('button'), rec = best[key];
      b.className = 'btn ' + cls[i++];
      b.innerHTML = '<span>' + cfg.name + ' <em>石炭' + cfg.coal + '秒／ミス' + cfg.miss + 'まで' +
        (cfg.nDeath ? '／「ン」で脱線' : '') + '</em></span>' +
        '<span class="best">' + (rec ? rec.cars + '両・' + rec.score + '点' : 'はじめて') + '</span>';
      b.onclick = function () { start(key); };
      box.appendChild(b);
    });
    $('wordCount').textContent = '収録ことば ' + POOL.length + '語（うち「ン」で終わるワナ ' + TRAPS.length + '語）';
  }
  function show(which) {
    $('home').classList.toggle('hidden', which !== 'home');
    $('game').classList.toggle('hidden', which !== 'game');
    $('game').style.display = which === 'game' ? 'flex' : '';
    window.scrollTo(0, 0);
  }

  /* ---------------- ゲーム開始 ---------------- */
  function start(lv) {
    S.lv = lv; S.cfg = LEVELS[lv];
    S.speed = S.cfg.speed; S.score = 0; S.combo = 0; S.miss = S.cfg.miss;
    S.coal = S.cfg.coal;                 // 石炭は満タンから
    S.station = 0;                       // 出発は札幌の手前から
    S.chain = []; S.used = {}; S.onScreen = {}; S.cars = []; S.tie = 0; S.noConn = 0;
    show('game');                 // 先に出す＝線路の幅・高さが測れる
    buildLanes();
    $('trainHead').innerHTML = locoSVG(74);
    $('trainCars').innerHTML = '';
    // 出発のことば
    var first = NORMAL[(Math.random() * NORMAL.length) | 0];
    S.used[first] = 1;
    S.chain.push(first);
    S.need = endOf(first);
    addTrainCar(first, true);
    paintHud();
    prefill();
    S.running = true;
    S.lastT = 0;
    S.raf = requestAnimationFrame(frame);
  }

  function buildLanes() {
    var yard = $('yard');
    yard.innerHTML = '';
    S.lanes = [];
    // 画面の高さに合わせて線路の本数を決める（3〜6本）
    var h = yard.clientHeight - 14;
    var n = h > 0 ? Math.round(h / 78) : LANES;
    n = Math.max(3, Math.min(6, n));
    for (var i = 0; i < n; i++) {
      var l = document.createElement('div');
      l.className = 'lane';
      l.innerHTML = '<div class="ties"></div><div class="rail r1"></div><div class="rail r2"></div>';
      yard.appendChild(l);
      S.lanes.push({ el: l, ties: l.firstChild, cars: [] });
    }
  }

  /* ---------------- HUD ---------------- */
  function paintHud() {
    $('score').textContent = S.score;
    $('cars').textContent = S.chain.length - 1;
    $('miss').textContent = new Array(S.miss + 1).join('○') + new Array(S.cfg.miss - S.miss + 1).join('✕');
    var k = $('needKana');
    if (k.textContent !== S.need) {
      k.textContent = S.need;
      k.classList.remove('pop'); void k.offsetWidth; k.classList.add('pop');
    }
    $('lastWord').textContent = 'さいごは「' + S.chain[S.chain.length - 1] + '」';
    paintCoal();
    paintRoute();
    var cb = $('comboBox');
    if (S.combo >= 3) {
      cb.style.visibility = 'visible';
      $('comboNum').textContent = '×' + mult().toFixed(1);
    } else cb.style.visibility = 'hidden';
  }
  function mult() { return Math.min(3, 1 + Math.floor(S.combo / 3) * 0.5); }

  // つぎの駅までの案内
  function paintRoute() {
    var st = STATIONS[S.station % STATIONS.length];
    var rest = PER_STATION - ((S.chain.length - 1) % PER_STATION);
    var lap = Math.floor(S.station / STATIONS.length);
    $('route').innerHTML = '🚉 つぎの駅 <b>' + st.n + '</b>' +
      (lap ? '（' + (lap + 1) + '周目）' : '') +
      ' ／ あと <span class="rest">' + rest + '</span> 両';
  }

  // 石炭ゲージ
  function paintCoal() {
    var r = Math.max(0, Math.min(1, S.coal / S.cfg.coal));
    $('coalFill').style.transform = 'scaleX(' + r + ')';
    $('coalNum').textContent = Math.ceil(Math.max(0, S.coal));
    $('coal').classList.toggle('low', r < 0.28);
  }
  // 走っているあいだは減り続ける。長く走るほど減りが早い
  function drainRate() { return 1 + (S.chain.length - 1) / 70; }
  // 連結したときの補給量（長いことばほど多い）
  function refill(word) {
    return S.cfg.gainBase + word.length * S.cfg.gainPer;
  }

  /* ---------------- 貨車 ---------------- */
  function pickFrom(list) {
    if (!list || !list.length) return null;
    var tries = 0, w;
    do {
      w = list[(Math.random() * list.length) | 0];
      if (!S.used[w] && !S.onScreen[w]) return w;
    } while (++tries < 30);
    return null;
  }
  function countConn() {
    var n = 0;
    for (var i = 0; i < S.cars.length; i++) {
      var c = S.cars[i];
      if (!c.dead && startOf(c.word) === S.need && !isTrap(c.word) && c.x < laneW()) n++;
    }
    return n;
  }
  function laneW() { return S.lanes[0] ? S.lanes[0].el.clientWidth : 320; }

  // いま連結できる貨車をつないだとき、つぎに必要になる字
  function futureNeeds() {
    var out = [];
    for (var i = 0; i < S.cars.length; i++) {
      var c = S.cars[i];
      if (!c.dead && !isTrap(c.word) && startOf(c.word) === S.need) out.push(endOf(c.word));
    }
    return out;
  }
  function pickWord() {
    var cfg = S.cfg;
    if (countConn() < 1) {                 // 画面から候補が消えたときだけ確実に出す
      var must = pickFrom(BY[S.need]);
      if (must) return must;
    }
    var r = Math.random();
    if (r < cfg.trap) {
      var t = pickFrom(BYT[S.need]);
      if (t) return t;
    }
    if (r < cfg.trap + cfg.conn) {
      var c = pickFrom(BY[S.need]);
      if (c) return c;
    }
    if (r < cfg.trap + cfg.conn + cfg.look) {
      // 「つぎの字」の貨車を先に流しておく＝連結したあと手がかりが途切れない
      var f = futureNeeds();
      if (f.length) {
        var n = pickFrom(BY[f[(Math.random() * f.length) | 0]]);
        if (n) return n;
      }
    }
    // おとり（ちがう字ではじまることば）
    for (var i = 0; i < 40; i++) {
      var w = POOL[(Math.random() * POOL.length) | 0];
      if (!S.used[w] && !S.onScreen[w] && startOf(w) !== S.need) return w;
    }
    return pickFrom(BY[S.need]);
  }

  function spawn(lane, word, atX) {
    if (!word) return;
    var el = document.createElement('button');
    el.className = 'car' + (word.length >= 6 ? ' long' : '');
    el.style.background = COLORS[hue(word)];
    el.innerHTML = '<span class="w">' + word + '</span>';
    lane.el.appendChild(el);
    var car = { el: el, word: word, lane: lane, x: atX == null ? laneW() + 6 : atX, w: el.offsetWidth, dead: false };
    el.style.setProperty('--x', car.x + 'px');
    el.onclick = function () { tap(car); };
    lane.cars.push(car);
    S.cars.push(car);
    S.onScreen[word] = 1;
    mark(car);
  }
  function mark(car) {
    if (!S.cfg.hint) return;
    var ok = startOf(car.word) === S.need && !isTrap(car.word);
    car.el.classList.toggle('hint', ok);
  }
  function remark() { S.cars.forEach(mark); }

  // 盤から外す（絵はアニメのあいだ残す）
  function detach(car) {
    if (car.off) return;
    car.off = true;
    car.dead = true;
    car.el.style.pointerEvents = 'none';
    car.el.onclick = null;
    delete S.onScreen[car.word];
    var i = S.cars.indexOf(car); if (i >= 0) S.cars.splice(i, 1);
    i = car.lane.cars.indexOf(car); if (i >= 0) car.lane.cars.splice(i, 1);
  }
  function kill(car) {
    detach(car);
    if (car.el.parentNode) car.el.parentNode.removeChild(car.el);
  }

  function rightmost(lane) {
    var m = null;
    lane.cars.forEach(function (c) { if (!m || c.x > m.x) m = c; });
    return m;
  }
  function spawnCheck() {
    var W = laneW();
    for (var i = 0; i < S.lanes.length; i++) {
      var lane = S.lanes[i], m = rightmost(lane);
      var gap = S.cfg.gap[0] + Math.random() * (S.cfg.gap[1] - S.cfg.gap[0]);
      if (!m || m.x + m.w < W - gap) spawn(lane, pickWord());
    }
  }
  // はじめから線路をいっぱいにしておく（開始直後にポカンとしないため）
  function prefill() {
    var W = laneW(), g = S.cfg.gap;
    S.lanes.forEach(function (lane) {
      var x = -20 + Math.random() * 70;
      for (var guard = 0; guard < 12 && x < W; guard++) {
        spawn(lane, pickWord(), x);
        var m = rightmost(lane);
        if (!m) break;
        x = m.x + m.w + g[0] + Math.random() * (g[1] - g[0]);
      }
    });
  }
  function forceConnectable() {
    var W = laneW(), best = null;
    S.lanes.forEach(function (lane) {
      var m = rightmost(lane), free = m ? W - (m.x + m.w) : 9999;
      if (!best || free > best.free) best = { lane: lane, free: free };
    });
    if (best && best.free > 60) spawn(best.lane, pickFrom(BY[S.need]));
  }

  /* ---------------- ループ ---------------- */
  function frame(t) {
    if (!S.running) return;
    if (!S.lastT) S.lastT = t;
    var dt = Math.min(0.05, (t - S.lastT) / 1000);
    S.lastT = t;
    var dx = S.speed * dt;
    for (var i = S.cars.length - 1; i >= 0; i--) {
      var c = S.cars[i];
      c.x -= dx;
      c.el.style.setProperty('--x', c.x + 'px');
      if (c.x + c.w < -40) kill(c);
    }
    S.coal -= dt * drainRate();
    paintCoal();
    if (S.coal <= 0) { S.coal = 0; over('石炭が尽きて 立ち往生…'); return; }
    S.tie = (S.tie - dx) % 22;
    for (i = 0; i < S.lanes.length; i++) S.lanes[i].ties.style.backgroundPositionX = S.tie + 'px';
    spawnCheck();
    // 連結できる貨車が画面から消えたら、すぐ出してあげる
    if (countConn() === 0) {
      S.noConn += dt;
      if (S.noConn > .5) { forceConnectable(); S.noConn = 0; }
    } else S.noConn = 0;
    S.raf = requestAnimationFrame(frame);
  }

  /* ---------------- タップ ---------------- */
  function tap(car) {
    if (!S.running || car.dead) return;
    var w = car.word;
    if (startOf(w) !== S.need) { missHit(car, 'ちがう字'); return; }
    if (isTrap(w)) {
      if (S.cfg.nDeath) { fx(car, '「ン」！', '#ff8a99'); over('「' + w + '」をつないで 脱線！'); kill(car); return; }
      missHit(car, 'ンはダメ');
      return;
    }
    connect(car);
  }

  function connect(car) {
    var w = car.word;
    S.combo++;
    var pt = Math.round(w.length * 10 * mult());
    S.score += pt;
    var add = refill(w);                       // 石炭を補給
    S.coal = Math.min(S.cfg.coal, S.coal + add);
    var cg = $('coal');
    cg.classList.remove('gain'); void cg.offsetWidth; cg.classList.add('gain');
    S.chain.push(w);
    S.used[w] = 1;
    S.need = endOf(w);
    fx(car, '+' + pt + '　🔥+' + add.toFixed(1) + '秒', '#ffc63d');
    car.el.classList.add('taken');
    car.el.style.setProperty('--y', '80px');
    detach(car);                           // 盤からはずす（絵は消えるアニメのあと片づける）
    setTimeout(function () { kill(car); }, 340);

    addTrainCar(w, false);
    var cars = S.chain.length - 1;
    if (cars % 5 === 0) S.speed *= S.cfg.accel;
    paintHud();
    remark();
    if (countConn() === 0) forceConnectable();
    if (cars % PER_STATION === 0) arrive();      // 10両ごとに駅
  }

  // 駅にとうちゃく：石炭満タン＋ボーナス、地図で現在地を見せる
  function arrive() {
    S.running = false;
    cancelAnimationFrame(S.raf);
    var idx = S.station % STATIONS.length;
    var lap = Math.floor(S.station / STATIONS.length);
    var st = STATIONS[idx];
    var bonus = 100 * (S.station + 1);
    S.score += bonus;
    S.coal = S.cfg.coal;
    S.station++;
    paintHud();
    $('stLap').classList.toggle('hidden', lap < 1);
    $('stLap').textContent = '日本一周 ' + (lap + 1) + '周目！';
    $('stTitle').textContent = st.n + '駅に とうちゃく！';
    $('stMap').innerHTML = mapSVG(idx);
    $('stInfo').innerHTML = '名物は <b>' + st.m + '</b><br>' +
      '石炭を満タンに補給／ボーナス <b>' + bonus + '点</b>' +
      (idx === STATIONS.length - 1 ? '<br><b>日本縦断 たっせい！</b>' : '');
    $('ovStation').classList.add('on');
  }

  function missHit(car, why) {
    S.miss--;
    S.combo = 0;
    fx(car, why, '#ff8a99');
    car.el.classList.add('ng');
    car.dead = true;                       // もう押せないが、貨車は流れつづける
    car.el.style.pointerEvents = 'none';
    car.el.onclick = null;
    setTimeout(function () { kill(car); }, 420);
    paintHud();
    if (S.miss <= 0) over('ミスが ' + S.cfg.miss + 'かい たまりました');
  }

  function addTrainCar(word, first) {
    var box = $('trainCars');
    var el = document.createElement('div');
    el.className = 'tcar' + (first ? '' : ' new');
    el.style.background = first ? '#ffc63d' : COLORS[hue(word)];
    el.textContent = word;
    box.appendChild(el);
    box.scrollLeft = box.scrollWidth;
  }

  function fx(car, text, color) {
    var r = car.el.getBoundingClientRect();
    var d = document.createElement('div');
    d.className = 'fx';
    d.textContent = text;
    d.style.color = color;
    d.style.left = (r.left + r.width / 2) + 'px';
    d.style.top = r.top + 'px';
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1000);
  }

  /* ---------------- 終着 ---------------- */
  function over(reason) {
    if (!S.running) return;
    S.running = false;
    cancelAnimationFrame(S.raf);
    var cars = S.chain.length - 1;
    var best = load(K_BEST, {}), rec = best[S.lv], isNew = false;
    if (!rec || S.score > rec.score) { best[S.lv] = { score: S.score, cars: cars }; store(K_BEST, best); isNew = true; }
    $('recBadge').classList.toggle('hidden', !isNew);
    $('overTitle').textContent = reason.indexOf('石炭') === 0 ? '石炭ぎれ'
      : (cars >= 10 ? '大編成で 終着！' : '終着駅');
    $('overReason').textContent = reason;
    $('overScore').textContent = S.score;
    var reached = S.station > 0 ? STATIONS[(S.station - 1) % STATIONS.length].n + '駅まで到達' : '最初の駅の手前で力つき';
    $('overSub').textContent = cars + '両つなぎました ／ ' + reached +
      (rec && !isNew ? '（ベスト ' + rec.cars + '両・' + rec.score + '点）' : '');
    $('overChain').innerHTML = S.chain.map(function (w) { return '<span>' + w + '</span>'; }).join('');
    $('ovOver').classList.add('on');
  }

  function quit() {
    S.running = false;
    cancelAnimationFrame(S.raf);
    $('ovOver').classList.remove('on');
    $('ovPause').classList.remove('on');
    $('ovStation').classList.remove('on');
    buildHome();
    show('home');
  }

  /* ---------------- イベント ---------------- */
  $('btnBack').onclick = quit;
  $('btnPause').onclick = function () {
    if (!S.running) return;
    S.running = false;
    cancelAnimationFrame(S.raf);
    $('ovPause').classList.add('on');
  };
  $('stGo').onclick = function () {
    $('ovStation').classList.remove('on');
    if (S.done) return;
    S.running = true; S.lastT = 0;
    S.raf = requestAnimationFrame(frame);
  };
  $('pzResume').onclick = function () {
    $('ovPause').classList.remove('on');
    S.running = true; S.lastT = 0;
    S.raf = requestAnimationFrame(frame);
  };
  $('pzQuit').onclick = quit;
  $('pzHelp').onclick = function () { $('ovHelp').classList.add('on'); };
  $('overAgain').onclick = function () { $('ovOver').classList.remove('on'); start(S.lv); };
  $('overHome').onclick = quit;
  $('btnHelp').onclick = function () { $('ovHelp').classList.add('on'); };
  $('helpClose').onclick = function () { $('ovHelp').classList.remove('on'); };
  $('btnReset').onclick = function () {
    if (!confirm('ベスト記録をぜんぶ消します。よろしいですか？')) return;
    try { localStorage.removeItem(K_BEST); } catch (e) {}
    buildHome();
  };
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && S.running) {
      S.running = false;
      cancelAnimationFrame(S.raf);
      $('ovPause').classList.add('on');
    }
  });

  /* ---------------- 起動 ---------------- */
  buildHome();
  show('home');
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
