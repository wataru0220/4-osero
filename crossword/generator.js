/* ===== クロスワード自動生成 =====
   スケルトン（クリスクロス）方式：
   ・1語目を中央に置き、以後は「既にある文字と必ず交差する」位置にだけ語を足す。
   ・新しく置くマスの横（進行方向に対して直角）に既存の文字があってはいけない
     ＝意図しない2文字の並びが生まれないので、盤面に現れる2マス以上の並びは
       必ず「出題した語」だけになる。
   これで小さな語彙でも必ず正しい問題になる。 */
(function (global) {
  'use strict';

  var ALL = null;          // [{w:答え, c:カギ}]
  function words() {
    if (!ALL) {
      ALL = [];
      (global.CW_WORDS || '').split('\n').forEach(function (line) {
        line = line.trim();
        if (!line) return;
        var i = line.indexOf('|');
        if (i < 1) return;
        ALL.push({ w: line.slice(0, i).trim(), c: line.slice(i + 1).trim() });
      });
    }
    return ALL;
  }

  // ---- 乱数（seed 付き。同じ seed なら同じ問題＝「この問題をもう一度」用） ----
  function rngOf(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  function shuffle(a, rnd) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // min/maxLen＝使う語の文字数、bonus＝長い語を優先する度合い（難しいほど長い語に）
  var LEVELS = {
    kids:   { name: 'キッズ',     target: 7,  max: 8,  min: 2, maxLen: 3, bonus: 0 },
    easy:   { name: 'やさしい',   target: 9,  max: 9,  min: 2, maxLen: 4, bonus: 2 },
    normal: { name: 'ふつう',     target: 13, max: 11, min: 3, maxLen: 6, bonus: 5 },
    hard:   { name: 'むずかしい', target: 17, max: 13, min: 3, maxLen: 7, bonus: 8 }
  };

  // ---- 1回ぶんの配置 ----
  function layout(cfg, rnd) {
    var pool = words().filter(function (e) {
      return e.w.length >= cfg.min && e.w.length <= cfg.maxLen;
    });
    if (!pool.length) return null;
    shuffle(pool, rnd);

    var g = {};                 // "r,c" -> 文字
    var mark = { A: {}, D: {} }; // その向きの語がすでに通っているマス
    var placed = [];
    var used = {};
    var r0 = 0, c0 = 0, r1 = 0, c1 = 0;   // 使用範囲

    // 1語目＝長めの語を中央に
    var first = pool[0];
    for (var i = 1; i < Math.min(pool.length, 40); i++) {
      if (pool[i].w.length > first.w.length) first = pool[i];
    }
    var vertical = rnd() < 0.5;
    for (var k = 0; k < first.w.length; k++) {
      var fk = (vertical ? k : 0) + ',' + (vertical ? 0 : k);
      g[fk] = first.w[k];
      mark[vertical ? 'D' : 'A'][fk] = 1;
    }
    r1 = vertical ? first.w.length - 1 : 0;
    c1 = vertical ? 0 : first.w.length - 1;
    placed.push({ w: first.w, clue: first.c, r: 0, c: 0, dir: vertical ? 'D' : 'A' });
    used[first.w] = 1;

    function score(w, r, c, dir) {
      var dr = dir === 'A' ? 0 : 1, dc = dir === 'A' ? 1 : 0;
      var pr = dir === 'A' ? 1 : 0, pc = dir === 'A' ? 0 : 1;   // 直角方向
      // 語の前後は空きでなければならない（前の語とくっつかせない）
      if (g[(r - dr) + ',' + (c - dc)] || g[(r + w.length * dr) + ',' + (c + w.length * dc)]) return null;
      var cross = 0, fresh = 0;
      for (var i = 0; i < w.length; i++) {
        var rr = r + i * dr, cc = c + i * dc, cur = g[rr + ',' + cc];
        if (mark[dir][rr + ',' + cc]) return null;   // 同じ向きの語と重ねない
        if (cur !== undefined) {
          if (cur !== w[i]) return null;
          cross++;
        } else {
          fresh++;
          if (g[(rr + pr) + ',' + (cc + pc)] || g[(rr - pr) + ',' + (cc - pc)]) return null;
        }
      }
      if (cross === 0 || fresh === 0) return null;         // 交差必須／完全な重なりは不可
      var nr0 = Math.min(r0, r), nc0 = Math.min(c0, c);
      var nr1 = Math.max(r1, r + (w.length - 1) * dr), nc1 = Math.max(c1, c + (w.length - 1) * dc);
      var H = nr1 - nr0 + 1, W = nc1 - nc0 + 1;
      if (H > cfg.max || W > cfg.max) return null;
      var grow = H * W - (r1 - r0 + 1) * (c1 - c0 + 1);
      // 交差多め・正方形に近く・広がりは控えめ・難しいレベルほど長い語を優先
      return cross * 16 - grow * 2 - Math.abs(H - W) * 4 + w.length * (cfg.bonus || 0) + rnd() * 4;
    }

    var guard = 0;
    while (placed.length < cfg.target && guard++ < 400) {
      var best = null;
      for (var p = 0; p < pool.length; p++) {
        var e = pool[p];
        if (used[e.w]) continue;
        for (var key in g) {
          var ch = g[key], sp = key.indexOf(','),
              rr = +key.slice(0, sp), cc = +key.slice(sp + 1);
          for (var i2 = 0; i2 < e.w.length; i2++) {
            if (e.w[i2] !== ch) continue;
            for (var d = 0; d < 2; d++) {
              var dir = d ? 'D' : 'A';
              var r = dir === 'D' ? rr - i2 : rr;
              var c = dir === 'A' ? cc - i2 : cc;
              var s = score(e.w, r, c, dir);
              if (s !== null && (!best || s > best.s)) best = { s: s, e: e, r: r, c: c, dir: dir };
            }
          }
        }
      }
      if (!best) break;
      var dr2 = best.dir === 'A' ? 0 : 1, dc2 = best.dir === 'A' ? 1 : 0;
      for (var m = 0; m < best.e.w.length; m++) {
        var mk = (best.r + m * dr2) + ',' + (best.c + m * dc2);
        g[mk] = best.e.w[m];
        mark[best.dir][mk] = 1;
      }
      r0 = Math.min(r0, best.r); c0 = Math.min(c0, best.c);
      r1 = Math.max(r1, best.r + (best.e.w.length - 1) * dr2);
      c1 = Math.max(c1, best.c + (best.e.w.length - 1) * dc2);
      placed.push({ w: best.e.w, clue: best.e.c, r: best.r, c: best.c, dir: best.dir });
      used[best.e.w] = 1;
    }
    return { g: g, placed: placed, r0: r0, c0: c0, rows: r1 - r0 + 1, cols: c1 - c0 + 1 };
  }

  // ---- 盤面データに整形（番号ふり・カギ一覧） ----
  function finish(lay, levelKey, seed) {
    var rows = lay.rows, cols = lay.cols;
    var cells = new Array(rows * cols);
    for (var key in lay.g) {
      var sp = key.indexOf(','), r = +key.slice(0, sp) - lay.r0, c = +key.slice(sp + 1) - lay.c0;
      cells[r * cols + c] = { sol: lay.g[key], num: 0 };
    }
    var list = lay.placed.map(function (p) {
      return { word: p.w, clue: p.clue, r: p.r - lay.r0, c: p.c - lay.c0, dir: p.dir, len: p.w.length };
    });
    // 左上から順に番号
    list.sort(function (a, b) { return (a.r - b.r) || (a.c - b.c) || (a.dir === 'A' ? -1 : 1); });
    var n = 0, numAt = {};
    list.forEach(function (p) {
      var k = p.r + ',' + p.c;
      if (!numAt[k]) { numAt[k] = ++n; cells[p.r * cols + p.c].num = n; }
      p.num = numAt[k];
      p.cells = [];
      for (var i = 0; i < p.len; i++) {
        var rr = p.r + (p.dir === 'D' ? i : 0), cc = p.c + (p.dir === 'A' ? i : 0);
        p.cells.push(rr * cols + cc);
      }
    });
    list.forEach(function (p, i) { p.id = i; });
    return {
      level: levelKey, levelName: LEVELS[levelKey].name, seed: seed,
      rows: rows, cols: cols, cells: cells, words: list
    };
  }

  // ---- 公開：問題を1つ作る ----
  function generate(levelKey, seed) {
    var cfg = LEVELS[levelKey] || LEVELS.easy;
    if (seed === undefined || seed === null) seed = (Math.random() * 4294967295) >>> 0;
    var best = null, bestScore = -1;
    for (var t = 0; t < 8; t++) {
      var lay = layout(cfg, rngOf((seed + t * 2654435761) >>> 0));
      if (!lay) continue;
      // 語数を最優先、次に正方形に近いかたち、ぎっしり度
      var fill = Object.keys(lay.g).length / (lay.rows * lay.cols);
      var sc = lay.placed.length * 100 - Math.abs(lay.rows - lay.cols) * 6 + fill * 20;
      if (sc > bestScore) { bestScore = sc; best = lay; }
      if (lay.placed.length >= cfg.target && Math.abs(lay.rows - lay.cols) <= 2) break;
    }
    if (!best) return null;
    return finish(best, levelKey in LEVELS ? levelKey : 'easy', seed);
  }

  global.CWGen = { generate: generate, levels: LEVELS, wordCount: function () { return words().length; } };
})(window);
