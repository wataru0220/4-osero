// ===== 茶の湯みち：ゲーム本体 =====
(function () {
  const app = document.getElementById('app');
  const KEY = 'sado.v1';

  // ---------- 保存 ----------
  let save = { school: null, ruby: 'all', seq: {}, sim: {}, quiz: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) save = Object.assign(save, s); } catch (_) {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (_) {} };
  const bucket = (name) => (save[name][save.school] = save[name][save.school] || {});

  // ---------- 小道具 ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sc = () => SCHOOLS[save.school];
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const stepText = (st) => st.t || st[save.school];
  const thisMonth = () => new Date().getMonth() + 1;
  const DISCLAIMER = '<div class="note">※ 流派の違いは「一般にそう教えられることが多い」代表的なものです。細部は教室・先生・点前の種類によって異なります。お稽古では先生の教えを優先してください。</div>';
  const RUBY_MODES = [['all', 'ぜんぶ'], ['term', '茶道のことばだけ'], ['none', 'なし']];
  const FOAM_SHORT = { full: 'たっぷり', mikazuki: '控えめ（三日月）', least: '最も少なめ' };

  // 画面を描いてからフリガナを付ける
  function render(html, el) { el = el || app; el.innerHTML = html; RUBY.apply(el); }
  function setTheme() {
    document.documentElement.style.setProperty('--school', save.school ? sc().color : '#3f5a2a');
    document.body.dataset.ruby = save.ruby || 'all';
  }

  // ---------- 画面の移動・戻る ----------
  // 戻る先は「ひとつ上の画面」。スマホの戻る操作（ブラウザの戻る）でも同じ動きにする。
  const PARENT = { course: 'home', seqList: 'home', seqPlay: 'seqList', simMonths: 'home', simPlay: 'simMonths', quiz: 'home', zukan: 'home', compare: 'home' };
  let cur = { name: 'home' };
  const parentOf = (c) => (c.name === 'zukan' && c.arg) ? { name: 'zukan' } : { name: PARENT[c.name] || 'home' };
  const HOME_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 3 L21 11 M6 9 V21 H18 V9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  function head(title) {
    const deep = parentOf(cur).name !== 'home';
    return `<div class="bar"><button class="back" data-back>‹ もどる</button>${deep ? `<button class="homebtn" data-go="home" aria-label="ホームへ">${HOME_ICON}</button>` : ''}<span class="chip">${esc(sc().name)}</span></div><h2>${esc(title)}</h2>`;
  }

  app.addEventListener('click', (e) => {
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
  function home() {
    const s = save.school, m = thisMonth();
    const seqDone = s ? Object.keys(bucket('seq')).length : 0;
    const simDone = s ? Object.values(bucket('sim')).filter((v) => v >= 80).length : 0;
    const best = s ? (bucket('quiz').best || 0) : 0;
    const item = (go, ic, t, d) => `<button class="btn" data-go="${go}"><span class="ic">${ART.menu(ic, s, m)}</span><span><span class="t">${t}</span><span class="d">${d}</span></span></button>`;
    render(`
      <div class="top">
        <div class="hero-pic">${ART.room(m, seasonPick(m), { school: s })}</div>
        <p class="cap">今月（${m}月・${MONTHS[m].name}）の茶席</p>
        <h1>茶の湯みち</h1>
        <p class="sub center">三千家の作法を、順序・季節・知識でまなぶ</p>
      </div>
      <h3>コースをえらぶ</h3>
      <div class="schools">
        ${Object.values(SCHOOLS).map((x) => `<button class="school ${s === x.id ? 'on' : ''}" style="--c:${x.color}" data-school="${x.id}"><b>${x.name}</b><span>${x.an}</span></button>`).join('')}
      </div>
      ${s ? `
      <div class="menu">
        ${item('course', 'course', `${sc().name}とは`, '庵号・家元・この流派の見分けポイント')}
        ${item('seqList', 'seq', '① お点前の順序', `絵のカードを正しい順に並べる（${seqDone}/${SEQUENCES.length} 修了）`)}
        ${item('simMonths', 'sim', '② 季節の茶席シミュレーション', `月をえらび、道具を組んで点前をする（月の印 ${simDone}/12）`)}
        ${item('quiz', 'quiz', '③ 知識クイズ', `10問勝負（最高 ${best}/10）`)}
        ${item('zukan', 'zukan', '道具図鑑', '道具ごとの季節・流派の違い')}
        ${item('compare', 'compare', '三千家くらべ', '三つの流派の違いを一覧で')}
      </div>` : '<p class="sub center">まずは学びたい流派をえらんでください。<br>あとから切り替えられます。</p>'}
      <div class="rubyset"><span class="lbl">ふりがな</span>${RUBY_MODES.map(([k, l]) => `<button class="seg ${save.ruby === k ? 'on' : ''}" data-ruby="${k}">${l}</button>`).join('')}</div>
      ${DISCLAIMER}`);
    app.querySelectorAll('[data-school]').forEach((b) => b.onclick = () => { save.school = b.dataset.school; persist(); go('home'); });
    app.querySelectorAll('[data-ruby]').forEach((b) => b.onclick = () => { save.ruby = b.dataset.ruby; persist(); go('home'); });
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
      <p class="sub">ばらばらになった手順のカードを、正しい順にタップしてください。まちがえずに並べると★3つ。</p>
      ${SEQUENCES.map((q) => `<button class="btn seqbtn" data-go="seqPlay:${q.id}">${ART.step(q.steps[0].p, save.school)}<span><span class="t">${esc(q.title)}</span><span class="d">${q.role}の作法・${q.steps.length}手順・${'初中上'[q.level - 1]}級　<span class="stars">${b[q.id] ? stars(b[q.id]) : ''}</span></span></span></button>`).join('')}`);
  }

  function seqPlay(id) {
    const q = SEQUENCES.find((x) => x.id === id);
    const steps = q.steps.map((st, i) => ({ i, text: stepText(st), p: st.p }));
    let pool = shuffle(steps), next = 0, miss = 0, missHere = 0;
    const pic = (s) => ART.step(s.p, save.school);
    function draw() {
      render(head(q.title) + `
        <div class="status"><span>${next}/${steps.length} 手順</span><span id="miss">まちがい ${miss}</span></div>
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
          b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
          app.querySelector('#miss').textContent = 'まちがい ' + miss;
          if (missHere === 2) setTimeout(draw, 380);
        }
      });
    }
    function done() {
      const n = miss === 0 ? 3 : miss <= 2 ? 2 : 1;
      const b = bucket('seq'); b[id] = Math.max(b[id] || 0, n); persist();
      render(head(q.title) + `
        <div class="big stars">${stars(n)}</div>
        <p class="center">${miss === 0 ? 'おみごと！ まちがいなし' : `まちがい ${miss}回`}</p>
        <h3>正しい順序と解説</h3>
        <ol class="placed">${q.steps.map((st) => {
          const differs = !st.t;
          const others = differs ? Object.values(SCHOOLS).filter((x) => x.id !== save.school).map((x) => `${x.name}：${esc(st[x.id])}`).join('<br>') : '';
          return `<li><span class="tx">${esc(stepText(st))}${differs ? '<span class="diff">流派で違う</span>' : ''}<span class="n2">${esc(st.note)}${differs ? '<br>' + others : ''}</span></span>${ART.step(st.p, save.school)}</li>`;
        }).join('')}</ol>
        <button class="btn primary" data-go="seqPlay:${id}">もう一度</button>
        <button class="btn" data-go="seqList">ほかの作法へ</button>`);
    }
    draw();
  }

  // ---------- ② 季節の茶席 ----------
  function simMonths() {
    const b = bucket('sim');
    render(head('季節の茶席シミュレーション') + `
      <p class="sub">月をえらぶと、その季節の茶席の亭主になります。道具を組み、点前の判断をして、80点以上で月の印がもらえます。</p>
      <div class="months">${MONTHS.slice(1).map((x) => `<button class="month ${x.ro ? 'ro' : 'fu'}" data-go="simPlay:${x.m}">${b[x.m] >= 80 ? '<span class="stamp">印</span>' : ''}${ART.opt('hana', x.hana)}<b>${x.m}月</b><small>${x.name}</small><span class="rf">${x.ro ? '炉' : '風炉'}</span></button>`).join('')}</div>
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
      const pics = q.c.map((c) => ART.opt(q.k, c, save.school));
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
      const score = Math.round(ok / Q.length * 100);
      const b = bucket('sim'); b[m] = Math.max(b[m] || 0, score); persist();
      const kamaKey = Object.keys(KAMA).find((k) => KAMA[k] === ans.kama) || 'normal';
      const cupKey = Object.keys(CUP).find((k) => CUP[k] === ans.cup) || 'normal';
      render(head(`${m}月の茶席・結果`) + `
        <div class="hero-pic">${ART.room(m, { hearth: ans.hearth, kama: kamaKey, cupKey }, { school: save.school })}</div>
        <div class="big">${score}<span style="font-size:18px">点</span></div>
        <p class="center">${score >= 80 ? `${m}月の印をいただきました` : '80点以上で月の印がもらえます'}</p>
        <div class="card">${Q.map((q) => {
          const good = ans[q.k] === q.a;
          return `<div class="res"><span class="mk ${good ? 'o' : 'x'}">${good ? '○' : '×'}</span><div><b>${esc(q.q)}</b><br>${good ? esc(q.a) : `あなた：${esc(ans[q.k])}<br>正解：<b>${esc(q.a)}</b>`}<small>${esc(q.e)}</small></div></div>`;
        }).join('')}</div>
        <button class="btn primary" data-go="simPlay:${m}">もう一度</button>
        <button class="btn" data-go="simMonths">ほかの月へ</button>
        ${DISCLAIMER}`);
    }
    draw();
  }

  // ---------- ③ クイズ ----------
  function quiz() {
    const own = shuffle(QUIZ.filter((q) => q.s === save.school)).slice(0, 3);
    const other = shuffle(QUIZ.filter((q) => q.s !== 'all' && q.s !== save.school)).slice(0, 1);
    const common = shuffle(QUIZ.filter((q) => q.s === 'all')).slice(0, 10 - own.length - other.length);
    const list = shuffle(own.concat(other, common)).map((q) => {
      const order = shuffle(q.c.map((_, i) => i));
      return { q: q.q, s: q.s, c: order.map((i) => q.c[i]), a: order.indexOf(q.a), e: q.e };
    });
    let idx = 0, ok = 0;
    const wrong = [];
    function draw() {
      const q = list[idx];
      const tag = q.s === 'all' ? '共通' : SCHOOLS[q.s].name;
      render(head('知識クイズ') + `
        <div class="status"><span>第${idx + 1}問　<span class="chip" style="background:${q.s === 'all' ? '#8a7a5c' : SCHOOLS[q.s].color}">${tag}</span></span><span>正解 ${ok}</span></div>
        <div class="progress"><i style="width:${idx / list.length * 100}%"></i></div>
        <div class="qpic">${ART.quiz(q.q)}</div>
        <p class="q">${esc(q.q)}</p>
        <div class="opts one">${q.c.map((c, i) => `<button class="btn" data-i="${i}"><span>${esc(c)}</span></button>`).join('')}</div>
        <div id="ex"></div>`);
      const btns = app.querySelectorAll('[data-i]');
      btns.forEach((b) => b.onclick = () => {
        const i = +b.dataset.i, good = i === q.a;
        if (good) ok++; else wrong.push(q);
        btns.forEach((x) => { x.onclick = null; if (+x.dataset.i === q.a) x.classList.add('right'); });
        if (!good) b.classList.add('wrong');
        render(`<div class="expl ${good ? 'o' : 'x'}"><b>${good ? '○ 正解' : '× ざんねん'}</b><br>${esc(q.e)}</div>
          <button class="btn primary" id="nx">${idx + 1 < list.length ? '次の問題' : '結果を見る'}</button>`, app.querySelector('#ex'));
        app.querySelector('#nx').onclick = () => { idx++; idx < list.length ? draw() : result(); };
        app.querySelector('#nx').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    function result() {
      const b = bucket('quiz'); b.best = Math.max(b.best || 0, ok); persist();
      const rank = ok === 10 ? '宗匠' : ok >= 8 ? '師範' : ok >= 6 ? '中級' : ok >= 4 ? '初級' : '入門';
      render(head('クイズ結果') + `
        <div class="big">${ok}<span style="font-size:18px"> / 10</span></div>
        <p class="center">称号：<b>${rank}</b>　（最高 ${b.best}/10）</p>
        ${wrong.length ? `<h3>まちがえた問題</h3><div class="card">${wrong.map((q) => `<div class="res"><span class="mk x">×</span><div><b>${esc(q.q)}</b><br>正解：${esc(q.c[q.a])}<small>${esc(q.e)}</small></div></div>`).join('')}</div>` : '<p class="center">全問正解！</p>'}
        <button class="btn primary" data-go="quiz">もう一度（問題が変わります）</button>
        <button class="btn" data-go="home">ホームへ</button>`);
    }
    draw();
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
      <div class="tools">${TOOLS.map((t) => `<button class="tool" data-go="zukan:${t.id}">${ART.icon(t.id, save.school)}<span>${t.name}</span></button>`).join('')}</div>`);
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

  const SCREENS = { home, course, seqList, seqPlay, simMonths, simPlay, quiz, zukan, compare };
  go('home');
})();
