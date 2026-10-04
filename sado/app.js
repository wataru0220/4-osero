// ===== 茶の湯みち：ゲーム本体 =====
(function () {
  const app = document.getElementById('app');
  const KEY = 'sado.v1';
  const MAX_MISS = 3;   // ミスがこの回数になったら失格

  // ---------- 保存 ----------
  let save = { school: null, ruby: 'all', bgm: true, voice: true, seq: {}, sim: {}, stamp: {}, quiz: {}, dougu: {}, walk: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) save = Object.assign(save, s); } catch (_) {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (_) {} };
  const bucket = (name) => { save[name] = save[name] || {}; return (save[name][save.school] = save[name][save.school] || {}); };

  // ---------- 小道具 ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sc = () => SCHOOLS[save.school];
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const starsByMiss = (miss) => MAX_MISS - miss;   // ミス0＝★3、1＝★2、2＝★1
  const stepText = (st) => st.t || st[save.school];
  const thisMonth = () => new Date().getMonth() + 1;
  const DISCLAIMER = '<div class="note">※ 流派の違いは「一般にそう教えられることが多い」代表的なものです。細部は教室・先生・点前の種類によって異なります。お稽古では先生の教えを優先してください。</div>';
  const RUBY_MODES = [['all', 'ぜんぶ'], ['term', '茶道のことばだけ'], ['none', 'なし']];
  const FOAM_SHORT = { full: 'たっぷり', mikazuki: '控えめ（三日月）', least: '最も少なめ' };
  const say = (expr, html) => `<div class="talk"><span class="mc">${ART.mascot(expr)}</span><div class="bub">${html}</div></div>`;
  const lives = (miss) => `<span class="lives" aria-label="のこり${MAX_MISS - miss}">${[...Array(MAX_MISS)].map((_, i) => ART.life(i < MAX_MISS - miss)).join('')}</span>`;
  const FAIL = '<div class="fail"><span>失格</span></div>';

  // 画面を描いてからフリガナを付ける
  function render(html, el) { el = el || app; el.innerHTML = html; RUBY.apply(el); }
  function setTheme() {
    document.documentElement.style.setProperty('--school', save.school ? sc().color : '#3f5a2a');
    document.body.dataset.ruby = save.ruby || 'all';
  }
  let toastTimer = null;
  function toast(expr, text) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    render(say(expr, esc(text)), t);
    t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function confetti() {
    const box = document.createElement('div');
    box.className = 'confetti';
    const cols = ['#e0603e', '#f6c84b', '#8fc24f', '#e98ca0', '#7d8fd1'];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = cols[i % cols.length];
      p.style.animationDelay = Math.random() * 0.7 + 's';
      p.style.animationDuration = 2 + Math.random() * 1.2 + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4000);
  }
  function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  // ---------- BGM ----------
  // ブラウザの決まりで、最初のタップまでは音を出せない。タップしたら（オンなら）鳴らし始める。
  const SND = (on) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor"/>${on ? '<path d="M16 9 Q18.5 12 16 15 M18.5 6.5 Q23 12 18.5 17.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '<path d="M16 9 L22 15 M22 9 L16 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}</svg>`;
  const unlock = () => { if (save.bgm) BGM.start(); };
  document.addEventListener('pointerup', unlock, true);
  document.addEventListener('keydown', unlock, true);
  function setBgm(on) {
    save.bgm = on; persist();
    if (on) BGM.start(); else BGM.stop();
    document.querySelectorAll('[data-bgm]').forEach((b) => { b.innerHTML = SND(on); b.classList.toggle('off', !on); });
    document.querySelectorAll('[data-bgmset]').forEach((b) => b.classList.toggle('on', (b.dataset.bgmset === 'on') === on));
  }
  let pauseHook = null;   // 画面が隠れたときに止めるもの（動画）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { BGM.stop(); if (pauseHook) pauseHook(); }
    else if (save.bgm && BGM.started) BGM.start();
  });

  // ---------- 画面の移動・戻る ----------
  // 戻る先は「ひとつ上の画面」。スマホの戻る操作（ブラウザの戻る）でも同じ動きにする。
  const PARENT = { course: 'home', seqList: 'home', seqPlay: 'seqList', simMonths: 'home', simPlay: 'simMonths', quiz: 'home', dougu: 'home', walkList: 'home', walkPlay: 'walkList', videoList: 'home', videoPlay: 'videoList', zukan: 'home', compare: 'home' };
  let cur = { name: 'home' };
  let leaveHook = null;   // 画面を離れるときの後片付け（動画のタイマー・読み上げ）
  const parentOf = (c) => (c.name === 'zukan' && c.arg) ? { name: 'zukan' } : { name: PARENT[c.name] || 'home' };
  const HOME_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 3 L21 11 M6 9 V21 H18 V9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  function head(title) {
    const deep = parentOf(cur).name !== 'home';
    return `<div class="bar"><button class="back" data-back>‹ もどる</button>${deep ? `<button class="homebtn" data-go="home" aria-label="ホームへ">${HOME_ICON}</button>` : ''}<button class="homebtn snd${save.bgm ? '' : ' off'}" data-bgm aria-label="BGM">${SND(save.bgm)}</button><span class="chip">${esc(sc().name)}</span></div><h2>${esc(title)}</h2>`;
  }

  app.addEventListener('click', (e) => {
    if (e.target.closest('[data-bgm]')) return setBgm(!save.bgm);
    if (e.target.closest('[data-back]')) return back();
    const t = e.target.closest('[data-go]');
    if (!t) return;
    const [name, arg] = t.dataset.go.split(':');
    go(name, arg);
  });

  // ホーム以外にいる間は履歴を1つ積んでおき、戻る操作を受け止める
  let popGuard = false;
  function syncHistory() {
    const top = history.state && history.state.sado === 'top';
    if (cur.name !== 'home' && !top) history.pushState({ sado: 'top' }, '');
    else if (cur.name === 'home' && top) { popGuard = true; history.back(); }
  }
  window.addEventListener('popstate', () => {
    if (popGuard) { popGuard = false; return; }
    if (cur.name !== 'home') back();
  });
  function go(name, arg) {
    if (leaveHook) { const f = leaveHook; leaveHook = null; f(); }
    pauseHook = null;
    cur = { name: SCREENS[name] ? name : 'home', arg };
    setTheme();
    SCREENS[cur.name](arg);
    window.scrollTo(0, 0);
    syncHistory();
  }
  function back() { const p = parentOf(cur); go(p.name, p.arg); }

  // ---------- ホーム ----------
  function seasonPick(m) {
    const mo = MONTHS[m];
    return { hearth: mo.ro ? '炉' : '風炉', kama: (save.school === 'ura' && mo.kamaUra) || mo.kama, cupKey: mo.cup };
  }
  const stampCount = () => MONTHS.slice(1).filter((x) => bucket('stamp')[x.m] || bucket('sim')[x.m] >= 80).length;
  function home() {
    const s = save.school, m = thisMonth();
    const item = (go, ic, t, d) => `<button class="btn" data-go="${go}"><span class="ic">${ART.menu(ic, s, m)}</span><span><span class="t">${t}</span><span class="d">${d}</span></span></button>`;
    let menu = '';
    if (s) {
      const seqDone = Object.keys(bucket('seq')).length;
      const walkDone = Object.keys(bucket('walk')).length;
      menu = `
      <h3>あそんで覚える</h3>
      <div class="menu">
        ${item('seqList', 'seq', '① お点前の順序', `絵のカードを正しい順に並べる（${seqDone}/${SEQUENCES.length} 修了）`)}
        ${item('simMonths', 'sim', '② 季節の茶席シミュレーション', `月をえらび、道具を組んで点前をする（月の印 ${stampCount()}/12）`)}
        ${item('quiz', 'quiz', '③ 知識クイズ', `10問勝負（最高 ${bucket('quiz').best || 0}/10）`)}
        ${item('dougu', 'dougu', '④ お道具の名前当て', `絵と名前を結びつける10問（最高 ${bucket('dougu').best || 0}/10）`)}
        ${item('walkList', 'walk', '⑤ 茶室の歩き方', `畳の縁を踏まずに、床の間から席まで（${walkDone}/${WALK_STAGES.length} ステージ）`)}
      </div>
      <p class="sub center">どのゲームも、ミスは${MAX_MISS}回で失格です。</p>
      <h3>見て学ぶ</h3>
      <div class="menu">
        ${item('videoList', 'video', '作法の動画', '絵が動いて、声で説明します')}
        ${item('course', 'course', `${sc().name}とは`, '庵号・家元・この流派の見分けポイント')}
        ${item('zukan', 'zukan', '道具図鑑', '道具ごとの季節・流派の違い')}
        ${item('compare', 'compare', '三千家くらべ', '三つの流派の違いを一覧で')}
      </div>`;
    }
    render(`
      <div class="top">
        <div class="hero-pic">${ART.room(m, seasonPick(m), { school: s })}</div>
        <p class="cap">今月（${m}月・${MONTHS[m].name}）の茶席</p>
        <h1>茶の湯みち</h1>
        ${say('happy', 'ようこそ！ わたしは<b>まっちゃん</b>。いっしょに茶道をまなぼう！')}
      </div>
      <h3>コースをえらぶ</h3>
      <div class="schools">
        ${Object.values(SCHOOLS).map((x) => `<button class="school ${s === x.id ? 'on' : ''}" style="--c:${x.color}" data-school="${x.id}"><b>${x.name}</b><span>${x.an}</span></button>`).join('')}
      </div>
      ${menu || '<p class="sub center">まずは学びたい流派をえらんでください。<br>あとから切り替えられます。</p>'}
      <div class="rubyset"><span class="lbl">ふりがな</span>${RUBY_MODES.map(([k, l]) => `<button class="seg ${save.ruby === k ? 'on' : ''}" data-ruby="${k}">${l}</button>`).join('')}</div>
      <div class="rubyset"><span class="lbl">BGM</span><button class="seg ${save.bgm ? 'on' : ''}" data-bgmset="on">オン</button><button class="seg ${save.bgm ? '' : 'on'}" data-bgmset="off">オフ</button></div>
      ${DISCLAIMER}`);
    app.querySelectorAll('[data-school]').forEach((b) => b.onclick = () => { save.school = b.dataset.school; persist(); go('home'); });
    app.querySelectorAll('[data-ruby]').forEach((b) => b.onclick = () => { save.ruby = b.dataset.ruby; persist(); go('home'); });
    app.querySelectorAll('[data-bgmset]').forEach((b) => b.onclick = () => setBgm(b.dataset.bgmset === 'on'));
  }

  // ---------- 流派紹介 ----------
  function course() {
    const x = sc();
    render(head(`${x.name}とは`) + `
      <div class="hero-pic small">${ART.teahouse()}</div>
      <div class="card"><dl class="dl">
        <dt>庵号</dt><dd>${x.an}</dd>
        <dt>家元</dt><dd>代々 ${x.iemoto} を名乗る</dd>
        <dt>祖</dt><dd>${x.founder}（千宗旦の子）</dd>
        <dt>門下</dt><dd>${x.group}</dd>
        <dt>名の由来</dt><dd>${x.origin}</dd>
      </dl></div>
      <h3>見分けポイント</h3>
      <div class="marks">
        <div class="mark">${ART.chasen(x.chasenKey)}<b>茶筅</b><span>${x.chasen}</span></div>
        <div class="mark">${ART.foam(x.foam)}<b>薄茶の泡</b><span>${FOAM_SHORT[x.foam]}</span></div>
        <div class="mark">${ART.dashi(x.dashi)}<b>濃茶の帛紗</b><span>${DASHI[x.dashi]}</span></div>
      </div>
      <h3>この流派のポイント</h3>
      <div class="card"><ul class="pt">${x.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
      <p class="sub">三千家はいずれも、千利休の孫・千宗旦の息子たちがおこした家です。根っこは同じなので、作法の大部分は共通しています。</p>
      <button class="btn primary" data-go="seqList">お点前の順序をはじめる</button>
      ${DISCLAIMER}`);
  }

  // ---------- ① 順序 ----------
  function seqList() {
    const b = bucket('seq');
    render(head('お点前の順序') + `
      ${say('happy', `ばらばらになった手順のカードを、正しい順にタップしてね。ミス${MAX_MISS}回で失格。まちがえずに並べると★3つ！`)}
      ${SEQUENCES.map((q) => `<button class="btn seqbtn" data-go="seqPlay:${q.id}">${ART.step(q.steps[0].p, save.school)}<span><span class="t">${esc(q.title)}</span><span class="d">${q.role}の作法・${q.steps.length}手順・${'初中上'[q.level - 1]}級　<span class="stars">${b[q.id] ? stars(b[q.id]) : ''}</span></span></span></button>`).join('')}`);
  }

  function answerList(q) {
    return `<ol class="placed">${q.steps.map((st) => {
      const differs = !st.t;
      const others = differs ? Object.values(SCHOOLS).filter((x) => x.id !== save.school).map((x) => `${x.name}：${esc(st[x.id])}`).join('<br>') : '';
      return `<li><span class="tx">${esc(stepText(st))}${differs ? '<span class="diff">流派で違う</span>' : ''}<span class="n2">${esc(st.note)}${differs ? '<br>' + others : ''}</span></span>${ART.step(st.p, save.school)}</li>`;
    }).join('')}</ol>`;
  }

  function seqPlay(id) {
    const q = SEQUENCES.find((x) => x.id === id);
    const steps = q.steps.map((st, i) => ({ i, text: stepText(st), p: st.p }));
    let pool = shuffle(steps), next = 0, miss = 0, missHere = 0;
    const pic = (s) => ART.step(s.p, save.school);
    function draw() {
      render(head(q.title) + `
        <div class="status"><span>${next}/${steps.length} 手順</span>${lives(miss)}</div>
        <div class="progress"><i style="width:${next / steps.length * 100}%"></i></div>
        <ol class="placed">${steps.slice(0, next).map((s) => `<li><span class="tx">${esc(s.text)}</span>${pic(s)}</li>`).join('')}</ol>
        <div class="slot">${next + 1}番目はどれ？</div>
        <div class="pool">${pool.map((s) => `<button class="btn ${missHere >= 2 && s.i === next ? 'hint' : ''}" data-i="${s.i}">${pic(s)}<span>${esc(s.text)}</span></button>`).join('')}</div>`);
      app.querySelectorAll('.pool .btn').forEach((b) => b.onclick = () => {
        const i = +b.dataset.i;
        if (i === next) {
          next++; missHere = 0; pool = pool.filter((s) => s.i !== i);
          if (next === steps.length) return done();
          draw();
        } else {
          miss++; missHere++;
          if (miss >= MAX_MISS) return fail();
          shake(b);
          app.querySelector('.lives').outerHTML = lives(miss);
          toast('oops', missHere >= 2 ? '光っているカードがヒントだよ' : `あれれ？ ${next + 1}番目はちがうよ`);
          if (missHere === 2) setTimeout(draw, 380);
        }
      });
    }
    function done() {
      const n = starsByMiss(miss);
      const b = bucket('seq'); b[id] = Math.max(b[id] || 0, n); persist();
      render(head(q.title) + `
        <div class="big stars">${stars(n)}</div>
        ${say(miss === 0 ? 'joy' : 'happy', miss === 0 ? 'おみごと！ まちがいなし！' : `よくできました！（ミス${miss}回）`)}
        <h3>正しい順序と解説</h3>
        ${answerList(q)}
        <button class="btn primary" data-go="seqPlay:${id}">もう一度</button>
        <button class="btn" data-go="videoPlay:${id}">この作法の動画を見る</button>
        <button class="btn" data-go="seqList">ほかの作法へ</button>`);
      if (miss === 0) confetti();
    }
    function fail() {
      render(head(q.title) + FAIL + say('sad', `ミスが${MAX_MISS}回になりました。正しい順序を見て、もう一度ちょうせんしよう！`) + `
        <h3>正しい順序と解説</h3>
        ${answerList(q)}
        <button class="btn primary" data-go="seqPlay:${id}">もう一度</button>
        <button class="btn" data-go="videoPlay:${id}">この作法の動画を見る</button>
        <button class="btn" data-go="seqList">ほかの作法へ</button>`);
    }
    draw();
  }

  // ---------- ② 季節の茶席 ----------
  function simMonths() {
    const b = bucket('sim'), stp = bucket('stamp');
    render(head('季節の茶席シミュレーション') + `
      ${say('happy', `月をえらぶと、その季節の茶席の亭主になれるよ。道具を組んで点前の判断をしよう。ミス${MAX_MISS - 1}つまでなら合格で月の印、${MAX_MISS}つで失格！`)}
      <div class="months">${MONTHS.slice(1).map((x) => `<button class="month ${x.ro ? 'ro' : 'fu'}" data-go="simPlay:${x.m}">${stp[x.m] || b[x.m] >= 80 ? '<span class="stamp">印</span>' : ''}${ART.opt('hana', x.hana)}<b>${x.m}月</b><small>${x.name}</small><span class="rf">${x.ro ? '炉' : '風炉'}</span></button>`).join('')}</div>
      <div class="note">炉＝11月〜4月、風炉＝5月〜10月。季節によって道具も扱いも変わります。</div>`);
  }

  function otherPicks(field, m, n) {
    const others = shuffle(MONTHS.slice(1).filter((x) => Math.abs(x.m - m) >= 3 && Math.abs(x.m - m) <= 9).map((x) => x[field]));
    return others.slice(0, n);
  }

  function buildSim(m) {
    const mo = MONTHS[m], x = sc(), ro = mo.ro;
    const kamaKey = (save.school === 'ura' && mo.kamaUra) ? mo.kamaUra : mo.kama;
    const kamaNote = {
      normal: mo.kamaUra ? '大炉は裏千家独自の点前。ほかの流派では通常の炉でよい。' : 'この月は特別なしつらえはしない。',
      tsuri: mo.eventNote, sukigi: mo.eventNote, nakaoki: '10月は風炉を点前畳の中央に寄せ、火を客に近づける「中置」。', dairo: mo.eventNote,
    }[kamaKey];
    const Q = [];
    Q.push({ k: 'hearth', part: '道具組み', q: '釜をかけるのは？', c: ['炉', '風炉'], a: ro ? '炉' : '風炉', e: '11月〜4月は畳に切った「炉」、5月〜10月は畳の上に置く「風炉」。' });
    Q.push({ k: 'kama', part: '道具組み', q: '釜のしつらえは？', c: Object.keys(KAMA).filter((k) => ro ? k !== 'nakaoki' : !['tsuri', 'sukigi', 'dairo'].includes(k)).map((k) => KAMA[k]), a: KAMA[kamaKey], e: kamaNote });
    Q.push({ k: 'ko', part: '道具組み', q: '焚く香は？', c: ['練香', '香木（白檀など）'], a: ro ? '練香' : '香木（白檀など）', e: '炉の季節は練香、風炉の季節は香木。' });
    Q.push({ k: 'kogo', part: '道具組み', q: '香合の素材は？', c: ['陶磁器', '木地・塗物'], a: ro ? '陶磁器' : '木地・塗物', e: '炉は陶磁器（練香は湿り気があるため）、風炉は木地・塗物。' });
    Q.push({ k: 'cup', part: '道具組み', q: '茶碗の形は？', c: Object.values(CUP), a: CUP[mo.cup], e: CUP_NOTE[mo.cup] });
    Q.push({ k: 'kashi', part: '道具組み', q: '主菓子は？', c: shuffle([mo.kashi].concat(otherPicks('kashi', m, 2))), a: mo.kashi, e: `${m}月らしい菓子は「${mo.kashi}」。` });
    Q.push({ k: 'hana', part: '道具組み', q: '床に生ける茶花は？', c: shuffle([mo.hana].concat(otherPicks('hana', m, 2))), a: mo.hana, e: `${m}月の茶花には「${mo.hana}」など。茶花は季節を先取りしすぎず、野にあるように。` });
    Q.push({ k: 'chasen', part: '道具組み', q: '茶筅は？', c: Object.values(CHASEN), a: CHASEN[x.chasenKey], e: `${x.name}では${x.chasen}の茶筅が一般的。（表千家＝煤竹、裏千家＝白竹、武者小路千家＝紫竹）` });

    Q.push({ k: 'hishaku', part: '点前', q: '湯を汲んで茶碗に注いだあと、柄杓の扱いは？', c: ['切り柄杓', '置き柄杓'], a: ro ? '置き柄杓' : '切り柄杓', e: '一般に風炉では「切り柄杓」、炉では「置き柄杓」で釜に柄杓を戻す。' });
    Q.push({ k: 'foam', part: '点前', q: '薄茶をどう点てる？', c: Object.values(FOAM), a: FOAM[x.foam], e: `${x.name}は「${FOAM[x.foam]}」。泡の加減は流派の違いがよく出るところ。` });
    Q.push({ k: 'dashi', part: '点前', q: '濃茶の茶碗に添えて客が受ける帛紗は？', c: Object.values(DASHI), a: DASHI[x.dashi], e: `${x.name}では一般に${DASHI[x.dashi]}。表千家・武者小路千家は出帛紗、裏千家は古帛紗。` });
    const ev = EVENTS[m] && (EVENTS[m].q ? EVENTS[m] : (save.school === 'ura' ? EVENTS[m].ura : EVENTS[m].all));
    if (ev) Q.push(Object.assign({ k: 'event', part: '季節の心得' }, ev));
    return Q;
  }

  function simPlay(arg) {
    const m = +arg, mo = MONTHS[m];
    const Q = buildSim(m);
    const ans = {};
    let idx = 0, busy = false;
    function draw() {
      const q = Q[idx];
      const pics = q.c.map((c) => ART.opt(q.k, c));
      const long = q.c.some((c) => c.length > 12);
      const cls = long ? 'one' : pics.some(Boolean) ? `pic n${q.c.length}` : '';
      render(head(`${m}月（${mo.name}）の茶席`) + `
        <div class="status"><span>${q.part}</span><span>${idx + 1}/${Q.length}</span></div>
        <div class="progress"><i style="width:${idx / Q.length * 100}%"></i></div>
        ${idx === 0 ? `<div class="card"><b>${mo.event}</b><div class="sub">${esc(mo.eventNote)}</div></div>` : ''}
        <p class="q">${esc(q.q)}</p>
        <div class="opts ${cls}">${q.c.map((c, i) => `<button class="btn ${ans[q.k] === c ? 'sel' : ''}" data-c="${esc(c)}">${pics[i]}<span>${esc(c)}</span></button>`).join('')}</div>
        ${idx > 0 ? '<button class="btn ghost" id="prev">‹ 前の問題にもどる</button>' : ''}`);
      app.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => {
        if (busy) return;
        busy = true;
        ans[q.k] = b.dataset.c;
        app.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('sel', x === b));
        setTimeout(() => { busy = false; idx++; idx < Q.length ? draw() : result(); }, 200);
      });
      const pv = app.querySelector('#prev');
      if (pv) pv.onclick = () => { if (!busy) { idx--; draw(); } };
    }
    function result() {
      const ok = Q.filter((q) => ans[q.k] === q.a).length;
      const missN = Q.length - ok, pass = missN < MAX_MISS;
      const score = Math.round(ok / Q.length * 100);
      const b = bucket('sim'); b[m] = Math.max(b[m] || 0, score);
      if (pass) bucket('stamp')[m] = true;
      persist();
      const kamaKey = Object.keys(KAMA).find((k) => KAMA[k] === ans.kama) || 'normal';
      const cupKey = Object.keys(CUP).find((k) => CUP[k] === ans.cup) || 'normal';
      render(head(`${m}月の茶席・結果`) + `
        <div class="hero-pic">${ART.room(m, { hearth: ans.hearth, kama: kamaKey, cupKey }, { school: save.school })}</div>
        ${pass ? `<div class="big">${score}<span class="unit">点</span></div>` : FAIL}
        ${pass ? say(missN === 0 ? 'joy' : 'happy', `${m}月の印をいただきました！${missN ? `（ミス${missN}つ）` : "（ミスなし）"}`) : say('sad', `ミスが${missN}つ。${MAX_MISS}つ以上で失格です。解説を読んで、もう一度ちょうせんしよう！`)}
        <div class="card">${Q.map((q) => {
          const good = ans[q.k] === q.a;
          return `<div class="res"><span class="mk ${good ? 'o' : 'x'}">${good ? '○' : '×'}</span><div><b>${esc(q.q)}</b><br>${good ? esc(q.a) : `あなた：${esc(ans[q.k])}<br>正解：<b>${esc(q.a)}</b>`}<small>${esc(q.e)}</small></div></div>`;
        }).join('')}</div>
        <button class="btn primary" data-go="simPlay:${m}">もう一度</button>
        <button class="btn" data-go="simMonths">ほかの月へ</button>
        ${DISCLAIMER}`);
      if (pass && missN === 0) confetti();
    }
    draw();
  }

  // ---------- ③④ クイズ（知識・お道具の名前当て） ----------
  // list: [{ q, qpic, big, tag, tagColor, c:[{t, pic}], picOnly, a, e, rev }]
  function playQuiz(cfg) {
    let idx = 0, ok = 0, miss = 0;
    const wrong = [], n = cfg.list.length;
    function draw() {
      const q = cfg.list[idx];
      render(head(cfg.title) + `
        <div class="status"><span>第${idx + 1}問${q.tag ? `　<span class="chip" style="background:${q.tagColor}">${q.tag}</span>` : ''}</span>${lives(miss)}</div>
        <div class="progress"><i style="width:${idx / n * 100}%"></i></div>
        ${q.qpic ? `<div class="qpic${q.big ? ' big' : ''}">${q.qpic}</div>` : ''}
        <p class="q">${esc(q.q)}</p>
        <div class="opts ${q.picOnly ? 'pic picq' : 'one'}">${q.c.map((c, i) => `<button class="btn" data-i="${i}">${c.pic || ''}<span class="${q.picOnly ? 'lbl hide' : ''}">${esc(c.t)}</span></button>`).join('')}</div>
        <div id="ex"></div>`);
      const btns = app.querySelectorAll('[data-i]');
      btns.forEach((b) => b.onclick = () => {
        const i = +b.dataset.i, good = i === q.a;
        if (good) ok++; else { miss++; wrong.push(q); }
        btns.forEach((x) => { x.onclick = null; if (+x.dataset.i === q.a) x.classList.add('right'); });
        if (!good) b.classList.add('wrong');
        app.querySelectorAll('.lbl.hide').forEach((x) => x.classList.remove('hide'));
        app.querySelector('.lives').outerHTML = lives(miss);
        const out = miss >= MAX_MISS, last = idx + 1 >= n;
        render(say(good ? 'joy' : 'oops', `<b>${good ? '○ 正解！' : '× ざんねん'}</b><br>${esc(q.e)}`) + `<button class="btn primary" id="nx">${out || last ? '結果を見る' : '次の問題'}</button>`, app.querySelector('#ex'));
        app.querySelector('#nx').onclick = () => { if (out) return result(true); idx++; idx < n ? draw() : result(false); };
        app.querySelector('#nx').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    function result(failed) {
      const b = bucket(cfg.key);
      if (!failed) b.best = Math.max(b.best || 0, ok);
      persist();
      const perfect = !failed && ok === n;
      render(head(`${cfg.title}・結果`) + (failed
        ? FAIL + say('sad', `ミスが${MAX_MISS}回になりました（${ok}問正解）。もう一度ちょうせんしよう！`)
        : `<div class="big">${ok}<span class="unit"> / ${n}</span></div>` + say(perfect ? 'joy' : 'happy', `称号：<b>${cfg.rank(ok)}</b>（最高 ${b.best}/${n}）`))
        + (wrong.length ? `<h3>まちがえた問題</h3><div class="card">${wrong.map((q) => `<div class="res">${q.rev ? `<span class="rpic">${q.rev}</span>` : '<span class="mk x">×</span>'}<div><b>${esc(q.q)}</b><br>正解：${esc(q.c[q.a].t)}<small>${esc(q.e)}</small></div></div>`).join('')}</div>` : '')
        + `<button class="btn primary" data-go="${cfg.screen}">もう一度（問題が変わります）</button><button class="btn" data-go="home">ホームへ</button>`);
      if (perfect) confetti();
    }
    draw();
  }

  function quiz() {
    const own = shuffle(QUIZ.filter((q) => q.s === save.school)).slice(0, 3);
    const other = shuffle(QUIZ.filter((q) => q.s !== 'all' && q.s !== save.school)).slice(0, 1);
    const common = shuffle(QUIZ.filter((q) => q.s === 'all')).slice(0, 10 - own.length - other.length);
    const list = shuffle(own.concat(other, common)).map((q) => {
      const order = shuffle(q.c.map((_, i) => i));
      return {
        q: q.q, qpic: ART.quiz(q.q), tag: q.s === 'all' ? '共通' : SCHOOLS[q.s].name, tagColor: q.s === 'all' ? '#8a7a5c' : SCHOOLS[q.s].color,
        c: order.map((i) => ({ t: q.c[i] })), a: order.indexOf(q.a), e: q.e,
      };
    });
    playQuiz({ title: '知識クイズ', key: 'quiz', screen: 'quiz', list, rank: (ok) => (ok === 10 ? '宗匠' : ok === 9 ? '師範' : '上級') });
  }

  function dougu() {
    const groupOf = (id) => DOUGU_GROUPS.find((g) => g.includes(id)) || [id];
    const list = shuffle(TOOLS).slice(0, 10).map((t, k) => {
      const ng = groupOf(t.id);
      const opts = shuffle([t].concat(shuffle(TOOLS.filter((x) => !ng.includes(x.id))).slice(0, 3)));
      const a = opts.indexOf(t), rev = ART.icon(t.id, save.school);
      return k % 2
        ? { q: `「${t.name}」はどれ？`, c: opts.map((x) => ({ t: x.name, pic: ART.icon(x.id, save.school) })), picOnly: true, a, e: t.desc, rev }
        : { q: 'この道具の名前は？', qpic: rev, big: true, c: opts.map((x) => ({ t: x.name })), a, e: `「${t.name}」 ${t.desc}`, rev };
    });
    playQuiz({ title: 'お道具の名前当て', key: 'dougu', screen: 'dougu', list, rank: (ok) => (ok === 10 ? 'お道具名人' : ok === 9 ? '目利き' : '合格') });
  }

  // ---------- ⑤ 茶室の歩き方 ----------
  function walkList() {
    const b = bucket('walk');
    render(head('茶室の歩き方') + `
      ${say('happy', 'にじり口から入って、床の間と釜を拝見してから、自分の席に着こう。畳の縁を踏んだり、点前畳に入ったりするとミス！')}
      <div class="card"><b>畳の歩き方</b><ul class="pt">${WALK_RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
      ${WALK_STAGES.map((st, i) => `<button class="btn seqbtn" data-go="walkPlay:${st.id}">${ART.menu('walk', save.school)}<span><span class="t">ステージ${i + 1}　${st.name}</span><span class="d">${st.months}のしつらえ・${st.winter ? '炉に気をつけて' : '風炉は点前畳の上'}　<span class="stars">${b[st.id] ? stars(b[st.id]) : ''}</span></span></span></button>`).join('')}
      <button class="btn" data-go="videoPlay:walk">お手本の動画を見る</button>
      <div class="note">※ 歩き方や拝見のしかたの細部は、流派・教室・茶室によって異なります。ここでは一般的な心得をゲームにしています。</div>`);
  }

  function cellType(stage, gx, gy) {
    const L = ROOM_LAYOUT, sx = gx % 3, sy = gy % 3, ux = Math.floor(gx / 3), uy = Math.floor(gy / 3);
    const kind = (m) => (m === 'B' ? 'temae' : 'mat');
    let t;
    if (sx !== 2 && sy !== 2) t = kind(L[uy][ux]);
    else if (sx === 2 && sy !== 2) t = L[uy][ux] === L[uy][ux + 1] ? kind(L[uy][ux]) : 'heri';
    else if (sy === 2 && sx !== 2) t = L[uy][ux] === L[uy + 1][ux] ? kind(L[uy][ux]) : 'heri';
    else { const s = new Set([L[uy][ux], L[uy][ux + 1], L[uy + 1][ux], L[uy + 1][ux + 1]]); t = s.size === 1 ? kind(L[uy][ux]) : 'heri'; }
    if (stage.ro && stage.ro[0] === gx && stage.ro[1] === gy) t = 'ro';
    return t;
  }
  const inBoard = (x, y) => x >= 0 && y >= 0 && x < 8 && y < 8;
  const has = (cells, p) => cells.some((c) => c[0] === p[0] && c[1] === p[1]);
  function placeToken(p, how) {
    const me = document.getElementById('wk-me');
    if (!me) return;
    const c = ART.walkCell(p[0], p[1]);
    me.style.transform = `translate(${c.x + c.w / 2}px, ${c.y + c.h / 2 + 16}px)`;
    if (how) { const bob = me.querySelector('.bob'); bob.classList.remove('step', 'hop'); void bob.getBoundingClientRect(); bob.classList.add(how); }
  }

  function walkPlay(id) {
    const st = WALK_STAGES.find((x) => x.id === id);
    const stage = Object.assign({ school: save.school }, st);
    let pos = st.start.slice(), goal = 0, miss = 0, steps = 0, strided = false;
    render(head(`茶室の歩き方・${st.name}`) + `
      <div class="status"><span id="wk-obj"></span>${lives(0)}</div>
      <div class="board" id="wk-board">${ART.walkBoard(stage)}</div>
      <div id="wk-talk">${say('happy', 'にじり口から入りました。足あとをタップして進もう！')}</div>
      <button class="btn primary" id="wk-act" hidden></button>
      <p class="sub center" id="wk-steps"></p>`);
    const board = app.querySelector('#wk-board');
    const talk = (expr, html) => render(say(expr, html), app.querySelector('#wk-talk'));
    function options() {
      const out = [];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const x1 = pos[0] + dx, y1 = pos[1] + dy;
        if (!inBoard(x1, y1)) return;
        const t1 = cellType(stage, x1, y1);
        out.push({ x: x1, y: y1, kind: t1, stride: false });
        const x2 = pos[0] + dx * 2, y2 = pos[1] + dy * 2;
        if (t1 === 'heri' && inBoard(x2, y2) && cellType(stage, x2, y2) !== 'heri') out.push({ x: x2, y: y2, kind: cellType(stage, x2, y2), stride: true });
      });
      return out;
    }
    function update() {
      placeToken(pos);
      document.getElementById('wk-fp').innerHTML = options().map((o) => `<g class="fp" data-x="${o.x}" data-y="${o.y}" data-kind="${o.kind}" data-stride="${o.stride ? 1 : ''}">${ART.walkFoot(ART.walkCell(o.x, o.y))}</g>`).join('');
      document.getElementById('wk-goal').innerHTML = goal < 3 ? st.goals[goal].map((c) => ART.walkGoal(ART.walkCell(c[0], c[1]))).join('') : '';
      render(goal < 3 ? `目標 ${goal + 1}/3：${WALK_GOALS[goal].target}` : '', app.querySelector('#wk-obj'));
      render(`歩数 ${steps}`, app.querySelector("#wk-steps"));
      const act = app.querySelector('#wk-act');
      const here = goal < 3 && has(st.goals[goal], pos);
      act.hidden = !here;
      if (here) render(WALK_GOALS[goal].label, act);
    }
    board.addEventListener('click', (e) => {
      const f = e.target.closest('.fp');
      if (!f) return;
      const kind = f.dataset.kind, stride = !!f.dataset.stride;
      if (kind === 'mat') {
        pos = [+f.dataset.x, +f.dataset.y]; steps++;
        placeToken(pos, stride ? 'hop' : 'step');
        if (stride && !strided) { strided = true; talk('joy', '縁をまたぎました！ その調子。'); }
        else {
          const later = st.goals.findIndex((g, i) => i > goal && has(g, pos));
          if (later > goal && !has(st.goals[goal], pos)) talk('think', `先に「${WALK_GOALS[goal].label}」をしよう。`);
          else if (goal < 3 && has(st.goals[goal], pos)) talk('happy', `ここで「${WALK_GOALS[goal].label}」ボタンを押そう。`);
        }
        update();
        return;
      }
      miss++;
      app.querySelector('.lives').outerHTML = lives(miss);
      shake(board);
      if (miss >= MAX_MISS) return fail(WALK_MISS[kind]);
      talk('oops', esc(WALK_MISS[kind]));
    });
    app.querySelector('#wk-act').onclick = () => {
      const g = WALK_GOALS[goal];
      goal++;
      if (goal >= 3) return clear();
      render(`<div class="viewpic">${ART.viewPic(g.pic)}</div>` + say('joy', esc(g.done)), app.querySelector('#wk-talk'));
      update();
    };
    function clear() {
      const n = starsByMiss(miss);
      const b = bucket('walk'); b[id] = Math.max(b[id] || 0, n); persist();
      render(head(`茶室の歩き方・${st.name}`) + `
        <div class="viewpic big">${ART.viewPic('seat')}</div>
        <div class="big stars">${stars(n)}</div>
        ${say(miss === 0 ? 'joy' : 'happy', `${esc(WALK_GOALS[2].done)}（歩数 ${steps}・ミス${miss}回）`)}
        <div class="card"><b>畳の歩き方のおさらい</b><ul class="pt">${WALK_RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
        <button class="btn primary" data-go="walkPlay:${id}">もう一度</button>
        <button class="btn" data-go="walkList">ステージをえらぶ</button>`);
      if (miss === 0) confetti();
    }
    function fail(reason) {
      render(head(`茶室の歩き方・${st.name}`) + FAIL + say('sad', `${esc(reason)}<br>ミスが${MAX_MISS}回になりました。`) + `
        <div class="card"><b>畳の歩き方</b><ul class="pt">${WALK_RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
        <button class="btn primary" data-go="walkPlay:${id}">もう一度</button>
        <button class="btn" data-go="videoPlay:walk">お手本の動画を見る</button>
        <button class="btn" data-go="walkList">ステージをえらぶ</button>`);
    }
    update();
  }

  // ---------- ⑥ 作法の動画 ----------
  // 絵が動き、字幕（フリガナつき）と読み上げで説明する。読み上げは端末の音声（なければ字幕だけ）。
  const synth = window.speechSynthesis;
  const canSpeak = !!(synth && window.SpeechSynthesisUtterance);
  const ICON = {
    prev: '<svg viewBox="0 0 24 24"><path d="M6 5 V19 M19 5 L9 12 L19 19 Z" fill="currentColor" stroke="currentColor" stroke-width="2"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M18 5 V19 M5 5 L15 12 L5 19 Z" fill="currentColor" stroke="currentColor" stroke-width="2"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4 L20 12 L7 20 Z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>',
    voiceOn: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M5 20 Q12 12 19 20" fill="currentColor"/><path d="M19 4 Q22 8 19 12" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    voiceOff: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M5 20 Q12 12 19 20" fill="currentColor"/><path d="M17 4 L22 9 M22 4 L17 9" stroke="currentColor" stroke-width="2"/></svg>',
  };
  function videoList() {
    render(head('作法の動画') + `
      ${say('happy', '絵が動いて、声で作法を説明するよ。字幕にもフリガナが付くから、いっしょに読んでみてね。')}
      ${SEQUENCES.map((q) => `<button class="btn seqbtn" data-go="videoPlay:${q.id}">${ART.step(q.steps[0].p, save.school)}<span><span class="t">${esc(q.title)}</span><span class="d">${q.role}の作法・${q.steps.length}場面</span></span></button>`).join('')}
      <button class="btn seqbtn" data-go="videoPlay:walk">${ART.menu('walk', save.school)}<span><span class="t">畳の歩き方</span><span class="d">にじり口から床の間・釜を拝見して席に着くまで</span></span></button>
      ${canSpeak ? '' : '<div class="note">この端末では読み上げが使えないため、字幕だけで再生します。</div>'}`);
  }

  // 動画プレーヤー共通部分。scenes: [{ html, cap, sub, say, dur, onShow }]
  function player(title, scenes, endButtons) {
    let i = 0, playing = true, timer = null, token = 0;
    render(head(title) + `
      <div class="player">
        <div class="screen" id="vd-screen"></div>
        <div class="caption" id="vd-cap"></div>
        <div class="vbar"><i id="vd-bar"></i></div>
        <div class="vctl">
          <button id="vd-prev" aria-label="前へ">${ICON.prev}</button>
          <button id="vd-play" class="big" aria-label="再生">${ICON.pause}</button>
          <button id="vd-next" aria-label="次へ">${ICON.next}</button>
          <button id="vd-voice" class="${save.voice && canSpeak ? '' : 'off'}" aria-label="読み上げ">${save.voice && canSpeak ? ICON.voiceOn : ICON.voiceOff}</button>
        </div>
      </div>
      <div id="vd-end"></div>`);
    const $ = (s) => app.querySelector(s);
    const stopAll = () => { clearTimeout(timer); timer = null; token++; if (canSpeak) synth.cancel(); };
    function speak(text, done) {
      if (!canSpeak || !save.voice) return false;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(RUBY.kana(text));
      u.lang = 'ja-JP'; u.rate = 0.95;
      const v = synth.getVoices().find((x) => /^ja/i.test(x.lang));
      if (v) u.voice = v;
      const my = token;
      let fired = false;
      const fin = () => { if (fired || my !== token) return; fired = true; done(); };
      u.onend = fin; u.onerror = fin;
      synth.speak(u);
      timer = setTimeout(fin, 4000 + text.length * 260);   // 読み上げが終わりを知らせない端末のための保険
      return true;
    }
    function show(k) {
      stopAll();
      i = Math.max(0, Math.min(scenes.length - 1, k));
      const s = scenes[i];
      if (s.html !== undefined) $('#vd-screen').innerHTML = s.html;
      render(`${s.cap ? `<b>${esc(s.cap)}</b>` : ''}${s.sub ? `<small>${esc(s.sub)}</small>` : ''}`, $('#vd-cap'));
      $('#vd-bar').style.width = `${(i + 1) / scenes.length * 100}%`;
      $('#vd-end').innerHTML = '';
      if (s.onShow) s.onShow();
      if (i === scenes.length - 1) { playing = false; setPlayIcon(); render(endButtons, $('#vd-end')); if (s.say) speak(s.say, () => {}); return; }
      if (!playing) return;
      const my = token;
      const advance = () => { if (my !== token) return; timer = setTimeout(() => { if (my === token && playing) show(i + 1); }, 700); };
      if (s.say && speak(s.say, advance)) return;
      timer = setTimeout(() => { if (my === token && playing) show(i + 1); }, s.dur || Math.max(3500, (s.say || '').length * 120));
    }
    function setPlayIcon() { $('#vd-play').innerHTML = playing ? ICON.pause : ICON.play; }
    $('#vd-prev').onclick = () => show(i - 1);
    $('#vd-next').onclick = () => show(i + 1);
    $('#vd-play').onclick = () => {
      if (i === scenes.length - 1) { playing = true; setPlayIcon(); return show(0); }
      playing = !playing; setPlayIcon();
      if (playing) show(i); else stopAll();
    };
    $('#vd-voice').onclick = () => {
      if (!canSpeak) return toast('think', 'この端末では読み上げが使えません');
      save.voice = !save.voice; persist();
      $('#vd-voice').innerHTML = save.voice ? ICON.voiceOn : ICON.voiceOff;
      $('#vd-voice').classList.toggle('off', !save.voice);
      if (playing) show(i);
    };
    BGM.duck(true);
    leaveHook = () => { stopAll(); BGM.duck(false); };
    pauseHook = () => { playing = false; stopAll(); setPlayIcon(); };
    show(0);
  }

  function videoPlay(id) {
    if (id === 'walk') return walkVideo();
    const q = SEQUENCES.find((x) => x.id === id);
    const title = `${q.title}（${q.role}の作法）`;
    const scenes = [{ html: `<div class="vtitle">${ART.mascot('joy')}</div>`, cap: q.title, sub: `${q.role}の作法・${sc().name}`, say: `これから、${q.title}をご紹介します。` }]
      .concat(q.steps.map((st, k) => {
        const text = stepText(st);
        return { html: `<span class="vnum">${k + 1}</span>${ART.step(st.p, save.school, true)}`, cap: text, sub: st.note, say: `${text}。${st.note}` };
      }))
      .concat([{ html: `<div class="vtitle">${ART.mascot('happy')}</div>`, cap: 'おしまい', sub: '順序ゲームで、覚えたか試してみよう！', say: 'おつかれさまでした。順序ゲームで、覚えたか試してみよう。' }]);
    player(title, scenes, `<button class="btn primary" data-go="seqPlay:${id}">順序ゲームで練習する</button><button class="btn" data-go="videoPlay:${id}">もう一度見る</button><button class="btn" data-go="videoList">ほかの動画へ</button>`);
    app.querySelector('#vd-screen').classList.add('anim');
  }

  function walkVideo() {
    const stage = Object.assign({ school: save.school }, WALK_STAGES[0]);
    // 台本を「話す場面」ごとにまとめ、その後の移動を場面の中で歩いて見せる
    const scenes = [];
    WALK_DEMO.forEach((d) => {
      if (d.say) scenes.push({ cap: d.say, say: d.say, pic: d.pic, moves: [] });
      else scenes[scenes.length - 1].moves.push(d.to);
    });
    const posAt = [];   // 各場面のはじめの位置
    let p = stage.start;
    scenes.forEach((s) => { posAt.push(p); if (s.moves.length) p = s.moves[s.moves.length - 1]; });
    let walkTimer = null;
    const list = [{ html: `<div class="vtitle">${ART.mascot('joy')}</div>`, cap: '畳の歩き方', sub: '茶室に入ってから席に着くまで', say: 'これから、茶室での畳の歩き方をご紹介します。' }]
      .concat(scenes.map((s, k) => ({
        cap: s.cap, say: s.say, dur: 3200 + s.moves.length * 600,
        onShow: () => {
          clearInterval(walkTimer);
          const scr = app.querySelector('#vd-screen');
          if (!scr.querySelector('#wk-me')) scr.innerHTML = ART.walkBoard(stage) + '<div class="vpic" id="vd-pic"></div>';
          placeToken(posAt[k]);
          app.querySelector('#vd-pic').innerHTML = s.pic ? ART.viewPic(s.pic) : '';
          let j = 0;
          walkTimer = setInterval(() => {
            if (j >= s.moves.length) return clearInterval(walkTimer);
            const prev = j ? s.moves[j - 1] : posAt[k], nx = s.moves[j++];
            placeToken(nx, Math.abs(nx[0] - prev[0]) + Math.abs(nx[1] - prev[1]) > 1 ? 'hop' : 'step');
          }, 600);
        },
      })))
      .concat([{ html: `<div class="vtitle">${ART.mascot('happy')}</div>`, cap: 'おしまい', sub: '歩き方ステージでためしてみよう！', say: 'おつかれさまでした。歩き方ステージで、ためしてみよう。', onShow: () => clearInterval(walkTimer) }]);
    player('作法の動画・畳の歩き方', list, '<button class="btn primary" data-go="walkList">歩き方ステージで練習する</button><button class="btn" data-go="videoPlay:walk">もう一度見る</button><button class="btn" data-go="videoList">ほかの動画へ</button>');
    const prevLeave = leaveHook;
    leaveHook = () => { clearInterval(walkTimer); prevLeave(); };
  }

  // ---------- 道具図鑑 ----------
  function zukan(id) {
    if (id) {
      const t = TOOLS.find((x) => x.id === id);
      render(head(t.name) + `
        <div class="card detail">${ART.icon(t.id, save.school)}
          <p class="sub center">よみ：${t.yomi}</p>
          <p>${esc(t.desc)}</p>
          ${t.season ? `<h3>季節による違い</h3><p>${esc(t.season)}</p>` : ''}
          ${t.diff ? `<h3>流派による違い</h3><div class="tbl"><table>${Object.values(SCHOOLS).map((x) => `<tr><th style="${x.id === save.school ? `color:${x.color};font-weight:bold` : ''}">${x.name}</th><td>${esc(t.diff[x.id])}</td></tr>`).join('')}</table></div>` : '<p class="sub">三千家でおおむね共通です。</p>'}
        </div>${DISCLAIMER}`);
      return;
    }
    render(head('道具図鑑') + `
      <p class="sub">道具をタップすると、季節や流派による違いが見られます。</p>
      <div class="tools">${TOOLS.map((t) => `<button class="tool" data-go="zukan:${t.id}">${ART.icon(t.id, save.school)}<span>${t.name}</span></button>`).join('')}</div>
      <button class="btn" data-go="dougu">④ お道具の名前当てで腕だめし</button>`);
  }

  // ---------- 三千家くらべ ----------
  function compare() {
    const S = Object.values(SCHOOLS);
    const row = (label, f) => `<tr><th>${label}</th>${S.map((x) => `<td>${f(x)}</td>`).join('')}</tr>`;
    render(head('三千家くらべ') + `
      <div class="tbl"><table>
        <thead><tr><th style="background:#8a7a5c"></th>${S.map((x) => `<th style="background:${x.color}">${x.name}</th>`).join('')}</tr></thead>
        ${row('庵号', (x) => esc(x.an))}
        ${row('家元', (x) => esc(x.iemoto))}
        ${row('祖', (x) => esc(x.founder))}
        ${row('茶筅', (x) => `<span class="cpic">${ART.chasen(x.chasenKey)}</span>${esc(x.chasen)}`)}
        ${row('薄茶の泡', (x) => `<span class="cpic">${ART.foam(x.foam)}</span>${esc(FOAM[x.foam])}`)}
        ${row('濃茶の帛紗', (x) => `<span class="cpic">${ART.dashi(x.dashi)}</span>${esc(DASHI[x.dashi])}`)}
        ${row('門下', (x) => esc(x.group))}
        ${row('名の由来', (x) => esc(x.origin))}
      </table></div>
      <h3>共通していること</h3>
      <div class="card"><ul class="pt">
        <li>どの家も千利休の孫・千宗旦の息子がおこした</li>
        <li>炉は11月〜4月、風炉は5月〜10月</li>
        <li>客は茶碗を回して正面を避けて飲む</li>
        <li>帛紗は左腰。一般に男性は紫、女性は朱</li>
        <li>濃茶には主菓子、薄茶には干菓子</li>
      </ul></div>
      ${DISCLAIMER}`);
  }

  const SCREENS = { home, course, seqList, seqPlay, simMonths, simPlay, quiz, dougu, walkList, walkPlay, videoList, videoPlay, zukan, compare };
  go('home');
})();
