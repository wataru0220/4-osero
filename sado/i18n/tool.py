# 茶の湯みち：訳の点検・追加の道具（開発用。ゲームからは使わない）
#
#   python sado/i18n/tool.py status              各言語の訳の数・足りない数・問題の数
#   python sado/i18n/tool.py missing en [file]   英語の訳が足りない文を一覧（file を付けると JSON で書き出す）
#   python sado/i18n/tool.py merge en new.json   {"日本語の文": "訳"} の JSON を en.js に足す（差し込み {…}・タグを点検）
#
# 訳す文 = app.js の '日本語'（L() で訳して出す）＋ data.js の日本語の文字列すべて ＋ art.js の I18N.L('…')。
# ふりがなの設定（日本語のときだけ出す）は除く。
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SADO = os.path.dirname(HERE)
JA = re.compile('[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]')   # かな・漢字・全角の記号（「（{g}）」のような記号だけの文も訳す）
KANA = re.compile('[぀-ヿ]')
HAN = re.compile('[一-鿿]')
PH = re.compile(r'\{(\w+)\}')
TAG = re.compile(r'</?[a-zA-Z][^>]*>')
BS = chr(92)
JA_ONLY = {'ぜんぶ', '茶道のことばだけ', 'なし', 'ふりがな',
           '絵が動いて、わたしが声で作法を説明するよ。字幕にもフリガナが付くから、いっしょに読んでみてね。'}
CODES = [f[:-3] for f in sorted(os.listdir(HERE)) if f.endswith('.js')]


def lex(src):
    """JS のソースから文字列リテラルを取り出す：[(kind, text, line, before)]  kind 's'=引用符 / 't'=テンプレートの地の文"""
    out = []

    def quoted(k):
        q = src[k]; m = k + 1; buf = ''
        while src[m] != q:
            if src[m] == BS:
                buf += src[m:m + 2]; m += 2; continue
            buf += src[m]; m += 1
        out.append(('s', buf, src.count('\n', 0, k) + 1, src[max(0, k - 12):k]))
        return m

    def template(j):
        seg = ''
        while True:
            c = src[j]
            if c == BS:
                seg += src[j:j + 2]; j += 2; continue
            if c == '`':
                out.append(('t', seg, src.count('\n', 0, j) + 1, '')); return j
            if src.startswith('${', j):
                out.append(('t', seg, src.count('\n', 0, j) + 1, '')); seg = ''
                j = expr(j + 2); continue
            seg += c; j += 1

    def expr(k):
        d = 1
        while True:
            c = src[k]
            if c == '{': d += 1
            elif c == '}':
                d -= 1
                if d == 0: return k + 1
            elif c == '`': k = template(k + 1)
            elif c in '\'"': k = quoted(k)
            k += 1

    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if src.startswith('//', i):
            j = src.find('\n', i); i = j if j >= 0 else n; continue
        if src.startswith('/*', i):
            i = src.find('*/', i) + 2; continue
        if c in '\'"':
            i = quoted(i) + 1; continue
        if c == '`':
            i = template(i + 1) + 1; continue
        if c == '/' and (src[:i].rstrip()[-1:] or '=') in '=(,:;!&|?{}[':
            j = i + 1; cls = False   # 正規表現リテラルを読み飛ばす
            while src[j] != '\n':
                ch = src[j]
                if ch == BS: j += 2; continue
                if ch == '[': cls = True
                elif ch == ']': cls = False
                elif ch == '/' and not cls: break
                j += 1
            i = j + 1; continue
        i += 1
    return out


def unescape(s):
    return s.replace(BS + "'", "'").replace(BS + '"', '"').replace(BS + 'n', '\n').replace(BS + BS, BS)


def source_keys():
    keys = {}
    rd = lambda f: open(os.path.join(SADO, f), encoding='utf-8').read()
    for f, only_l in (('app.js', False), ('art.js', True), ('data.js', False)):
        for kind, s, ln, pre in lex(rd(f)):
            if kind != 's' or (only_l and not re.search(r'I18N\.L\($', pre)):
                continue
            s = unescape(s)
            if JA.search(s) and s not in JA_ONLY and s not in keys:
                keys[s] = '%s:%d' % (f, ln)
    return keys


def load(code):
    t = open(os.path.join(HERE, code + '.js'), encoding='utf-8').read()
    return json.loads(t[t.index('= {') + 2:t.rindex('}') + 1])


def save(code, d):
    body = json.dumps(d, ensure_ascii=False, indent=0).replace('\n', '\r\n')
    js = ('// 茶の湯みち：%s の訳（日本語の文 → 訳）。i18n.js が読み込む\r\n' % code
          + 'window.I18N_DATA = window.I18N_DATA || {};\r\n'
          + "window.I18N_DATA['%s'] = %s;\r\n" % (code, body))
    open(os.path.join(HERE, code + '.js'), 'w', encoding='utf-8', newline='').write(js)


def problems(code, k, v):
    out = []
    if not isinstance(v, str) or not v.strip():
        return ['空']
    if sorted(PH.findall(k)) != sorted(PH.findall(v)) and k != 'よみ：{yomi}':
        out.append('差し込み{…}が違う')
    if sorted(TAG.findall(k)) != sorted(TAG.findall(v)):
        out.append('タグが違う')
    quoted = ''.join(re.findall('「([^」]*)」', k))
    if [c for c in KANA.findall(v) if c not in quoted and c not in '・ー']:
        out.append('かなが残っている')
    if code in ('en', 'ko') and [c for c in HAN.findall(v) if c not in quoted]:
        out.append('漢字が残っている')
    return out


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'status'
    keys = source_keys()
    if cmd == 'status':
        print('訳す文', len(keys))
        for code in CODES:
            d = load(code)
            miss = [k for k in keys if k not in d]
            bad = [k for k in keys if k in d and problems(code, k, d[k])]
            print('%-8s 訳 %4d  足りない %3d  問題 %3d  使われていない %3d' % (code, len(d), len(miss), len(bad), len([k for k in d if k not in keys])))
    elif cmd == 'missing':
        code = sys.argv[2]; d = load(code)
        miss = [{'k': k, 'ctx': c} for k, c in keys.items() if k not in d]
        if len(sys.argv) > 3:
            json.dump(miss, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
        for x in miss:
            print(x['ctx'], x['k'])
        print('足りない', len(miss))
    elif cmd == 'merge':
        code, f = sys.argv[2], sys.argv[3]
        d = load(code); new = json.load(open(f, encoding='utf-8'))
        ng = {k: problems(code, k, v) for k, v in new.items() if problems(code, k, v)}
        for k, p in ng.items():
            print(p, k[:50], '→', str(new[k])[:60])
        if ng:
            sys.exit('問題があるので足しません')
        d.update(new)
        save(code, {k: d[k] for k in keys if k in d} | {k: v for k, v in d.items() if k not in keys})
        print('足しました', len(new))


if __name__ == '__main__':
    main()
