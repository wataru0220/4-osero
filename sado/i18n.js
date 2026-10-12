// ===== 茶の湯みち：多言語 =====
// 文はすべて日本語のまま持ち、画面に出すときに訳す（L('日本語の文') → いまの言語の文）。
// 訳は言語ごとのファイル i18n/<code>.js に「日本語の文 → 訳」の表として置く（I18N_DATA[code]）。
// 訳がない文は日本語のまま出す。{name} のような差し込みは L(文, { name: 値 }) で埋める。
// 言語を切りかえたら読み込み直す（その言語の表だけを、app.js より先に読み込むため）。
// ふりがなは日本語のときだけ。読み上げはその言語の声を使う。

// 言語の一覧（メニューの順）。name はその言語での名前、tts は読み上げの言語
const LANGS = [
  { code: 'ja', name: '日本語', tts: 'ja-JP' },
  { code: 'en', name: 'English', tts: 'en-US' },
  { code: 'zh-Hans', name: '简体中文', tts: 'zh-CN' },
  { code: 'zh-Hant', name: '繁體中文', tts: 'zh-TW' },
  { code: 'ko', name: '한국어', tts: 'ko-KR' },
  { code: 'fr', name: 'Français', tts: 'fr-FR' },
  { code: 'es', name: 'Español', tts: 'es-ES' },
  { code: 'de', name: 'Deutsch', tts: 'de-DE' },
  { code: 'it', name: 'Italiano', tts: 'it-IT' },
  { code: 'pt', name: 'Português', tts: 'pt-BR' },
  { code: 'th', name: 'ไทย', tts: 'th-TH' },
  { code: 'vi', name: 'Tiếng Việt', tts: 'vi-VN' },
  { code: 'id', name: 'Bahasa Indonesia', tts: 'id-ID' },
  { code: 'fil', name: 'Filipino', tts: 'fil-PH' },
];

const I18N = (function () {
  const KEY = 'sado.lang';
  let code = 'ja';
  const known = (c) => LANGS.some((l) => l.code === c);
  // はじめて開いたときは、端末の言語に合わせる（一覧にない言語なら英語）
  function detect() {
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'ja']).map((x) => String(x).toLowerCase());
    for (const l of list) {
      if (/^zh-(tw|hk|mo|hant)/.test(l)) return 'zh-Hant';
      if (l.startsWith('zh')) return 'zh-Hans';
      const base = l.split('-')[0];
      if (base === 'tl') return 'fil';   // タガログ語の端末はフィリピン語で
      if (base === 'in') return 'id';    // 古いインドネシア語のコード
      if (known(base)) return base;
    }
    return 'en';
  }
  // index.html から app.js より前に呼ぶ。日本語以外なら、その言語の表をここで読み込む
  function boot() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (_) {}
    code = known(saved) ? saved : detect();
    document.documentElement.lang = code;
    document.documentElement.dataset.script = /^(ja|zh|ko)/.test(code) ? 'cjk' : 'alpha';
    if (code !== 'ja') document.write(`<script src="i18n/${code}.js"><\/script>`);
  }
  const dict = () => (code !== 'ja' && window.I18N_DATA && window.I18N_DATA[code]) || null;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const JA = /[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]/;   // かな・漢字・全角の記号
  const missing = new Set();   // 訳が見つからなかった文（確認用。ブラウザで I18N.missing を見る）
  // 訳す。vars があれば {name} を埋める（訳にも同じ {name} が入っている）
  function L(s, vars) {
    if (s === undefined || s === null || s === '') return s;
    const d = dict();
    let out = s;
    if (d && has(d, s)) out = d[s];
    else if (code !== 'ja' && JA.test(s)) missing.add(s);
    if (vars) out = String(out).replace(/\{(\w+)\}/g, (m, k) => (has(vars, k) ? vars[k] : m));
    return out;
  }
  function setLang(c) {
    if (!known(c)) return;
    try { localStorage.setItem(KEY, c); } catch (_) {}
    location.reload();
  }
  return {
    boot, L, setLang,
    get code() { return code; },
    get ja() { return code === 'ja'; },
    // 漢字・ハングルの言語（1文字の幅が広い）。選択肢を1列にするかの目安を変える
    get cjk() { return /^(ja|zh|ko)/.test(code); },
    get tts() { return (LANGS.find((l) => l.code === code) || LANGS[0]).tts; },
    get missing() { return [...missing]; },
  };
})();
