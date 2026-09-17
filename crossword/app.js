/* ===== ひらめきクロスワード 本体 ===== */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- カタカナ関連 ---------------- */
  var KB = [
    ['ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ'],
    ['イ', 'キ', 'シ', 'チ', 'ニ', 'ヒ', 'ミ', '', 'リ', ''],
    ['ウ', 'ク', 'ス', 'ツ', 'ヌ', 'フ', 'ム', 'ユ', 'ル', 'ン'],
    ['エ', 'ケ', 'セ', 'テ', 'ネ', 'ヘ', 'メ', '', 'レ', ''],
    ['オ', 'コ', 'ソ', 'ト', 'ノ', 'ホ', 'モ', 'ヨ', 'ロ', 'ヲ']
  ];
  var DAKU = { カ: 'ガ', キ: 'ギ', ク: 'グ', ケ: 'ゲ', コ: 'ゴ', サ: 'ザ', シ: 'ジ', ス: 'ズ', セ: 'ゼ', ソ: 'ゾ', タ: 'ダ', チ: 'ヂ', ツ: 'ヅ', テ: 'デ', ト: 'ド', ハ: 'バ', ヒ: 'ビ', フ: 'ブ', ヘ: 'ベ', ホ: 'ボ', ウ: 'ヴ' };
  var HAN = { ハ: 'パ', ヒ: 'ピ', フ: 'プ', ヘ: 'ペ', ホ: 'ポ' };
  var SMALL = { ア: 'ァ', イ: 'ィ', ウ: 'ゥ', エ: 'ェ', オ: 'ォ', ヤ: 'ャ', ユ: 'ュ', ヨ: 'ョ', ツ: 'ッ', ワ: 'ヮ' };
  var RD = {}, RH = {}, RS = {};
  for (var k in DAKU) RD[DAKU[k]] = k;
  for (k in HAN) RH[HAN[k]] = k;
  for (k in SMALL) RS[SMALL[k]] = k;

  // 「゛」「゜」「小」キー：同じキーをもう一度押すと元に戻る
  function modify(c, kind) {
    if (!c) return c;
    var b = RD[c] || RH[c] || c;
    if (kind === 'd') return RD[c] ? b : (DAKU[b] || c);
    if (kind === 'h') return RH[c] ? b : (HAN[b] || c);
    return RS[c] ? RS[c] : (SMALL[c] || c);
  }

  /* ---------------- ローマ字入力（パソコン用） ---------------- */
  var ROMA = {
    a: 'ア', i: 'イ', u: 'ウ', e: 'エ', o: 'オ',
    ka: 'カ', ki: 'キ', ku: 'ク', ke: 'ケ', ko: 'コ',
    sa: 'サ', si: 'シ', shi: 'シ', su: 'ス', se: 'セ', so: 'ソ',
    ta: 'タ', ti: 'チ', chi: 'チ', tu: 'ツ', tsu: 'ツ', te: 'テ', to: 'ト',
    na: 'ナ', ni: 'ニ', nu: 'ヌ', ne: 'ネ', no: 'ノ',
    ha: 'ハ', hi: 'ヒ', hu: 'フ', fu: 'フ', he: 'ヘ', ho: 'ホ',
    ma: 'マ', mi: 'ミ', mu: 'ム', me: 'メ', mo: 'モ',
    ya: 'ヤ', yu: 'ユ', yo: 'ヨ',
    ra: 'ラ', ri: 'リ', ru: 'ル', re: 'レ', ro: 'ロ',
    wa: 'ワ', wo: 'ヲ', nn: 'ン',
    ga: 'ガ', gi: 'ギ', gu: 'グ', ge: 'ゲ', go: 'ゴ',
    za: 'ザ', zi: 'ジ', ji: 'ジ', zu: 'ズ', ze: 'ゼ', zo: 'ゾ',
    da: 'ダ', di: 'ヂ', du: 'ヅ', de: 'デ', do: 'ド',
    ba: 'バ', bi: 'ビ', bu: 'ブ', be: 'ベ', bo: 'ボ',
    pa: 'パ', pi: 'ピ', pu: 'プ', pe: 'ペ', po: 'ポ',
    va: 'ヴァ', vi: 'ヴィ', vu: 'ヴ', ve: 'ヴェ', vo: 'ヴォ',
    kya: 'キャ', kyu: 'キュ', kyo: 'キョ', gya: 'ギャ', gyu: 'ギュ', gyo: 'ギョ',
    sha: 'シャ', shu: 'シュ', sho: 'ショ', sya: 'シャ', syu: 'シュ', syo: 'ショ',
    ja: 'ジャ', ju: 'ジュ', jo: 'ジョ', jya: 'ジャ', jyu: 'ジュ', jyo: 'ジョ',
    zya: 'ジャ', zyu: 'ジュ', zyo: 'ジョ',
    cha: 'チャ', chu: 'チュ', cho: 'チョ', tya: 'チャ', tyu: 'チュ', tyo: 'チョ',
    nya: 'ニャ', nyu: 'ニュ', nyo: 'ニョ',
    hya: 'ヒャ', hyu: 'ヒュ', hyo: 'ヒョ', bya: 'ビャ', byu: 'ビュ', byo: 'ビョ',
    pya: 'ピャ', pyu: 'ピュ', pyo: 'ピョ', mya: 'ミャ', myu: 'ミュ', myo: 'ミョ',
    rya: 'リャ', ryu: 'リュ', ryo: 'リョ',
    fa: 'ファ', fi: 'フィ', fe: 'フェ', fo: 'フォ',
    xa: 'ァ', xi: 'ィ', xu: 'ゥ', xe: 'ェ', xo: 'ォ', xya: 'ャ', xyu: 'ュ', xyo: 'ョ',
    xtu: 'ッ', xtsu: 'ッ', xwa: 'ヮ',
    la: 'ァ', li: 'ィ', lu: 'ゥ', le: 'ェ', lo: 'ォ', lya: 'ャ', lyu: 'ュ', lyo: 'ョ',
    ltu: 'ッ', ltsu: 'ッ'
  };
  var PREFIX = {};
  for (k in ROMA) for (var n = 1; n < k.length; n++) PREFIX[k.slice(0, n)] = 1;
  var buf = '';
  function romaji(ch) {
    if (ch === '-') { buf = ''; return 'ー'; }
    buf += ch;
    var out = '';
    for (;;) {
      if (ROMA[buf]) { out += ROMA[buf]; buf = ''; break; }
      if (PREFIX[buf]) break;
      if (buf.length < 2) { buf = ''; break; }
      if (buf.charAt(0) === 'n' && buf.charAt(1) !== 'y') { out += 'ン'; buf = buf.slice(1); continue; }
      if (buf.charAt(0) === buf.charAt(1) && 'bcdfghjkmpqrstvwxyz'.indexOf(buf.charAt(0)) >= 0) {
        out += 'ッ'; buf = buf.slice(1); continue;
      }
      buf = buf.slice(1);
    }
    return out;
  }

  /* ---------------- 保存 ---------------- */
  var K_SAVE = 'cw_save_v1', K_BEST = 'cw_best_v1', K_AUTO = 'cw_auto_v1';
  function load(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function store(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function drop(key) { try { localStorage.removeItem(key); } catch (e) {} }

  /* ---------------- 状態 ---------------- */
  var S = {
    p: null, ent: [], fixed: [], at: null, els: [],
    sel: -1, dir: 'A', last: -1, el: 0, t0: 0, tick: null,
    hints: 0, revealed: false, done: false, auto: load(K_AUTO, true)
  };

  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  /* ---------------- ホーム ---------------- */
  function buildHome() {
    var box = $('levelBtns'), best = load(K_BEST, {}), cls = ['lv1', 'lv2', 'lv3', 'lv4'], i = 0;
    box.innerHTML = '';
    Object.keys(CWGen.levels).forEach(function (key) {
      var cfg = CWGen.levels[key];
      var b = document.createElement('button');
      b.className = 'btn ' + cls[i++ % 4];
      b.innerHTML = '<span>' + cfg.name + ' <em>' + cfg.target + '語 ／ ' + cfg.min + '〜' + cfg.maxLen + '文字</em></span>' +
        (best[key] ? '<span class="best">最短 ' + fmt(best[key]) + '</span>' : '<span class="best">はじめて</span>');
      b.onclick = function () { newGame(key); };
      box.appendChild(b);
    });
    var sv = load(K_SAVE, null);
    if (sv && sv.p && !sv.done) {
      $('resumeCard').classList.remove('hidden');
      $('resumeInfo').textContent = sv.p.levelName + '・' + sv.p.words.length + '語 ／ ' +
        fmt(sv.el) + ' 経過 ／ ' + countFilledWords(sv.p, sv.ent) + '語 正解';
    } else {
      $('resumeCard').classList.add('hidden');
    }
    $('wordCount').textContent = '収録ことば ' + CWGen.wordCount() + '語 ／ 問題は遊ぶたびに自動で作られます';
  }
  function countFilledWords(p, ent) {
    var c = 0;
    p.words.forEach(function (w) {
      for (var i = 0; i < w.cells.length; i++) if ((ent[w.cells[i]] || '') !== w.word.charAt(i)) return;
      c++;
    });
    return c;
  }

  function show(which) {
    $('home').classList.toggle('hidden', which !== 'home');
    $('game').classList.toggle('hidden', which !== 'game');
    $('game').style.display = which === 'game' ? 'flex' : '';
    window.scrollTo(0, 0);
  }

  /* ---------------- ゲーム開始 ---------------- */
  function newGame(level) {
    var p = CWGen.generate(level);
    if (!p) { alert('問題を作れませんでした。もう一度おためしください。'); return; }
    startWith(p, [], [], 0, 0, false);
  }
  function startWith(p, ent, fixed, elapsed, hints, revealed) {
    S.p = p;
    S.ent = [];
    S.fixed = [];
    for (var i = 0; i < p.rows * p.cols; i++) { S.ent[i] = ent[i] || ''; S.fixed[i] = !!fixed[i]; }
    S.el = elapsed || 0; S.hints = hints || 0; S.revealed = !!revealed;
    S.done = false; S.sel = -1; S.dir = 'A'; S.last = -1; buf = '';
    // マスごとの所属ワード
    S.at = [];
    p.words.forEach(function (w) {
      w.cells.forEach(function (idx) {
        if (!S.at[idx]) S.at[idx] = {};
        S.at[idx][w.dir] = w;
      });
    });
    $('lvName').textContent = p.levelName;
    buildGrid();
    buildLists();
    var first = p.words[0];
    setSel(first.cells[0], first.dir);
    startTimer();
    paint();
    show('game');
    fitCells();                       // 表示してから測らないと幅が 0 になる
    requestAnimationFrame(fitCells);
  }

  function startTimer() {
    stopTimer();
    S.t0 = Date.now();
    $('timer').textContent = fmt(S.el);
    S.tick = setInterval(function () {
      if (S.done) return;
      $('timer').textContent = fmt(S.el + (Date.now() - S.t0) / 1000);
    }, 500);
  }
  function stopTimer() {
    if (S.tick) { clearInterval(S.tick); S.tick = null; }
    if (S.t0) { S.el += (Date.now() - S.t0) / 1000; S.t0 = 0; }
  }
  function elapsed() { return S.el + (S.t0 ? (Date.now() - S.t0) / 1000 : 0); }

  /* ---------------- 盤面 ---------------- */
  function buildGrid() {
    var g = $('grid'), p = S.p;
    g.innerHTML = '';
    g.style.gridTemplateColumns = 'repeat(' + p.cols + ',1fr)';
    S.els = [];
    for (var i = 0; i < p.rows * p.cols; i++) {
      var d = document.createElement('div'), c = p.cells[i];
      if (!c) { d.className = 'cell blank'; }
      else {
        d.className = 'cell';
        if (c.num) {
          var nn = document.createElement('span');
          nn.className = 'n'; nn.textContent = c.num; d.appendChild(nn);
        }
        var t = document.createElement('span'); t.className = 'ch'; d.appendChild(t);
        d.setAttribute('data-i', i);
      }
      g.appendChild(d);
      S.els.push(d);
    }
    fitCells();
  }
  // マスの大きさを画面幅に合わせる（大きくなりすぎないよう上限つき・中央ぞろえ）
  function fitCells() {
    if (!S.p) return;
    var g = $('grid'), board = g.parentNode, gap = 2;
    var avail = board.clientWidth - 18;            // .board の左右パディング
    if (avail <= 0) return;
    var cell = Math.min(64, (avail - gap * (S.p.cols - 1)) / S.p.cols);
    g.style.width = (cell * S.p.cols + gap * (S.p.cols - 1)) + 'px';
    g.style.setProperty('--cw', cell + 'px');
  }
  window.addEventListener('resize', fitCells);
  if (window.ResizeObserver) new ResizeObserver(fitCells).observe($('grid').parentNode);

  function curWord() {
    if (S.sel < 0 || !S.at[S.sel]) return null;
    return S.at[S.sel][S.dir] || S.at[S.sel][S.dir === 'A' ? 'D' : 'A'];
  }
  function wordOK(w) {
    for (var i = 0; i < w.cells.length; i++) if (S.ent[w.cells[i]] !== w.word.charAt(i)) return false;
    return true;
  }
  function wordFull(w) {
    for (var i = 0; i < w.cells.length; i++) if (!S.ent[w.cells[i]]) return false;
    return true;
  }

  function setSel(idx, dir) {
    if (idx == null || idx < 0 || !S.p.cells[idx]) return;
    if (dir) S.dir = dir;
    if (!S.at[idx][S.dir]) S.dir = S.dir === 'A' ? 'D' : 'A';
    S.sel = idx;
    paint();
  }

  function paint() {
    var p = S.p, w = curWord(), inWord = {};
    if (w) w.cells.forEach(function (i) { inWord[i] = 1; });
    var solvedCells = {};
    if (S.auto) {
      p.words.forEach(function (x) {
        if (wordOK(x)) x.cells.forEach(function (i) { solvedCells[i] = 1; });
      });
    }
    for (var i = 0; i < p.rows * p.cols; i++) {
      var c = p.cells[i]; if (!c) continue;
      var d = S.els[i], cn = 'cell';
      if (solvedCells[i]) cn += ' done';
      if (inWord[i]) cn += ' hl';
      if (i === S.sel) cn += ' sel';
      if (S.fixed[i]) cn += ' fixed';
      if (S.auto && S.ent[i] && S.ent[i] !== c.sol && !S.fixed[i]) cn += ' bad';
      d.className = cn;
      var span = d.lastChild;
      if (span.textContent !== (S.ent[i] || '')) span.textContent = S.ent[i] || '';
    }
    // カギ表示
    if (w) {
      $('clueKey').textContent = (w.dir === 'A' ? 'ヨコ' : 'タテ') + ' ' + w.num + ' ・ ' + w.len + '文字';
      $('clueText').textContent = w.clue;
    }
    var solved = 0;
    p.words.forEach(function (x) { if (wordOK(x)) solved++; });
    $('progress').textContent = solved + '/' + p.words.length;
    // 一覧のハイライト
    var items = document.querySelectorAll('.clue');
    for (var j = 0; j < items.length; j++) {
      var id = +items[j].getAttribute('data-w'), x = p.words[id];
      items[j].classList.toggle('cur', !!(w && w.id === id));
      items[j].classList.toggle('solved', S.auto && wordOK(x));
    }
  }

  function buildLists() {
    var la = $('listA'), ld = $('listD');
    la.innerHTML = ''; ld.innerHTML = '';
    S.p.words.slice().sort(function (a, b) { return a.num - b.num; }).forEach(function (w) {
      var b = document.createElement('button');
      b.className = 'clue';
      b.setAttribute('data-w', w.id);
      b.innerHTML = '<b>' + w.num + '</b><span>' + esc(w.clue) + ' <span class="len">(' + w.len + ')</span></span>';
      b.onclick = function () { gotoWord(w); };
      (w.dir === 'A' ? la : ld).appendChild(b);
    });
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function gotoWord(w) {
    var idx = w.cells[0];
    for (var i = 0; i < w.cells.length; i++) if (!S.ent[w.cells[i]]) { idx = w.cells[i]; break; }
    setSel(idx, w.dir);
  }

  /* ---------------- 入力 ---------------- */
  function put(ch) {
    if (S.sel < 0 || S.done) return;
    if (!S.fixed[S.sel]) {
      S.ent[S.sel] = ch;
      S.last = S.sel;                       // 「゛゜小」はここに効かせる
      var d = S.els[S.sel];
      d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop');
    }
    advance();
    after();
  }
  function advance() {
    var w = curWord(); if (!w) return;
    var k = w.cells.indexOf(S.sel);
    for (var j = k + 1; j < w.cells.length; j++) {
      if (!S.ent[w.cells[j]]) { S.sel = w.cells[j]; return; }
    }
    if (wordFull(w)) {
      var nx = nextWord(w, 1, true);
      if (nx) { S.dir = nx.dir; gotoWord(nx); return; }
    }
    if (k + 1 < w.cells.length) S.sel = w.cells[k + 1];
  }
  function nextWord(from, step, onlyOpen) {
    var list = S.p.words, i = list.indexOf(from);
    for (var t = 1; t <= list.length; t++) {
      var w = list[(i + step * t + list.length * list.length) % list.length];
      if (!onlyOpen || !wordFull(w)) return w;
    }
    return null;
  }
  function del() {
    if (S.sel < 0 || S.done) return;
    if (S.ent[S.sel] && !S.fixed[S.sel]) { S.ent[S.sel] = ''; }
    else {
      var w = curWord();
      if (w) {
        var k = w.cells.indexOf(S.sel);
        if (k > 0) { S.sel = w.cells[k - 1]; if (!S.fixed[S.sel]) S.ent[S.sel] = ''; }
      }
    }
    after();
  }
  function applyMod(kind) {
    if (S.sel < 0 || S.done) return;
    var target = -1;
    if (S.ent[S.sel] && !S.fixed[S.sel]) target = S.sel;          // 選んでいるマスに文字があればそこ
    else if (S.last >= 0 && S.ent[S.last] && !S.fixed[S.last]) target = S.last;  // なければ直前に入れたマス
    if (target < 0) return;
    var c = modify(S.ent[target], kind);
    if (c === S.ent[target]) return;
    S.ent[target] = c;
    after();
  }

  function after() {
    paint();
    save();
    if (!S.done && allDone()) win();
  }
  function allDone() {
    for (var i = 0; i < S.p.words.length; i++) if (!wordOK(S.p.words[i])) return false;
    return true;
  }
  function save() {
    store(K_SAVE, {
      p: S.p, ent: S.ent, fixed: S.fixed, el: elapsed(),
      hints: S.hints, revealed: S.revealed, done: S.done
    });
  }

  /* ---------------- 答え合わせ・ヒント ---------------- */
  function check() {
    var bad = 0, blank = 0;
    for (var i = 0; i < S.p.rows * S.p.cols; i++) {
      var c = S.p.cells[i]; if (!c) continue;
      if (!S.ent[i]) { blank++; continue; }
      if (S.ent[i] !== c.sol) { bad++; S.els[i].classList.add('bad'); }
    }
    if (!bad && !blank) { after(); return; }
    var msg = bad ? bad + 'マス ちがっています（赤いところ）' : 'まちがいはありません。あと ' + blank + 'マス！';
    flash(msg);
    if (bad) {
      setTimeout(function () { if (!S.auto) paint(); }, 1800);
    }
  }
  var flashEl = null;
  function flash(msg) {
    if (!flashEl) {
      flashEl = document.createElement('div');
      flashEl.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);' +
        'background:rgba(0,0,0,.85);color:#fff;padding:11px 18px;border-radius:999px;font-size:13px;' +
        'font-weight:800;z-index:60;pointer-events:none;transition:opacity .3s;max-width:92vw;text-align:center;';
      document.body.appendChild(flashEl);
    }
    flashEl.textContent = msg;
    flashEl.style.opacity = '1';
    clearTimeout(flashEl._t);
    flashEl._t = setTimeout(function () { flashEl.style.opacity = '0'; }, 1900);
  }

  function hint() {
    if (S.done) return;
    var w = curWord(), idx = -1;
    if (w) {
      for (var i = 0; i < w.cells.length; i++) {
        var c = w.cells[i];
        if (S.ent[c] !== S.p.cells[c].sol) { idx = c; break; }
      }
    }
    if (idx < 0 && S.sel >= 0 && S.ent[S.sel] !== S.p.cells[S.sel].sol) idx = S.sel;
    if (idx < 0) { flash('この語はもう合っています'); return; }
    S.ent[idx] = S.p.cells[idx].sol;
    S.fixed[idx] = true;
    S.hints++;
    S.els[idx].classList.remove('pop'); void S.els[idx].offsetWidth; S.els[idx].classList.add('pop');
    after();
  }
  function reveal() {
    for (var i = 0; i < S.p.rows * S.p.cols; i++) {
      var c = S.p.cells[i]; if (!c) continue;
      S.ent[i] = c.sol; S.fixed[i] = true;
    }
    S.revealed = true;
    after();
  }
  function clearAll() {
    for (var i = 0; i < S.ent.length; i++) if (!S.fixed[i]) S.ent[i] = '';
    after();
  }

  /* ---------------- クリア ---------------- */
  function win() {
    S.done = true;
    stopTimer();
    save();
    var t = Math.round(S.el);
    var noHelp = S.hints === 0 && !S.revealed;
    if (noHelp) {
      var best = load(K_BEST, {});
      if (!best[S.p.level] || t < best[S.p.level]) { best[S.p.level] = t; store(K_BEST, best); }
    }
    $('winTitle').textContent = S.revealed ? '答えを見ました' : 'かんせい！ おめでとう🎉';
    $('winTime').textContent = fmt(t);
    $('winSub').textContent = S.p.levelName + '・' + S.p.words.length + '語' +
      (S.hints ? ' ／ ヒント ' + S.hints + '回' : '') +
      (noHelp ? ' ／ ヒントなし！' : '');
    $('winWords').innerHTML = '<span style="font-size:12px;color:#cdd3f5;line-height:2">' +
      S.p.words.slice().sort(function (a, b) { return a.num - b.num; }).map(function (w) {
        return '<b style="color:#ffc63d;display:inline-block;margin:0 5px">' + w.word + '</b>';
      }).join('') + '</span>';
    $('ovWin').classList.add('on');
  }

  /* ---------------- キーボードUI ---------------- */
  function buildKbd() {
    var box = $('kbd');
    box.innerHTML = '';
    KB.forEach(function (row) {
      var r = document.createElement('div');
      r.className = 'krow';
      row.forEach(function (ch) {
        var b = document.createElement('button');
        b.className = ch ? 'key' : 'key void';
        b.textContent = ch;
        if (ch) b.onclick = function () { put(ch); };
        r.appendChild(b);
      });
      box.appendChild(r);
    });
    var fn = document.createElement('div');
    fn.className = 'krow fn';
    [['ー', function () { put('ー'); }, ''],
     ['゛', function () { applyMod('d'); }, 'mod'],
     ['゜', function () { applyMod('h'); }, 'mod'],
     ['小', function () { applyMod('s'); }, 'mod'],
     ['⌫', del, 'del'],
     ['次の語', function () { var w = curWord(); var nx = nextWord(w, 1, true) || nextWord(w, 1, false); if (nx) { S.dir = nx.dir; gotoWord(nx); } }, '']
    ].forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'key ' + d[2];
      // 「゛」「゜」は字の上のほうに寄るので、マス中央に見えるよう少し下げる
      if (d[2] === 'mod' && d[0] !== '小') b.innerHTML = '<i>' + d[0] + '</i>';
      else b.textContent = d[0];
      b.onclick = d[1];
      fn.appendChild(b);
    });
    box.appendChild(fn);
  }

  /* ---------------- 物理キーボード ---------------- */
  document.addEventListener('keydown', function (e) {
    if ($('game').classList.contains('hidden')) return;
    if (document.querySelector('.ov.on')) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        var ov = document.querySelector('.ov.on');
        if (ov.id !== 'ovWin') ov.classList.remove('on');
      }
      return;
    }
    var w;
    if (e.key === 'Backspace') { e.preventDefault(); buf = ''; del(); return; }
    if (e.key === ' ') { e.preventDefault(); if (S.at[S.sel] && S.at[S.sel].A && S.at[S.sel].D) { S.dir = S.dir === 'A' ? 'D' : 'A'; paint(); } return; }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault(); buf = '';
      w = curWord();
      var nx = nextWord(w, e.shiftKey ? -1 : 1, false);
      if (nx) { S.dir = nx.dir; gotoWord(nx); }
      return;
    }
    if (e.key.indexOf('Arrow') === 0) {
      e.preventDefault(); buf = '';
      move(e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0,
           e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-zA-Z-]$/.test(e.key)) {
      e.preventDefault();
      var out = romaji(e.key.toLowerCase());
      for (var i = 0; i < out.length; i++) put(out.charAt(i));
      return;
    }
    if (/^[ァ-ヶー]$/.test(e.key)) { e.preventDefault(); put(e.key); }
  });
  function move(dr, dc) {
    if (S.sel < 0) return;
    var p = S.p, r = Math.floor(S.sel / p.cols), c = S.sel % p.cols;
    for (var t = 0; t < Math.max(p.rows, p.cols); t++) {
      r += dr; c += dc;
      if (r < 0 || c < 0 || r >= p.rows || c >= p.cols) return;
      var idx = r * p.cols + c;
      if (p.cells[idx]) { setSel(idx, dr ? 'D' : 'A'); return; }
    }
  }

  /* ---------------- イベント ---------------- */
  $('grid').addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== this && !t.hasAttribute('data-i')) t = t.parentNode;
    if (!t || t === this) return;
    var i = +t.getAttribute('data-i');
    buf = '';
    if (i === S.sel && S.at[i].A && S.at[i].D) S.dir = S.dir === 'A' ? 'D' : 'A';
    setSel(i);
  });
  $('btnPrevClue').onclick = function () { var w = curWord(); var x = nextWord(w, -1, false); if (x) { S.dir = x.dir; gotoWord(x); } };
  $('btnNextClue').onclick = function () { var w = curWord(); var x = nextWord(w, 1, false); if (x) { S.dir = x.dir; gotoWord(x); } };
  $('btnCheck').onclick = check;
  $('btnHint').onclick = hint;
  $('btnNew').onclick = function () {
    if (!S.done && !confirm('いまの問題をやめて、新しい問題を作りますか？')) return;
    newGame(S.p.level);
  };
  $('btnBack').onclick = function () { stopTimer(); save(); buildHome(); show('home'); };
  $('btnMenu').onclick = function () { $('swAuto').classList.toggle('on', S.auto); $('ovMenu').classList.add('on'); };
  $('mnClose').onclick = function () { $('ovMenu').classList.remove('on'); };
  $('swAuto').onclick = function () {
    S.auto = !S.auto; store(K_AUTO, S.auto);
    this.classList.toggle('on', S.auto); paint();
  };
  $('mnReveal').onclick = function () {
    if (!confirm('答えをぜんぶ表示します。よろしいですか？')) return;
    $('ovMenu').classList.remove('on'); reveal();
  };
  $('mnClear').onclick = function () {
    if (!confirm('入力した文字をぜんぶ消しますか？（ヒントで開いたマスは残ります）')) return;
    $('ovMenu').classList.remove('on'); clearAll();
  };
  $('mnHelp').onclick = function () { $('ovMenu').classList.remove('on'); $('ovHelp').classList.add('on'); };
  $('btnHelp').onclick = function () { $('ovHelp').classList.add('on'); };
  $('helpClose').onclick = function () { $('ovHelp').classList.remove('on'); };
  $('winNext').onclick = function () { $('ovWin').classList.remove('on'); newGame(S.p.level); };
  $('winHome').onclick = function () { $('ovWin').classList.remove('on'); drop(K_SAVE); buildHome(); show('home'); };
  $('btnResume').onclick = function () {
    var sv = load(K_SAVE, null);
    if (!sv || !sv.p) { buildHome(); return; }
    startWith(sv.p, sv.ent, sv.fixed, sv.el, sv.hints, sv.revealed);
  };
  $('btnReset').onclick = function () {
    if (!confirm('最短タイムと、とちゅうの問題をぜんぶ消します。よろしいですか？')) return;
    drop(K_BEST); drop(K_SAVE); buildHome();
  };
  document.querySelectorAll('.ov').forEach(function (ov) {
    ov.addEventListener('click', function (e) {
      if (e.target === ov && ov.id !== 'ovWin') ov.classList.remove('on');
    });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (!S.done && S.p) { stopTimer(); save(); } }
    else if (!S.done && S.p && !$('game').classList.contains('hidden')) startTimer();
  });

  /* ---------------- 起動 ---------------- */
  buildKbd();
  buildHome();
  show('home');
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
