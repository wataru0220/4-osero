// ===== 茶の湯みち：ゲーム本体 =====
(function () {
  const app = document.getElementById('app');
  const KEY = 'sado.v1';
  const MAX_MISS = 3;   // ミスがこの回数になったら失格

  // ---------- 保存 ----------
  let save = { school: null, gender: 'f', ruby: 'all', bgm: true, voice: true, voiceStyle: 'natural', voiceVer: 2, voiceName: '', walkCfg: { room: '4.5', season: 'furo', role: 'shokyaku' }, seq: {}, sim: {}, stamp: {}, quiz: {}, dougu: {}, walk: {} };
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) {
      save = Object.assign(save, s);
      // 前の版の「かわいい（高すぎる声）」の設定は、しぜんに戻す
      if (s.voiceVer !== 2) { save.voiceStyle = 'natural'; save.voiceVer = 2; }
    }
  } catch (_) {}
  // いまは無い流派（前の版の武者小路千家など）をえらんでいたときは、流派をえらび直してもらう
  if (save.school && !SCHOOLS[save.school]) save.school = null;
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (_) {} };
  const bucket = (name) => { save[name] = save[name] || {}; return (save[name][save.school] = save[name][save.school] || {}); };

  // ---------- 小道具 ----------
  // 画面に出す文は L('日本語の文') で訳す（i18n.js）。データの中身（data.js）は日本語のまま判定に使い、出すときだけ訳す
  const L = I18N.L;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sc = () => SCHOOLS[save.school];
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const starsByMiss = (miss) => MAX_MISS - miss;   // ミス0＝★3、1＝★2、2＝★1
  // 手順：流派ごとの配列にも対応。文は 流派別・男女別 のどちらでも書ける
  const stepsOf = (q) => (Array.isArray(q.steps) ? q.steps : (q.steps[save.school] || q.steps.omote));
  const stepText = (st) => L(st.tg ? st.tg[save.gender] : (st.t || st[save.school]));
  const sayOf = (st) => (typeof st.say === 'string' ? L(st.say) : st.say ? L(st.say[save.school] || st.say[save.gender]) : L('{a}。{b}', { a: stepText(st), b: L(st.note) }));
  // 男女の違い（この流派に資料があるものだけ）。例「正座の膝の間：女性はこぶし一つ分あける」
  const genderDiff = (id) => { const d = GENDER_DIFFS.find((x) => x.id === id); const v = d && (d[save.school] || d.all); return v ? { k: d.k, m: v.m, f: v.f } : null; };
  const gtext = (id) => { const v = genderDiff(id); return v ? L('{k}：{g}は{v}', { k: L(v.k), g: L(GENDERS[save.gender].name), v: L(v[save.gender]) }) : ''; };
  const thisMonth = () => new Date().getMonth() + 1;
  // 月の名前。日本語以外は端末の言語の書き方（English なら October、短くするなら Oct）
  const monthName = (m, short) => (I18N.ja ? `${m}月` : new Intl.DateTimeFormat(I18N.code, { month: short || I18N.cjk ? 'short' : 'long' }).format(new Date(2000, m - 1, 15)));
  const DISCLAIMER = `<div class="note">${L('※ 流派の違いは「一般にそう教えられることが多い」代表的なものです。細部は教室・先生・点前の種類によって異なります。お稽古では先生の教えを優先してください。')}</div>`;
  const RUBY_MODES = [['all', 'ぜんぶ'], ['term', '茶道のことばだけ'], ['none', 'なし']];
  const FOAM_SHORT = { full: 'たっぷり', mikazuki: '控えめ（三日月）' };
  const say = (expr, html) => `<div class="talk"><span class="mc">${ART.mascot(expr)}</span><div class="bub">${html}</div></div>`;
  const lives = (miss) => `<span class="lives" aria-label="${esc(L('のこり{n}', { n: MAX_MISS - miss }))}">${[...Array(MAX_MISS)].map((_, i) => ART.life(i < MAX_MISS - miss)).join('')}</span>`;
  const FAIL = `<div class="fail"><span>${L('失格')}</span></div>`;
  // 参考にした資料（作法の出典）
  const refs = () => `<details class="refs"><summary>${L('参考にした資料')}</summary><ul>${REFERENCES.map((r) => `<li><a href="${r.u}" target="_blank" rel="noopener">${esc(L(r.t))}</a></li>`).join('')}</ul></details>`;
  // せまい所では訳の後ろの（説明）を省く（例：「Ro (sunken hearth)」→「Ro」）
  const noGloss = (s) => String(s).replace(/\s*[（(][^（()）]*[）)]\s*$/, '');
  // 別々に訳した文をつなぐときの区切り（日本語・中国語はなし、英語・韓国語などは空白）
  const SEP = /^(ja|zh)/.test(I18N.code) ? '' : ' ';
  // 2人の名前を「AとB」のようにつなぐ（1人ならそのまま）
  const names2 = (list, tpl) => (list.length > 1 ? L(tpl, { a: L(list[0].name), b: L(list[1].name) }) : L(list[0].name));

  // 画面を描いてからフリガナを付ける（ふりがなは日本語のときだけ）
  function render(html, el) { el = el || app; el.innerHTML = html; if (I18N.ja) RUBY.apply(el); }
  function setTheme() {
    document.documentElement.style.setProperty('--school', save.school ? sc().color : '#3f5a2a');
    document.body.dataset.ruby = save.ruby || 'all';
    ART.setGender(save.gender);
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

  // ---------- アプリにする（ホーム画面に追加） ----------
  // Android・パソコンの Chrome/Edge はインストールの画面を出せる。iPhone は Safari の共有ボタンから自分で追加する。
  let installEvt = null;
  const UA = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(UA);
  const inAppBrowser = /Line\/|FBAN|FBAV|Instagram|MicroMessenger|Twitter/i.test(UA);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const APP_URL = 'https://wataru0220.github.io/4-osero/sado/';
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); installEvt = e;
    if (cur.name === 'home' || cur.name === 'install') go(cur.name);   // ボタンを「追加する」に変える
  });
  window.addEventListener('appinstalled', () => {
    installEvt = null;
    toast('joy', L('アプリに追加しました！ ホーム画面のまっちゃんから開けます'));
    if (cur.name === 'home' || cur.name === 'install') go(cur.name);
  });
  async function doInstall() {
    if (!installEvt) return go('install');
    const e = installEvt;
    installEvt = null;
    e.prompt();
    try { await e.userChoice; } catch (_) {}
    if (cur.name === 'home' || cur.name === 'install') go(cur.name);
  }

  // ---------- 画面の移動・戻る ----------
  // 戻る先は「ひとつ上の画面」。スマホの戻る操作（ブラウザの戻る）でも同じ動きにする。
  const PARENT = { install: 'home', course: 'home', seqList: 'home', seqPlay: 'seqList', simMonths: 'home', simPlay: 'simMonths', quiz: 'home', dougu: 'home', walkList: 'home', walkPlay: 'walkList', videoList: 'home', videoPlay: 'videoList', zukan: 'home', compare: 'home' };
  let cur = { name: 'home' };
  let leaveHook = null;   // 画面を離れるときの後片付け（動画のタイマー・読み上げ）
  const parentOf = (c) => (c.name === 'zukan' && c.arg) ? { name: 'zukan' } : { name: PARENT[c.name] || 'home' };
  const HOME_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 3 L21 11 M6 9 V21 H18 V9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  function head(title) {
    const deep = parentOf(cur).name !== 'home';
    return `<div class="bar"><button class="back" data-back>${L('‹ もどる')}</button>${deep ? `<button class="homebtn" data-go="home" aria-label="${esc(L('ホームへ'))}">${HOME_ICON}</button>` : ''}<button class="homebtn snd${save.bgm ? '' : ' off'}" data-bgm aria-label="BGM">${SND(save.bgm)}</button>${save.school ? `<span class="chip">${esc(L(sc().name))}</span>` : ''}</div><h2>${esc(title)}</h2>`;
  }

  app.addEventListener('click', (e) => {
    if (e.target.closest('[data-bgm]')) return setBgm(!save.bgm);
    if (e.target.closest('[data-back]')) return back();
    if (e.target.closest('[data-install]')) return doInstall();
    const t = e.target.closest('[data-go]');
    if (!t) return;
    const [name, arg] = t.dataset.go.split(':');
    go(name, arg);
  });

  // ホーム以外にいる間は履歴を1つ積んでおき、戻る操作を受け止める
  let popGuard = false;
  function syncHistory() {
    if (popGuard) return;   // 戻る処理の途中。終わったら popstate で合わせ直す（二重に戻らないように）
    const top = history.state && history.state.sado === 'top';
    if (cur.name !== 'home' && !top) history.pushState({ sado: 'top' }, '');
    else if (cur.name === 'home' && top) { popGuard = true; history.back(); }
  }
  window.addEventListener('popstate', () => {
    if (popGuard) { popGuard = false; syncHistory(); return; }
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
  const GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12 H21 M12 3 Q6.5 12 12 21 M12 3 Q17.5 12 12 21" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  function home() {
    const s = save.school, m = thisMonth();
    const item = (go, ic, t, d) => `<button class="btn" data-go="${go}"><span class="ic">${ART.menu(ic, s, m)}</span><span><span class="t">${t}</span><span class="d">${d}</span></span></button>`;
    let menu = '';
    if (s) {
      const seqDone = Object.keys(bucket('seq')).length;
      const walkDone = Object.keys(bucket('walk')).filter((k) => k.includes('|')).length;
      menu = `
      <h3>${L('あそんで覚える')}</h3>
      <div class="menu">
        ${item('seqList', 'seq', L('① お点前の順序'), L('絵のカードを正しい順に並べる（{a}/{b} 修了）', { a: seqDone, b: SEQUENCES.length }))}
        ${item('simMonths', 'sim', L('② 季節の茶席シミュレーション'), L('月をえらび、道具を組んで点前をする（月の印 {a}/12）', { a: stampCount() }))}
        ${item('quiz', 'quiz', L('③ 知識クイズ'), L('10問勝負（最高 {a}/10）', { a: bucket('quiz').best || 0 }))}
        ${item('dougu', 'dougu', L('④ お道具の名前当て'), L('絵と名前を結びつける10問（最高 {a}/10）', { a: bucket('dougu').best || 0 }))}
        ${item('walkList', 'walk', L('⑤ 茶室の歩き方（席入り）'), L('正客・次客・お詰めになって、広さのちがう茶室へ（クリア {a}/{b}）', { a: walkDone, b: ROOMS.length * WALK_SEASONS.length * WALK_ROLES.length }))}
      </div>
      <p class="sub center">${L('どのゲームも、ミスは{n}回で失格です。', { n: MAX_MISS })}</p>
      <h3>${L('見て学ぶ')}</h3>
      <div class="menu">
        ${item('videoList', 'video', L('作法の動画'), L('絵が動いて、声で説明します'))}
        ${item('course', 'course', L('{name}とは', { name: L(sc().name) }), L('庵号・家元・この流派の見分けポイント'))}
        ${item('zukan', 'zukan', L('道具図鑑'), L('道具ごとの季節・流派の違い'))}
        ${item('compare', 'compare', L('表千家・裏千家くらべ'), L('二つの流派の違いを一覧で'))}
      </div>`;
    }
    render(`
      <div class="langbar"><label>${GLOBE}<select id="lang" aria-label="Language / 言語">${LANGS.map((l) => `<option value="${l.code}"${l.code === I18N.code ? ' selected' : ''}>${l.name}</option>`).join('')}</select></label></div>
      <div class="top">
        <div class="hero-pic">${ART.room(m, seasonPick(m), { school: s })}</div>
        <p class="cap">${L('今月（{month}・{name}）の茶席', { month: monthName(m), name: L(MONTHS[m].name) })}</p>
        <h1>${L('茶の湯みち')}</h1>
        ${say('happy', L('ようこそ！ わたしは<b>まっちゃん</b>。いっしょに茶道をまなぼう！'))}
      </div>
      ${isStandalone() ? '' : `<button class="btn appcard" data-install><span class="ic">${ART.menu('app', s, m)}</span><span><span class="t">${installEvt ? L('アプリとして追加する') : L('アプリにする')}</span><span class="d">${L('ホーム画面にまっちゃんのアイコンを置いて、すぐ遊べる')}</span></span></button>`}
      <h3>${L('コースをえらぶ')}</h3>
      <div class="schools">
        ${Object.values(SCHOOLS).map((x) => `<button class="school ${s === x.id ? 'on' : ''}" style="--c:${x.color}" data-school="${x.id}"><b>${L(x.name)}</b><span>${L(x.an)}</span></button>`).join('')}
      </div>
      <div class="rubyset"><span class="lbl">${L('お点前をする人')}</span>${Object.entries(GENDERS).map(([k, g]) => `<button class="seg ${save.gender === k ? 'on' : ''}" data-gender="${k}">${I18N.ja ? `${g.name}（${k === 'm' ? '男手前' : '女手前'}）` : L(k === 'm' ? '男手前' : '女手前')}</button>`).join('')}</div>
      ${menu || `<p class="sub center">${L('まずは学びたい流派をえらんでください。<br>あとから切り替えられます。')}</p>`}
      ${I18N.ja ? `<div class="rubyset"><span class="lbl">ふりがな</span>${RUBY_MODES.map(([k, l]) => `<button class="seg ${save.ruby === k ? 'on' : ''}" data-ruby="${k}">${l}</button>`).join('')}</div>` : ''}
      <div class="rubyset"><span class="lbl">BGM</span><button class="seg ${save.bgm ? 'on' : ''}" data-bgmset="on">${L('オン')}</button><button class="seg ${save.bgm ? '' : 'on'}" data-bgmset="off">${L('オフ')}</button></div>
      ${DISCLAIMER}`);
    app.querySelector('#lang').onchange = (e) => I18N.setLang(e.target.value);
    app.querySelectorAll('[data-school]').forEach((b) => b.onclick = () => { save.school = b.dataset.school; persist(); go('home'); });
    app.querySelectorAll('[data-ruby]').forEach((b) => b.onclick = () => { save.ruby = b.dataset.ruby; persist(); go('home'); });
    app.querySelectorAll('[data-gender]').forEach((b) => b.onclick = () => { save.gender = b.dataset.gender; persist(); go('home'); });
    app.querySelectorAll('[data-bgmset]').forEach((b) => b.onclick = () => setBgm(b.dataset.bgmset === 'on'));
  }

  // ---------- アプリにする ----------
  function install() {
    const step = (n, html) => `<li><span class="no">${n}</span><span>${html}</span></li>`;
    const SHARE = `<svg class="ico" viewBox="0 0 24 24" aria-label="${esc(L('共有ボタン'))}"><path d="M8 9 H5 V21 H19 V9 H16" fill="none" stroke="#2f7ae5" stroke-width="2"/><path d="M12 15 V3 M8 7 L12 3 L16 7" fill="none" stroke="#2f7ae5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const DOTS = `<svg class="ico" viewBox="0 0 24 24" aria-label="${esc(L('メニュー'))}"><circle cx="12" cy="5" r="2" fill="#555"/><circle cx="12" cy="12" r="2" fill="#555"/><circle cx="12" cy="19" r="2" fill="#555"/></svg>`;
    let how;
    if (isStandalone()) how = say('joy', L('いまアプリとして開いています！ ホーム画面のまっちゃんから、いつでも遊べるよ。'));
    else if (installEvt) how = say('happy', L('下のボタンを押すと、アプリとして追加できるよ。')) + `<button class="btn primary" data-install>${L('アプリとして追加する')}</button>`;
    else if (isIOS && inAppBrowser) how = say('think', L('LINE などのアプリの中で開いているときは、アプリにできません。まず Safari で開いてね。'))
      + `<ol class="steps">${step(1, L('右上（または右下）のメニューをタップ'))}${step(2, L('「Safariで開く」（「ブラウザで開く」）をえらぶ'))}${step(3, L('Safari で開いたら、もう一度この画面へ'))}</ol>`;
    else if (isIOS) how = say('happy', L('iPhone・iPad は、Safari の共有ボタンから追加するよ。'))
      + `<ol class="steps">${step(1, L('画面の下（iPad は上）にある共有ボタン {icon} をタップ', { icon: SHARE }))}${step(2, L('メニューを下へ動かして「ホーム画面に追加」をタップ'))}${step(3, L('右上の「追加」をタップすると、ホーム画面にまっちゃんのアイコンができます'))}</ol>`;
    else if (isAndroid) how = say('happy', L('ブラウザのメニューから追加するよ。'))
      + `<ol class="steps">${step(1, L('右上のメニュー {icon} をタップ', { icon: DOTS }))}${step(2, L('「アプリをインストール」または「ホーム画面に追加」をタップ'))}${step(3, L('「インストール」（「追加」）をタップ'))}</ol>`;
    else how = say('happy', L('スマホで下の QR コードを読み取ると、すぐ開けるよ。開いたら「アプリにする」から入れてね。'))
      + `<p class="sub">${L('パソコンにも入れるときは、Chrome か Edge でこのページを開き、アドレスバーの右にある「インストール」のボタンを押します。')}</p>`;
    render(head(L('アプリにする')) + `
      <div class="appicon"><img src="icon-192.png" alt="" width="88" height="88"><b>${L('茶の湯みち')}</b></div>
      ${how}
      <div class="card"><b>${L('アプリにすると')}</b><ul class="pt"><li>${L('ホーム画面のアイコンから、すぐに起動できる')}</li><li>${L('画面いっぱいに大きく遊べる')}</li><li>${L('一度開いておけば、ネットがなくても遊べる（読み上げは端末によります）')}</li><li>${L('アイコンを長押しすると、ゲームや動画へ直接行ける')}</li></ul></div>
      <h3>${L('スマホ・友だちのスマホで開く')}</h3>
      <div class="qrbox">${ART.qr()}<p class="sub">${APP_URL}</p></div>`);
  }

  // ---------- 流派紹介 ----------
  function course() {
    const x = sc();
    render(head(L('{name}とは', { name: L(x.name) })) + `
      <div class="hero-pic small">${ART.teahouse()}</div>
      <div class="card"><dl class="dl">
        <dt>${L('庵号')}</dt><dd>${L(x.an)}</dd>
        <dt>${L('家元')}</dt><dd>${L('代々 {name} を名乗る', { name: L(x.iemoto) })}</dd>
        <dt>${L('祖')}</dt><dd>${L('{name}（千宗旦の子）', { name: L(x.founder) })}</dd>
        <dt>${L('門下')}</dt><dd>${L(x.group)}</dd>
        <dt>${L('名の由来')}</dt><dd>${L(x.origin)}</dd>
      </dl></div>
      <h3>${L('見分けポイント')}</h3>
      <div class="marks">
        <div class="mark">${ART.chasen(x.chasenKey)}<b>${L('茶筅')}</b><span>${L(x.chasen)}</span></div>
        <div class="mark">${ART.foam(x.foam)}<b>${L('薄茶の泡')}</b><span>${L(FOAM_SHORT[x.foam])}</span></div>
        <div class="mark">${ART.dashi(x.dashi)}<b>${L('濃茶の帛紗')}</b><span>${L(DASHI[x.dashi])}</span></div>
      </div>
      <h3>${L('この流派のポイント')}</h3>
      <div class="card"><ul class="pt">${x.points.map((p) => `<li>${esc(L(p))}</li>`).join('')}</ul></div>
      <h3>${L('男性・女性のちがい（{name}）', { name: L(x.name) })}</h3>
      <div class="card"><dl class="dl gdl">${GENDER_DIFFS.map((d) => genderDiff(d.id)).filter(Boolean).map((v) => `<dt>${esc(L(v.k))}</dt><dd><span class="${save.gender === 'm' ? 'me' : ''}">${L('男性：{v}', { v: esc(L(v.m)) })}</span><br><span class="${save.gender === 'f' ? 'me' : ''}">${L('女性：{v}', { v: esc(L(v.f)) })}</span></dd>`).join('')}</dl>
        <p class="sub">${L('いまは「{g}」でお点前を学んでいます（ホームで切り替えられます）。', { g: L(GENDERS[save.gender].name) })}</p></div>
      <h3>${L('お辞儀の真・行・草（裏千家の例）')}</h3>
      <div class="card"><dl class="dl">${BOWS.map((b) => `<dt>${L(b.k)}</dt><dd>${esc(L(b.d))}</dd>`).join('')}</dl></div>
      <p class="sub">${L('表千家と裏千家は、どちらも千利休の孫・千宗旦の息子たちがおこした家です。根っこは同じなので、作法の大部分は共通しています。')}</p>
      <button class="btn primary" data-go="seqList">${L('お点前の順序をはじめる')}</button>
      ${refs()}
      ${DISCLAIMER}`);
  }

  // ---------- ① 順序 ----------
  function seqList() {
    const b = bucket('seq');
    const LEVELS = ['初級', '中級', '上級'];
    render(head(L('お点前の順序')) + `
      ${say('happy', L('ばらばらになった手順のカードを、正しい順にタップしてね。ミス{n}回で失格。まちがえずに並べると★3つ！', { n: MAX_MISS }))}
      ${SEQUENCES.map((q) => `<button class="btn seqbtn" data-go="seqPlay:${q.id}">${ART.step(stepsOf(q)[0].p, save.school)}<span><span class="t">${esc(L(q.title))}</span><span class="d">${L('{role}の作法・{n}手順・{level}', { role: L(q.role), n: stepsOf(q).length, level: L(LEVELS[q.level - 1]) })}　<span class="stars">${b[q.id] ? stars(b[q.id]) : ''}</span></span></span></button>`).join('')}`);
  }

  function answerList(q) {
    const list = stepsOf(q);
    const perSchool = !Array.isArray(q.steps);
    const memo = (q.memo && q.memo[save.school]) || '';
    return (perSchool ? `<p class="sub">${L('この作法は、流派によって手順の順番や所作が少しずつ違います（いまは{name}の手順）。', { name: L(sc().name) })}${memo ? SEP + L(memo) : ''}</p>` : '')
      + `<ol class="placed">${list.map((st) => {
        const bySchool = !st.t && !st.tg;
        const others = bySchool ? Object.values(SCHOOLS).filter((x) => x.id !== save.school).map((x) => L('{a}：{b}', { a: L(x.name), b: esc(L(st[x.id])) })).join('<br>') : '';
        const otherG = st.tg ? L('{a}：{b}', { a: L(GENDERS[save.gender === 'm' ? 'f' : 'm'].name), b: esc(L(st.tg[save.gender === 'm' ? 'f' : 'm'])) }) : '';
        const g = st.gkey ? gtext(st.gkey) : '';
        return `<li><span class="tx">${esc(stepText(st))}${bySchool || st.x ? `<span class="diff">${L('流派で違う')}</span>` : ''}${st.tg ? `<span class="diff">${L('男女で違う')}</span>` : ''}<span class="n2">${esc(L(st.note))}${g ? '<br>' + esc(g) : ''}${bySchool ? '<br>' + others : ''}${st.x ? '<br>' + esc(L(st.x)) : ''}${otherG ? '<br>' + otherG : ''}</span></span>${ART.step(st.p, save.school)}</li>`;
      }).join('')}</ol>`;
  }

  function seqPlay(id) {
    const q = SEQUENCES.find((x) => x.id === id);
    const steps = stepsOf(q).map((st, i) => ({ i, text: stepText(st), p: st.p }));
    let pool = shuffle(steps), next = 0, miss = 0, missHere = 0;
    const pic = (s) => ART.step(s.p, save.school);
    // 手順が多いときは、置いたカードを直近の3枚だけ見せ（前は折りたたむ）、選ぶカードも小さめにする
    const long = steps.length > 14, KEEP = 3;
    const li = (s) => `<li><span class="tx">${esc(s.text)}</span>${pic(s)}</li>`;
    function draw() {
      const hide = long && next > KEEP ? next - KEEP : 0;
      render(head(L(q.title)) + `
        <div class="status"><span>${L('{a}/{b} 手順', { a: next, b: steps.length })}</span>${lives(miss)}</div>
        <div class="progress"><i style="width:${next / steps.length * 100}%"></i></div>
        ${hide ? `<details class="earlier"><summary>${L('1〜{n}番目を見る', { n: hide })}</summary><ol class="placed">${steps.slice(0, hide).map(li).join('')}</ol></details>` : ''}
        <ol class="placed" style="counter-reset:n ${hide}">${steps.slice(hide, next).map(li).join('')}</ol>
        <div class="slot">${L('{n}番目はどれ？', { n: next + 1 })}</div>
        <div class="pool${long ? ' compact' : ''}">${pool.map((s) => `<button class="btn ${missHere >= 2 && s.i === next ? 'hint' : ''}" data-i="${s.i}">${pic(s)}<span>${esc(s.text)}</span></button>`).join('')}</div>`);
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
          toast('oops', missHere >= 2 ? L('光っているカードがヒントだよ') : L('あれれ？ {n}番目はちがうよ', { n: next + 1 }));
          if (missHere === 2) setTimeout(draw, 380);
        }
      });
    }
    function done() {
      const n = starsByMiss(miss);
      const b = bucket('seq'); b[id] = Math.max(b[id] || 0, n); persist();
      render(head(L(q.title)) + `
        <div class="big stars">${stars(n)}</div>
        ${say(miss === 0 ? 'joy' : 'happy', miss === 0 ? L('おみごと！ まちがいなし！') : L('よくできました！（ミス{n}回）', { n: miss }))}
        <h3>${L('正しい順序と解説')}</h3>
        ${answerList(q)}
        <button class="btn primary" data-go="seqPlay:${id}">${L('もう一度')}</button>
        <button class="btn" data-go="videoPlay:${id}">${L('この作法の動画を見る')}</button>
        <button class="btn" data-go="seqList">${L('ほかの作法へ')}</button>`);
      if (miss === 0) confetti();
    }
    function fail() {
      render(head(L(q.title)) + FAIL + say('sad', L('ミスが{n}回になりました。正しい順序を見て、もう一度ちょうせんしよう！', { n: MAX_MISS })) + `
        <h3>${L('正しい順序と解説')}</h3>
        ${answerList(q)}
        <button class="btn primary" data-go="seqPlay:${id}">${L('もう一度')}</button>
        <button class="btn" data-go="videoPlay:${id}">${L('この作法の動画を見る')}</button>
        <button class="btn" data-go="seqList">${L('ほかの作法へ')}</button>`);
    }
    draw();
  }

  // ---------- ② 季節の茶席 ----------
  function simMonths() {
    const b = bucket('sim'), stp = bucket('stamp');
    render(head(L('季節の茶席シミュレーション')) + `
      ${say('happy', L('月をえらぶと、その季節の茶席の亭主になれるよ。道具を組んで点前の判断をしよう。ミス{a}つまでなら合格で月の印、{b}つで失格！', { a: MAX_MISS - 1, b: MAX_MISS }))}
      <div class="months">${MONTHS.slice(1).map((x) => `<button class="month ${x.ro ? 'ro' : 'fu'}" data-go="simPlay:${x.m}">${stp[x.m] || b[x.m] >= 80 ? `<span class="stamp">${I18N.cjk ? L('印') : '✓'}</span>` : ''}${ART.opt('hana', x.hana)}<b>${monthName(x.m, true)}</b><small>${L(x.name)}</small><span class="rf">${noGloss(L(x.ro ? '炉' : '風炉'))}</span></button>`).join('')}</div>
      <div class="note">${L('炉＝11月〜4月、風炉＝5月〜10月。季節によって道具も扱いも変わります。')}</div>`);
  }

  function otherPicks(field, m, n) {
    const others = shuffle(MONTHS.slice(1).filter((x) => Math.abs(x.m - m) >= 3 && Math.abs(x.m - m) <= 9).map((x) => x[field]));
    return others.slice(0, n);
  }

  // 問題の文・解説（q・part・e）はここで訳す。選択肢と正解（c・a）は日本語のまま答え合わせに使い、出すときに訳す
  function buildSim(m) {
    const mo = MONTHS[m], x = sc(), ro = mo.ro;
    const kamaKey = (save.school === 'ura' && mo.kamaUra) ? mo.kamaUra : mo.kama;
    const kamaNote = {
      normal: mo.kamaUra ? L('大炉は裏千家独自の点前。ほかの流派では通常の炉でよい。') : L('この月は特別なしつらえはしない。'),
      tsuri: L(mo.eventNote), sukigi: L(mo.eventNote), nakaoki: L('10月は風炉を点前畳の中央に寄せ、火を客に近づける「中置」。'), dairo: L(mo.eventNote),
    }[kamaKey];
    const TOOLS_PART = L('道具組み'), TEMAE_PART = L('点前');
    const Q = [];
    Q.push({ k: 'hearth', part: TOOLS_PART, q: L('釜をかけるのは？'), c: ['炉', '風炉'], a: ro ? '炉' : '風炉', e: L('11月〜4月は畳に切った「炉」、5月〜10月は畳の上に置く「風炉」。') });
    Q.push({ k: 'kama', part: TOOLS_PART, q: L('釜のしつらえは？'), c: Object.keys(KAMA).filter((k) => ro ? k !== 'nakaoki' : !['tsuri', 'sukigi', 'dairo'].includes(k)).map((k) => KAMA[k]), a: KAMA[kamaKey], e: kamaNote });
    Q.push({ k: 'ko', part: TOOLS_PART, q: L('焚く香は？'), c: ['練香', '香木（白檀など）'], a: ro ? '練香' : '香木（白檀など）', e: L('炉の季節は練香、風炉の季節は香木。') });
    Q.push({ k: 'kogo', part: TOOLS_PART, q: L('香合の素材は？'), c: ['陶磁器', '木地・塗物'], a: ro ? '陶磁器' : '木地・塗物', e: L('炉は陶磁器（練香は湿り気があるため）、風炉は木地・塗物。') });
    Q.push({ k: 'cup', part: TOOLS_PART, q: L('茶碗の形は？'), c: Object.values(CUP), a: CUP[mo.cup], e: L(CUP_NOTE[mo.cup]) });
    Q.push({ k: 'kashi', part: TOOLS_PART, q: L('主菓子は？'), c: shuffle([mo.kashi].concat(otherPicks('kashi', m, 2))), a: mo.kashi, e: L('{month}らしい菓子は「{kashi}」。', { month: monthName(m), kashi: L(mo.kashi) }) });
    Q.push({ k: 'hana', part: TOOLS_PART, q: L('床に生ける茶花は？'), c: shuffle([mo.hana].concat(otherPicks('hana', m, 2))), a: mo.hana, e: L('{month}の茶花には「{hana}」など。茶花は季節を先取りしすぎず、野にあるように。', { month: monthName(m), hana: L(mo.hana) }) });
    Q.push({ k: 'chasen', part: TOOLS_PART, q: L('茶筅は？'), c: Object.values(CHASEN), a: CHASEN[x.chasenKey], e: L('{name}では{chasen}の茶筅が一般的。（表千家＝煤竹、裏千家＝白竹）', { name: L(x.name), chasen: L(x.chasen) }) });

    // 柄杓の置き方は流派で順番が違う。風炉の運び点前で確かめたものだけを出す（炉の季節は出さない）
    if (!ro) Q.push(save.school === 'ura'
      ? { k: 'hishaku', part: TEMAE_PART, q: L('お茶を点てる湯を注いだあと、柄杓の置き方は？'), c: ['切り柄杓', '置き柄杓', '引き柄杓'], a: '切り柄杓', e: L('裏千家の風炉では、茶筅通しの湯のあとは置き柄杓、点てる湯のあとは切り柄杓、水を入れたあとは引き柄杓にする。') }
      : { k: 'hishaku', part: TEMAE_PART, q: L('お茶を点てる湯を注ぎ、残りを釜に戻したあと、柄杓の置き方は？'), c: ['切り柄杓', '置き柄杓', '引き柄杓'], a: '置き柄杓', e: L('表千家の風炉では、はじめに茶碗へ湯を入れたあとは切り柄杓、点てる湯の残りを釜に戻したあとは置き柄杓、水を入れたあとは引き柄杓にする。') });
    Q.push({ k: 'foam', part: TEMAE_PART, q: L('薄茶をどう点てる？'), c: Object.values(FOAM), a: FOAM[x.foam], e: L('{name}は「{foam}」。泡の加減は流派の違いがよく出るところ。', { name: L(x.name), foam: L(FOAM[x.foam]) }) });
    Q.push({ k: 'dashi', part: TEMAE_PART, q: L('濃茶の茶碗に添えて客が受ける帛紗は？'), c: Object.values(DASHI), a: DASHI[x.dashi], e: L('{name}では一般に{dashi}。表千家は出帛紗、裏千家は古帛紗。', { name: L(x.name), dashi: L(DASHI[x.dashi]) }) });
    const ev = EVENTS[m] && (EVENTS[m].q ? EVENTS[m] : (save.school === 'ura' ? EVENTS[m].ura : EVENTS[m].all));
    if (ev) Q.push(Object.assign({ k: 'event' }, ev, { part: L('季節の心得'), q: L(ev.q), e: L(ev.e) }));
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
      const labels = q.c.map((c) => L(c));
      const long = labels.some((c) => c.length > (I18N.cjk ? 12 : 24));
      const cls = long ? 'one' : pics.some(Boolean) ? `pic n${q.c.length}` : '';
      render(head(L('{month}（{name}）の茶席', { month: monthName(m), name: L(mo.name) })) + `
        <div class="status"><span>${q.part}</span><span>${idx + 1}/${Q.length}</span></div>
        <div class="progress"><i style="width:${idx / Q.length * 100}%"></i></div>
        ${idx === 0 ? `<div class="card"><b>${L(mo.event)}</b><div class="sub">${esc(L(mo.eventNote))}</div></div>` : ''}
        <p class="q">${esc(q.q)}</p>
        <div class="opts ${cls}">${q.c.map((c, i) => `<button class="btn ${ans[q.k] === c ? 'sel' : ''}" data-c="${esc(c)}">${pics[i]}<span>${esc(labels[i])}</span></button>`).join('')}</div>
        ${idx > 0 ? `<button class="btn ghost" id="prev">${L('‹ 前の問題にもどる')}</button>` : ''}`);
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
      render(head(L('{month}の茶席・結果', { month: monthName(m) })) + `
        <div class="hero-pic">${ART.room(m, { hearth: ans.hearth, kama: kamaKey, cupKey }, { school: save.school })}</div>
        ${pass ? `<div class="big">${score}<span class="unit">${L('点')}</span></div>` : FAIL}
        ${pass ? say(missN === 0 ? 'joy' : 'happy', L('{month}の印をいただきました！', { month: monthName(m) }) + SEP + (missN ? L('（ミス{n}つ）', { n: missN }) : L('（ミスなし）'))) : say('sad', L('ミスが{n}つ。{max}つ以上で失格です。解説を読んで、もう一度ちょうせんしよう！', { n: missN, max: MAX_MISS }))}
        <div class="card">${Q.map((q) => {
          const good = ans[q.k] === q.a;
          return `<div class="res"><span class="mk ${good ? 'o' : 'x'}">${good ? '○' : '×'}</span><div><b>${esc(q.q)}</b><br>${good ? esc(L(q.a)) : `${L('あなた：{v}', { v: esc(L(ans[q.k])) })}<br>${L('正解：{v}', { v: `<b>${esc(L(q.a))}</b>` })}`}<small>${esc(q.e)}</small></div></div>`;
        }).join('')}</div>
        <button class="btn primary" data-go="simPlay:${m}">${L('もう一度')}</button>
        <button class="btn" data-go="simMonths">${L('ほかの月へ')}</button>
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
        <div class="status"><span>${L('第{n}問', { n: idx + 1 })}${q.tag ? `　<span class="chip" style="background:${q.tagColor}">${q.tag}</span>` : ''}</span>${lives(miss)}</div>
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
        render(say(good ? 'joy' : 'oops', `<b>${good ? L('○ 正解！') : L('× ざんねん')}</b><br>${esc(q.e)}`) + `<button class="btn primary" id="nx">${out || last ? L('結果を見る') : L('次の問題')}</button>`, app.querySelector('#ex'));
        app.querySelector('#nx').onclick = () => { if (out) return result(true); idx++; idx < n ? draw() : result(false); };
        app.querySelector('#nx').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    function result(failed) {
      const b = bucket(cfg.key);
      if (!failed) b.best = Math.max(b.best || 0, ok);
      persist();
      const perfect = !failed && ok === n;
      render(head(L('{title}・結果', { title: cfg.title })) + (failed
        ? FAIL + say('sad', L('ミスが{n}回になりました（{ok}問正解）。もう一度ちょうせんしよう！', { n: MAX_MISS, ok }))
        : `<div class="big">${ok}<span class="unit"> / ${n}</span></div>` + say(perfect ? 'joy' : 'happy', L('称号：<b>{rank}</b>（最高 {best}/{n}）', { rank: cfg.rank(ok), best: b.best, n })))
        + (wrong.length ? `<h3>${L('まちがえた問題')}</h3><div class="card">${wrong.map((q) => `<div class="res">${q.rev ? `<span class="rpic">${q.rev}</span>` : '<span class="mk x">×</span>'}<div><b>${esc(q.q)}</b><br>${L('正解：{v}', { v: esc(q.c[q.a].t) })}<small>${esc(q.e)}</small></div></div>`).join('')}</div>` : '')
        + `<button class="btn primary" data-go="${cfg.screen}">${L('もう一度（問題が変わります）')}</button><button class="btn" data-go="home">${L('ホームへ')}</button>`);
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
        q: L(q.q), qpic: ART.quiz(q.q), tag: q.s === 'all' ? L('共通') : L(SCHOOLS[q.s].name), tagColor: q.s === 'all' ? '#8a7a5c' : SCHOOLS[q.s].color,
        c: order.map((i) => ({ t: L(q.c[i]) })), a: order.indexOf(q.a), e: L(q.e),
      };
    });
    playQuiz({ title: L('知識クイズ'), key: 'quiz', screen: 'quiz', list, rank: (ok) => (ok === 10 ? L('宗匠') : ok === 9 ? L('師範') : L('上級')) });
  }

  function dougu() {
    const groupOf = (id) => DOUGU_GROUPS.find((g) => g.includes(id)) || [id];
    const list = shuffle(TOOLS).slice(0, 10).map((t, k) => {
      const ng = groupOf(t.id);
      const opts = shuffle([t].concat(shuffle(TOOLS.filter((x) => !ng.includes(x.id))).slice(0, 3)));
      const a = opts.indexOf(t), rev = ART.icon(t.id, save.school);
      return k % 2
        ? { q: L('「{name}」はどれ？', { name: L(t.name) }), c: opts.map((x) => ({ t: L(x.name), pic: ART.icon(x.id, save.school) })), picOnly: true, a, e: L(t.desc), rev }
        : { q: L('この道具の名前は？'), qpic: rev, big: true, c: opts.map((x) => ({ t: L(x.name) })), a, e: L('「{name}」 {desc}', { name: L(t.name), desc: L(t.desc) }), rev };
    });
    playQuiz({ title: L('お道具の名前当て'), key: 'dougu', screen: 'dougu', list, rank: (ok) => (ok === 10 ? L('お道具名人') : ok === 9 ? L('目利き') : L('合格')) });
  }

  // ---------- ⑤ 茶室の歩き方（席入り） ----------
  const walkKey = (c) => `${c.room}|${c.season}|${c.role}`;
  function walkList() {
    const c = save.walkCfg, b = bucket('walk');
    const seg = (name, list) => `<div class="segrow">${list.map((x) => `<button class="seg ${c[name] === x.id ? 'on' : ''}" data-cfg="${name}:${x.id}">${x.label}</button>`).join('')}</div>`;
    const role = WALK_ROLES.find((r) => r.id === c.role) || WALK_ROLES[0];
    const room = ROOMS.find((r) => r.id === c.room) || ROOMS[1];
    const best = b[walkKey(c)];
    render(head(L('茶室の歩き方（席入り）')) + `
      ${say('happy', L('戸口から入って、床の間と点前座の釜を拝見してから、自分の席に着こう。客は正客・次客・お詰めの順に入るよ。'))}
      <div class="card"><b>${L('席入りの心得')}</b><ul class="pt">${WALK_RULES.map((r) => `<li>${esc(L(r))}</li>`).join('')}</ul></div>
      <h3>${L('茶室の広さ')}</h3>${seg('room', ROOMS.map((r) => ({ id: r.id, label: L(r.name) })))}
      <h3>${L('季節')}</h3>${seg('season', WALK_SEASONS.map((s) => ({ id: s.id, label: L('{name}（{months}）', { name: L(s.name), months: L(s.months) }) })))}
      <div class="board">${ART.walkBoard(room, { winter: c.season === 'ro', school: save.school, noMe: true })}</div>
      <p class="sub center">${L('{room}・本勝手（上＝床の間、左上＝点前畳、左下＝茶道口、右下＝{gate}）', { room: esc(L(room.name)), gate: L(room.small ? 'にじり口' : '入口') })}</p>
      <h3>${L('あなたの役')}</h3>${seg('role', WALK_ROLES.map((r) => ({ id: r.id, label: L(r.name) })))}
      <p class="sub">${L('{seat}に座ります。', { seat: esc(L(role.seat)) })}${role.id === 'tsume' ? SEP + L('最後に入って戸口を閉めるのも、お詰めの大切な役目です。') : ''}</p>
      <button class="btn primary" data-go="walkPlay:${walkKey(c)}">${L('はじめる')}　<span class="stars">${best ? stars(best) : ''}</span></button>
      <button class="btn" data-go="videoPlay:walk">${L('お手本の動画を見る')}</button>
      ${refs()}
      <div class="note">${L('※ 足の運び（右足から入る など）や拝見の細部は、流派・教室・茶室によって異なります。ここでは、各流派の公式サイトなどで確かめた一般的な心得をゲームにしています。')}</div>`);
    app.querySelectorAll('[data-cfg]').forEach((btn) => btn.onclick = () => {
      const [k, v] = btn.dataset.cfg.split(':');
      save.walkCfg = Object.assign({}, save.walkCfg, { [k]: v }); persist();
      const y = window.scrollY; walkList(); window.scrollTo(0, y);
    });
  }

  // マスの種類：畳の縁（違う畳との境目）・炉や風炉・ふつうの畳（畳の中央や、同じ畳のまん中）
  // 偶数のマスは半畳の中央、奇数のマスは半畳どうしの境目。四つの半畳が接する角は、かならず縁になる
  function cellKind(room, winter, gx, gy) {
    const mats = matsOf(room, winter), m = (ux, uy) => mats[uy][ux];
    const ux = gx >> 1, uy = gy >> 1, ox = gx & 1, oy = gy & 1;
    const heri = ox && oy ? true : ox ? m(ux, uy) !== m(ux + 1, uy) : oy ? m(ux, uy) !== m(ux, uy + 1) : false;
    if (heri) return 'heri';
    const fire = winter ? room.ro : room.furo;
    return fire[0] === gx && fire[1] === gy ? 'fire' : 'mat';
  }
  const has = (cells, p) => cells.some((c) => c[0] === p[0] && c[1] === p[1]);
  function placeToken(p, how) {
    const me = document.getElementById('wk-me');
    if (!me) return;
    const c = ART.walkCell(p[0], p[1]);
    me.style.transform = `translate(${c.x + c.w / 2}px, ${c.y + c.h / 2 + 16}px)`;
    if (how) { const bob = me.querySelector('.bob'); bob.classList.remove('step', 'hop'); void bob.getBoundingClientRect(); bob.classList.add(how); }
  }
  const seatedNpc = (room, roles) => roles.map((r) => ART.walkNpc(room.seats[r.id][0], room.seats[r.id][1], r.color, r.male)).join('');

  function walkPlay(arg) {
    const [rid, sid, roleId] = String(arg || '').split('|');
    const room = ROOMS.find((r) => r.id === rid) || ROOMS[1];
    const winter = sid === 'ro';
    const role = WALK_ROLES.find((r) => r.id === roleId) || WALK_ROLES[0];
    const ri = WALK_ROLES.indexOf(role);
    const key = `${room.id}|${winter ? 'ro' : 'furo'}|${role.id}`;
    const gate = L(room.small ? 'にじり口' : '入口');
    const mats = matsOf(room, winter);
    const gw = mats[0].length * 2 - 1, gh = mats.length * 2 - 1;
    const goals = (role.id === 'tsume' ? ['door'] : []).concat(['toko', 'kama', 'seat']);
    const cells = { door: [room.start], toko: tokoCells(room), kama: room.kama[winter ? 'ro' : 'furo'], seat: [room.seats[role.id]] };
    const seated = WALK_ROLES.slice(0, ri);     // 先に入って、もう席に着いている客
    const blocked = seated.map((r) => room.seats[r.id]);
    // データの文を訳し、{gate}（戸口）・{seat}（席）・{role}（役）を埋める
    const fill = (s) => L(s, { gate, seat: L(role.seat), role: L(role.name) });
    const title = L('茶室の歩き方・{room}', { room: L(room.name) });
    let pos = room.start.slice(), gi = 0, miss = 0, steps = 0, strided = false, asking = false;
    render(head(title) + `
      <div class="status"><span id="wk-obj"></span>${lives(0)}</div>
      <p class="sub center">${L('{season}・あなたは<b>{role}</b>', { season: L(WALK_SEASONS.find((s) => s.id === (winter ? 'ro' : 'furo')).name), role: L(role.name) })}</p>
      <div class="board" id="wk-board">${ART.walkBoard(room, { winter, school: save.school, color: role.color })}</div>
      <div id="wk-talk"></div>
      <div id="wk-ask"></div>
      <button class="btn primary" id="wk-act" hidden></button>
      <p class="sub center" id="wk-steps"></p>`);
    const board = app.querySelector('#wk-board');
    const talk = (expr, html) => render(say(expr, html), app.querySelector('#wk-talk'));
    document.getElementById('wk-npc').innerHTML = seatedNpc(room, seated);
    talk('happy', ri === 0
      ? L('{gate}から入りました。あなたは正客、いちばん先に入る客です。足あとをタップして進もう！', { gate })
      : L('{names}は、もう席に着いているよ。あなたは{role}。', { names: names2(seated, '{a}と{b}'), role: L(role.name) }) + SEP + (role.id === 'tsume' ? L('まずは入ってきた戸を閉めよう。') : L('足あとをタップして進もう！')));
    const isBlocked = (x, y) => has(blocked, [x, y]);
    const inside = (x, y) => x >= 0 && y >= 0 && x < gw && y < gh;
    function options() {
      const out = [];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const x1 = pos[0] + dx, y1 = pos[1] + dy;
        if (!inside(x1, y1) || isBlocked(x1, y1)) return;
        const k1 = cellKind(room, winter, x1, y1);
        out.push({ x: x1, y: y1, kind: k1, stride: false });
        const x2 = pos[0] + dx * 2, y2 = pos[1] + dy * 2;
        if (k1 === 'heri' && inside(x2, y2) && !isBlocked(x2, y2) && cellKind(room, winter, x2, y2) !== 'heri') out.push({ x: x2, y: y2, kind: cellKind(room, winter, x2, y2), stride: true });
      });
      return out;
    }
    function update() {
      placeToken(pos);
      const g = goals[gi];
      document.getElementById('wk-fp').innerHTML = asking ? '' : options().map((o) => `<g class="fp" data-x="${o.x}" data-y="${o.y}" data-kind="${o.kind}" data-stride="${o.stride ? 1 : ''}">${ART.walkFoot(ART.walkCell(o.x, o.y))}</g>`).join('');
      document.getElementById('wk-goal').innerHTML = g ? cells[g].map((c) => ART.walkGoal(ART.walkCell(c[0], c[1]))).join('') : '';
      render(g ? L('目標 {i}/{n}：{target}', { i: gi + 1, n: goals.length, target: fill(WALK_GOALS[g].target) }) : '', app.querySelector('#wk-obj'));
      render(L('歩数 {n}', { n: steps }), app.querySelector('#wk-steps'));
      const act = app.querySelector('#wk-act');
      const here = g && !asking && has(cells[g], pos);
      act.hidden = !here;
      if (here) render(L(WALK_GOALS[g].label), act);
    }
    function missed(msg) {
      miss++;
      app.querySelector('.lives').outerHTML = lives(miss);
      shake(board);
      if (miss >= MAX_MISS) { fail(msg); return true; }
      talk('oops', esc(msg));
      return false;
    }
    board.addEventListener('click', (e) => {
      const f = e.target.closest('.fp');
      if (!f || asking) return;
      const kind = f.dataset.kind, stride = !!f.dataset.stride;
      if (kind !== 'mat') { missed(fill(WALK_MISS[kind])); return; }
      pos = [+f.dataset.x, +f.dataset.y]; steps++;
      placeToken(pos, stride ? 'hop' : 'step');
      const g = goals[gi];
      if (stride && !strided) { strided = true; talk('joy', L('縁を踏まずに越えました！ その調子。')); }
      else if (g && has(cells[g], pos)) talk('happy', L('ここで「{label}」ボタンを押そう。', { label: L(WALK_GOALS[g].label) }));
      else if (goals.some((x, i) => i > gi && has(cells[x], pos))) talk('think', L('先に「{label}」をしよう。', { label: L(WALK_GOALS[g].label) }));
      update();
    });
    // 目標の場所でボタンを押すと、そこでの作法を問う（正しく答えると次の目標へ）
    app.querySelector('#wk-act').onclick = () => {
      const g = goals[gi], def = WALK_GOALS[g];
      if (g === 'seat') return clear();
      const q = def.ask[save.school] || def.ask.all;
      asking = true; update();
      render(`<p class="q">${esc(fill(q.q))}</p><div class="opts one">${q.c.map((c, i) => `<button class="btn" data-a="${i}"><span>${esc(fill(c))}</span></button>`).join('')}</div>`, app.querySelector('#wk-ask'));
      app.querySelectorAll('#wk-ask [data-a]').forEach((b) => b.onclick = () => {
        if (+b.dataset.a !== q.a) { b.classList.add('wrong'); b.onclick = null; missed(fill(q.e)); return; }
        asking = false;
        app.querySelector('#wk-ask').innerHTML = '';
        render(`<div class="viewpic">${ART.viewPic(def.pic)}</div>` + say('joy', esc(fill(q.e))), app.querySelector('#wk-talk'));
        gi++; update();
      });
    };
    function clear() {
      const n = starsByMiss(miss);
      const b = bucket('walk'); b[key] = Math.max(b[key] || 0, n); persist();
      const after = WALK_ROLES.slice(ri + 1);
      const next = role.id === 'tsume'
        ? L('お詰めが戸を閉めて知らせたので、亭主が入ってきました。')
        : L('続いて{names}も拝見して席に着き、お詰めが戸口を閉めて知らせると、亭主が入ってきます。', { names: names2(after, '{a}・{b}') });
      render(head(title) + `
        <div class="board">${ART.walkBoard(room, { winter, school: save.school, color: role.color })}</div>
        <div class="big stars">${stars(n)}</div>
        ${say(miss === 0 ? 'joy' : 'happy', `${esc(fill(WALK_GOALS.seat.done))}${SEP}${L('（歩数 {s}・ミス{m}回）', { s: steps, m: miss })}<br>${esc(next)}`)}
        <div class="card"><b>${L('{room}の席', { room: esc(L(room.name)) })}</b><p>${esc(L(room.note))}</p><p class="sub">${L('※ 席の決まりは、流派・先生・茶室の造りや客の人数で変わることがあります。')}</p></div>
        <div class="card"><b>${L('席入りの心得')}</b><ul class="pt">${WALK_RULES.map((r) => `<li>${esc(L(r))}</li>`).join('')}</ul></div>
        <button class="btn primary" data-go="walkPlay:${key}">${L('もう一度')}</button>
        <button class="btn" data-go="walkList">${L('広さ・季節・役をえらぶ')}</button>`);
      // 全員が席に着き、亭主が入ってきたところ
      document.getElementById('wk-me').style.display = 'none';
      document.getElementById('wk-npc').innerHTML = seatedNpc(room, WALK_ROLES.filter((r) => r !== role))
        + ART.walkNpc(room.seats[role.id][0], room.seats[role.id][1], role.color, save.gender === 'm') + ART.walkHost(room, save.school);
      if (miss === 0) confetti();
    }
    function fail(reason) {
      render(head(title) + FAIL + say('sad', `${esc(reason)}<br>${L('ミスが{n}回になりました。', { n: MAX_MISS })}`) + `
        <div class="card"><b>${L('{room}の席', { room: esc(L(room.name)) })}</b><p>${esc(L(room.note))}</p></div>
        <div class="card"><b>${L('席入りの心得')}</b><ul class="pt">${WALK_RULES.map((r) => `<li>${esc(L(r))}</li>`).join('')}</ul></div>
        <button class="btn primary" data-go="walkPlay:${key}">${L('もう一度')}</button>
        <button class="btn" data-go="videoPlay:walk">${L('お手本の動画を見る')}</button>
        <button class="btn" data-go="walkList">${L('広さ・季節・役をえらぶ')}</button>`);
    }
    update();
  }

  // ---------- ⑥ 作法の動画 ----------
  // 絵が動き、字幕（フリガナつき）と読み上げで説明する。読み上げは端末の声（なければ字幕だけ）。
  // 声は、端末にある「いまの言語」の声の中から自然な女性の声を選び、少し高く、明るい話し方にする。
  const synth = window.speechSynthesis;
  const canSpeak = !!(synth && window.SpeechSynthesisUtterance);
  // 言語の声だけを出す（zh-TW なら台湾・香港の声、zh-CN なら大陸の声を先に）
  const langVoices = () => {
    if (!canSpeak) return [];
    const want = I18N.tts.toLowerCase().replace('_', '-'), base = want.split('-')[0];
    const all = synth.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').split('-')[0] === base);
    if (base !== 'zh') return all;
    const near = want === 'zh-tw' ? /zh-(tw|hk|hant)/ : /zh-(cn|sg|hans)/;
    const same = all.filter((v) => near.test(v.lang.toLowerCase().replace('_', '-')));
    return same.length ? same : all;
  };
  const MALE_VOICE = /Ichiro|Keita|Otoya|Hattori|Daichi|Naoki|Kenji|David|Mark|Guy|Ryan|Christopher|Eric|Roger|Steffan|Brian|Andrew|Alex\b|Fred|Daniel|Thomas|Kangkang|Yunxi|Yunyang|Yunjian|Yunhao|Yunfeng|Zhiwei|Yunjhe|InJoon|Hyunsu|Bongjin|Gookmin|male/i;
  function pickVoice() {
    const vs = langVoices();
    if (save.voiceName) { const v = vs.find((x) => x.name === save.voiceName); if (v) return v; }
    const rank = I18N.ja
      ? [/Nanami.*(Natural|Online)/i, /(Natural|Neural|Online)/i, /Google/i, /Kyoko.*(Enhanced|Premium)|O-ren/i, /Kyoko/i, /Sayaka|Haruka|Ayumi|Nanami|Mizuki/i]
      : [/(Natural|Neural|Online)/i, /Google/i, /(Enhanced|Premium)/i];
    for (const r of rank) { const v = vs.find((x) => r.test(x.name) && !MALE_VOICE.test(x.name)); if (v) return v; }
    return vs.find((x) => !MALE_VOICE.test(x.name)) || vs[0] || null;
  }
  // 声の調子。しぜん＝少しだけ明るく、かわいい＝高め、ふつう＝そのまま
  const VOICE_STYLES = { natural: { label: 'しぜん', pitch: 1.08, rate: 1 }, cute: { label: 'かわいい', pitch: 1.22, rate: 1.03 }, plain: { label: 'ふつう', pitch: 1, rate: 0.96 } };
  const voiceLabel = (n) => n.replace(/^Microsoft\s*/, '').replace(/\s*-\s*[A-Z][a-z]+( \([^)]*\))?\s*$/, '').replace(/\s*\((Japan|United States|Taiwan|China|Korea)\)/, '');
  const ICON = {
    prev: '<svg viewBox="0 0 24 24"><path d="M6 5 V19 M19 5 L9 12 L19 19 Z" fill="currentColor" stroke="currentColor" stroke-width="2"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M18 5 V19 M5 5 L15 12 L5 19 Z" fill="currentColor" stroke="currentColor" stroke-width="2"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4 L20 12 L7 20 Z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>',
    voiceOn: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M5 20 Q12 12 19 20" fill="currentColor"/><path d="M19 4 Q22 8 19 12" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    voiceOff: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M5 20 Q12 12 19 20" fill="currentColor"/><path d="M17 4 L22 9 M22 4 L17 9" stroke="currentColor" stroke-width="2"/></svg>',
  };
  function videoList() {
    render(head(L('作法の動画')) + `
      ${say('happy', I18N.ja ? '絵が動いて、わたしが声で作法を説明するよ。字幕にもフリガナが付くから、いっしょに読んでみてね。' : L('絵が動いて、わたしが声で作法を説明するよ。字幕といっしょに見てね。'))}
      ${SEQUENCES.map((q) => `<button class="btn seqbtn" data-go="videoPlay:${q.id}">${ART.step(stepsOf(q)[0].p, save.school)}<span><span class="t">${esc(L(q.title))}</span><span class="d">${L('{role}の作法・{n}場面', { role: L(q.role), n: stepsOf(q).length })}</span></span></button>`).join('')}
      <button class="btn seqbtn" data-go="videoPlay:walk">${ART.menu('walk', save.school)}<span><span class="t">${L('茶室の歩き方（席入り）')}</span><span class="d">${L('戸口から入り、床の間と釜を拝見して席に着くまで')}</span></span></button>
      ${canSpeak ? '' : `<div class="note">${L('この端末では読み上げが使えないため、字幕だけで再生します。')}</div>`}`);
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
          <button id="vd-prev" aria-label="${esc(L('前へ'))}">${ICON.prev}</button>
          <button id="vd-play" class="big" aria-label="${esc(L('再生'))}">${ICON.pause}</button>
          <button id="vd-next" aria-label="${esc(L('次へ'))}">${ICON.next}</button>
          <button id="vd-voice" class="${save.voice && canSpeak ? '' : 'off'}" aria-label="${esc(L('読み上げ'))}">${save.voice && canSpeak ? ICON.voiceOn : ICON.voiceOff}</button>
        </div>
        ${canSpeak ? `<div class="vset"><span>${L('声')}</span>${Object.entries(VOICE_STYLES).map(([k, s]) => `<button class="vs ${(VOICE_STYLES[save.voiceStyle] ? save.voiceStyle : 'natural') === k ? 'on' : ''}" data-vs="${k}">${L(s.label)}</button>`).join('')}<select id="vd-vsel" aria-label="${esc(L('声の種類'))}"></select></div>` : ''}
      </div>
      <p class="sub center" id="vd-novoice" hidden>${L('この端末には、この言語の読み上げの声がありません。字幕だけで再生します。')}</p>
      <div id="vd-end"></div>`);
    const $ = (s) => app.querySelector(s);
    const stopAll = () => { clearTimeout(timer); timer = null; token++; if (canSpeak) synth.cancel(); };
    function fillVoices() {
      const sel = $('#vd-vsel');
      if (!sel) return;
      const vs = langVoices();
      sel.innerHTML = `<option value="">${L('おまかせ')}</option>` + vs.map((v) => `<option value="${esc(v.name)}"${v.name === save.voiceName ? ' selected' : ''}>${esc(voiceLabel(v.name))}</option>`).join('');
      // この言語の声が端末にないときは、声の設定をしまって「字幕だけ」と知らせる
      const none = !I18N.ja && !vs.length && synth.getVoices().length > 0;
      app.querySelector('.vset').hidden = none;
      $('#vd-novoice').hidden = !none;
    }
    // 日本語は漢字はそのまま（茶道のことばだけ読みがなに）にして、一文ずつ区切って読む。声の高さは控えめに
    function speak(text, done) {
      if (!canSpeak || !save.voice) return false;
      synth.cancel();
      const style = VOICE_STYLES[save.voiceStyle] || VOICE_STYLES.natural;
      const v = pickVoice();
      if (!v && !I18N.ja && synth.getVoices().length) return false;   // この言語の声が端末にないときは字幕だけ
      const parts = (I18N.ja ? RUBY.speech(text) : text).replace(/([。！？!?]|\.(?=\s))/g, '$1\n').split('\n').map((x) => x.trim()).filter(Boolean);
      const my = token;
      let fired = false, left = parts.length;
      const fin = () => { if (fired || my !== token) return; fired = true; done(); };
      parts.forEach((p) => {
        const u = new SpeechSynthesisUtterance(p);
        u.lang = I18N.tts; u.pitch = style.pitch; u.rate = style.rate;
        if (v) u.voice = v;
        u.onend = () => { if (--left <= 0) fin(); };
        u.onerror = fin;
        synth.speak(u);
      });
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
      timer = setTimeout(() => { if (my === token && playing) show(i + 1); }, s.dur || Math.max(3500, (s.say || '').length * (I18N.cjk ? 120 : 60)));
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
      if (!canSpeak) return toast('think', L('この端末では読み上げが使えません'));
      save.voice = !save.voice; persist();
      $('#vd-voice').innerHTML = save.voice ? ICON.voiceOn : ICON.voiceOff;
      $('#vd-voice').classList.toggle('off', !save.voice);
      if (playing) show(i);
    };
    app.querySelectorAll('[data-vs]').forEach((b) => b.onclick = () => {
      save.voiceStyle = b.dataset.vs; persist();
      app.querySelectorAll('[data-vs]').forEach((x) => x.classList.toggle('on', x === b));
      show(i);
    });
    if ($('#vd-vsel')) {
      fillVoices();
      if (canSpeak) synth.onvoiceschanged = fillVoices;
      $('#vd-vsel').onchange = (e) => { save.voiceName = e.target.value; persist(); show(i); };
    }
    BGM.duck(true);
    leaveHook = () => { stopAll(); BGM.duck(false); if (canSpeak) synth.onvoiceschanged = null; };
    pauseHook = () => { playing = false; stopAll(); setPlayIcon(); };
    show(0);
  }

  function videoPlay(id) {
    if (id === 'walk') return walkVideo();
    const q = SEQUENCES.find((x) => x.id === id);
    const title = L('{title}（{role}の作法）', { title: L(q.title), role: L(q.role) });
    const scenes = [{ html: `<div class="vtitle">${ART.mascot('joy')}</div>`, cap: L(q.title), sub: L('{role}の作法・{school}', { role: L(q.role), school: L(sc().name) }), say: L('これから、{title}を、いっしょに見ていこうね！', { title: L(q.title) }) }]
      .concat(stepsOf(q).map((st, k) => {
        const g = st.gkey ? gtext(st.gkey) : '';
        return { html: `<span class="vnum">${k + 1}</span>${ART.step(st.p, save.school, true)}`, cap: stepText(st), sub: L(st.note) + (g ? SEP + L('（{g}）', { g }) : ''), say: sayOf(st) };
      }))
      .concat([{ html: `<div class="vtitle">${ART.mascot('happy')}</div>`, cap: L('おしまい'), sub: L('順序ゲームで、覚えたか試してみよう！'), say: L('おつかれさま！ 順序ゲームで、覚えたか、ためしてみよう！') }]);
    player(title, scenes, `<button class="btn primary" data-go="seqPlay:${id}">${L('順序ゲームで練習する')}</button><button class="btn" data-go="videoPlay:${id}">${L('もう一度見る')}</button><button class="btn" data-go="videoList">${L('ほかの動画へ')}</button>`);
    app.querySelector('#vd-screen').classList.add('anim');
  }

  function walkVideo() {
    const room = ROOMS.find((r) => r.id === '4.5');
    const role = WALK_ROLES[0];
    // 台本を「話す場面」ごとにまとめ、その後の移動を場面の中で歩いて見せる
    const scenes = [];
    WALK_DEMO.forEach((d) => {
      if (d.say) scenes.push({ cap: L(d.say), say: L(d.say), pic: d.pic, moves: [] });
      else scenes[scenes.length - 1].moves.push(d.to);
    });
    const posAt = [];   // 各場面のはじめの位置
    let p = room.start;
    scenes.forEach((s) => { posAt.push(p); if (s.moves.length) p = s.moves[s.moves.length - 1]; });
    let walkTimer = null;
    const list = [{ html: `<div class="vtitle">${ART.mascot('joy')}</div>`, cap: L('茶室の歩き方（席入り）'), sub: L('四畳半・風炉の季節・正客'), say: L('これから、茶室に入ってから席に着くまでの、畳の歩き方を見ていこうね！') }]
      .concat(scenes.map((s, k) => ({
        cap: s.cap, say: s.say, dur: 3200 + s.moves.length * 600,
        onShow: () => {
          clearInterval(walkTimer);
          const scr = app.querySelector('#vd-screen');
          if (!scr.querySelector('#wk-me')) scr.innerHTML = ART.walkBoard(room, { winter: false, school: save.school, color: role.color }) + '<div class="vpic" id="vd-pic"></div>';
          document.getElementById('wk-npc').innerHTML = '';
          document.getElementById('wk-me').style.display = '';
          placeToken(posAt[k]);
          app.querySelector('#vd-pic').innerHTML = s.pic ? ART.viewPic(s.pic) : '';
          if (k === scenes.length - 1) {   // 最後：次客・お詰めも席に着き、亭主が入ってくる
            setTimeout(() => {
              const n = document.getElementById('wk-npc');
              if (n) n.innerHTML = seatedNpc(room, WALK_ROLES.slice(1)) + ART.walkHost(room, save.school);
            }, 1200 + s.moves.length * 600);
          }
          let j = 0;
          walkTimer = setInterval(() => {
            if (j >= s.moves.length) return clearInterval(walkTimer);
            const prev = j ? s.moves[j - 1] : posAt[k], nx = s.moves[j++];
            placeToken(nx, Math.abs(nx[0] - prev[0]) + Math.abs(nx[1] - prev[1]) > 1 ? 'hop' : 'step');
          }, 600);
        },
      })))
      .concat([{ html: `<div class="vtitle">${ART.mascot('happy')}</div>`, cap: L('おしまい'), sub: L('歩き方ステージでためしてみよう！'), say: L('おつかれさま！ 歩き方ステージで、ためしてみてね。'), onShow: () => clearInterval(walkTimer) }]);
    player(L('作法の動画・茶室の歩き方'), list, `<button class="btn primary" data-go="walkList">${L('歩き方ステージで練習する')}</button><button class="btn" data-go="videoPlay:walk">${L('もう一度見る')}</button><button class="btn" data-go="videoList">${L('ほかの動画へ')}</button>`);
    const prevLeave = leaveHook;
    leaveHook = () => { clearInterval(walkTimer); prevLeave(); };
  }

  // ---------- 道具図鑑 ----------
  function zukan(id) {
    if (id) {
      const t = TOOLS.find((x) => x.id === id);
      // よみ：日本語はひらがな。ほかの言語は「日本語の名前（ローマ字の読み）」を出す（訳の表で よみ → ローマ字）
      render(head(L(t.name)) + `
        <div class="card detail">${ART.icon(t.id, save.school)}
          <p class="sub center">${L('よみ：{yomi}', { yomi: L(t.yomi), ja: t.name })}</p>
          <p>${esc(L(t.desc))}</p>
          ${t.season ? `<h3>${L('季節による違い')}</h3><p>${esc(L(t.season))}</p>` : ''}
          ${t.diff ? `<h3>${L('流派による違い')}</h3><div class="tbl"><table>${Object.values(SCHOOLS).map((x) => `<tr><th style="${x.id === save.school ? `color:${x.color};font-weight:bold` : ''}">${L(x.name)}</th><td>${esc(L(t.diff[x.id]))}</td></tr>`).join('')}</table></div>` : `<p class="sub">${L('表千家・裏千家でおおむね共通です。')}</p>`}
        </div>${DISCLAIMER}`);
      return;
    }
    render(head(L('道具図鑑')) + `
      <p class="sub">${L('道具をタップすると、季節や流派による違いが見られます。')}</p>
      <div class="tools">${TOOLS.map((t) => `<button class="tool" data-go="zukan:${t.id}">${ART.icon(t.id, save.school)}<span>${L(t.name)}</span></button>`).join('')}</div>
      <button class="btn" data-go="dougu">${L('④ お道具の名前当てで腕だめし')}</button>`);
  }

  // ---------- 表千家・裏千家くらべ ----------
  function compare() {
    // スマホの幅に収まるよう、絵でくらべる列（流派の数だけ）と、流派ごとのカードに分ける
    const S = Object.values(SCHOOLS);
    const cols = (f, cls) => `<div class="cmp3" style="grid-template-columns:repeat(${S.length},1fr)">${S.map((x) => `<div class="cmpc ${cls || ''}" style="--c:${x.color}">${f(x)}</div>`).join('')}</div>`;
    render(head(L('表千家・裏千家くらべ')) + `
      <h3>${L('絵でくらべる')}</h3>
      ${cols((x) => esc(L(x.name)), 'head')}
      <p class="cmpl">${L('茶筅の竹')}</p>${cols((x) => `${ART.chasen(x.chasenKey)}${esc(L(x.chasen))}`)}
      <p class="cmpl">${L('薄茶の泡')}</p>${cols((x) => `${ART.foam(x.foam)}${esc(L(FOAM_SHORT[x.foam]))}`)}
      <p class="cmpl">${L('濃茶の帛紗')}</p>${cols((x) => `${ART.dashi(x.dashi)}${esc(L(DASHI[x.dashi]))}`)}
      <h3>${L('流派ごとに見る')}</h3>
      ${S.map((x) => `<div class="card scard" style="--c:${x.color}"><b class="sname">${L(x.name)}</b><dl class="dl">
        <dt>${L('庵号')}</dt><dd>${esc(L(x.an))}</dd><dt>${L('家元')}</dt><dd>${L('代々 {name}', { name: esc(L(x.iemoto)) })}</dd><dt>${L('祖')}</dt><dd>${esc(L(x.founder))}</dd>
        <dt>${L('門下')}</dt><dd>${esc(L(x.group))}</dd><dt>${L('名の由来')}</dt><dd>${esc(L(x.origin))}</dd></dl></div>`).join('')}
      <h3>${L('共通していること')}</h3>
      <div class="card"><ul class="pt">
        <li>${L('どちらも千利休の孫・千宗旦の息子がおこした')}</li>
        <li>${L('炉は11月〜4月、風炉は5月〜10月')}</li>
        <li>${L('客は茶碗を回して正面を避けて飲む')}</li>
        <li>${L('帛紗は左腰。一般に男性は紫、女性は朱')}</li>
        <li>${L('濃茶には主菓子、薄茶には干菓子')}</li>
      </ul></div>
      ${refs()}
      ${DISCLAIMER}`);
  }

  const SCREENS = { home, install, course, seqList, seqPlay, simMonths, simPlay, quiz, dougu, walkList, walkPlay, videoList, videoPlay, zukan, compare };
  document.title = L('茶の湯みち');
  // アイコン長押しのショートカット（index.html#seqList など）から開いたときは、その画面へ
  const startHash = decodeURIComponent(location.hash.slice(1));
  if (startHash) history.replaceState(null, '', location.pathname + location.search);
  go('home');
  if (startHash && save.school) { const [n, a] = startHash.split(':'); if (SCREENS[n] && n !== 'home') go(n, a); }
})();
