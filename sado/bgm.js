// ===== 茶の湯みち：和風BGM =====
// 音源ファイルは使わず、Web Audio でその場で琴の音を作って鳴らす（著作権・容量・オフラインの心配なし）。
// 明るく和む響きにするため、半音のない「呂音階」（ニ長調の五音：レ・ミ・ファ♯・ラ・シ）を使う。
// 旋律は毎回少しずつ変わる。フレーズの合間に琴の分散和音を鳴らし、ときどき風鈴のような音を添える。
// ブラウザの決まりで、最初のタップまでは鳴らせない。

const BGM = (function () {
  const SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83];   // 呂音階 D4〜B5（MIDI 番号）
  const HOME = [0, 3, 5, 8];                                // 落ち着く音（レ・ラ）
  const CHORDS = [[50, 57, 62, 66], [47, 54, 59, 62], [45, 52, 57, 64], [50, 57, 62, 69]];   // 五音の中だけで作る分散和音（レ・シ・ラ・レが根音）
  const CHIMES = [86, 88, 90, 93];                          // 風鈴の音（高いレ・ミ・ファ♯・ラ）
  const BEAT = 0.62;                                        // 1拍の秒数（ゆったり、でも軽やかに）
  const VOL = 0.7;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // 音の通り道：音 → bus →（そのまま／やまびこ）→ master → スピーカー
  function makeGraph(ac) {
    const master = ac.createGain(); master.gain.value = 0;
    const bus = ac.createGain();
    const delay = ac.createDelay(1); delay.delayTime.value = 0.31;
    const tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3200;
    const fb = ac.createGain(); fb.gain.value = 0.28;
    const wet = ac.createGain(); wet.gain.value = 0.32;
    bus.connect(master); bus.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(wet); wet.connect(master);
    master.connect(ac.destination);
    return { ac, master, bus };
  }

  // 琴の音：三角波（胴の響き）＋のこぎり波（爪の当たり）を短く。len は余韻の長さ
  function pluck(G, midi, t, vel, len) {
    const ac = G.ac, f = hz(midi), L = len || 2.4;
    const o1 = ac.createOscillator(), o2 = ac.createOscillator();
    o1.type = 'triangle'; o2.type = 'sawtooth';
    o1.frequency.setValueAtTime(f, t); o2.frequency.setValueAtTime(f, t);
    const g1 = ac.createGain(), g2 = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(f * 10, 10000), t); lp.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.5);
    g1.gain.setValueAtTime(0.0001, t); g1.gain.exponentialRampToValueAtTime(vel, t + 0.006); g1.gain.exponentialRampToValueAtTime(0.0001, t + L);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(vel * 0.28, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(lp); lp.connect(G.bus);
    o1.start(t); o2.start(t); o1.stop(t + L + 0.1); o2.stop(t + 0.3);
  }

  // 風鈴：澄んだ正弦波に、少し高い倍音を重ねて長く響かせる
  function chime(G, midi, t) {
    const ac = G.ac, f = hz(midi);
    [[1, 0.035], [2.76, 0.012]].forEach(([k, v]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f * k, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      o.connect(g); g.connect(G.bus); o.start(t); o.stop(t + 3.1);
    });
  }

  // 持続音（レ・ラ・ファ♯）。ごく小さく、ゆっくり息をするように揺れる
  function drone(G, t) {
    const ac = G.ac;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022, t + 4);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 0.008; lfo.connect(lg); lg.connect(g.gain);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const oscs = [[50, -3], [57, 3], [66, 0]].map(([m, c]) => {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = c; o.connect(lp); o.start(t); return o;
    });
    lp.connect(g); g.connect(G.master); lfo.start(t);
    return (at) => {
      g.gain.cancelScheduledValues(ac.currentTime); g.gain.setValueAtTime(g.gain.value, ac.currentTime); g.gain.linearRampToValueAtTime(0.0001, at);
      oscs.forEach((o) => o.stop(at + 0.1)); lfo.stop(at + 0.1);
    };
  }

  // 旋律づくり：5〜8音で1フレーズ。近くの音へ動きやすく、終わりは落ち着く音で長く。
  // フレーズの合間には短い「間」をとり、そこで分散和音（ときどき風鈴）を鳴らす
  function composer() {
    let idx = 3, left = 0, ci = 0;
    return function next() {
      if (left <= 0) {
        left = 5 + Math.floor(Math.random() * 4);
        return { rest: pick([1, 1.5, 2]) * BEAT, chord: CHORDS[ci++ % CHORDS.length], chime: Math.random() < 0.4 ? pick(CHIMES) : 0 };
      }
      left--;
      idx = Math.max(0, Math.min(SCALE.length - 1, idx + pick([-2, -1, -1, 0, 1, 1, 2])));
      let dur = pick([1, 1, 1, 0.5, 0.5, 1.5, 2]);
      if (left === 0) { idx = HOME.reduce((p, h) => (Math.abs(h - idx) < Math.abs(p - idx) ? h : p), HOME[0]); dur = pick([2, 3]); }
      return { midi: SCALE[idx], dur: dur * BEAT, harm: Math.random() < 0.15 };
    };
  }
  function scheduleUntil(G, next, s, until) {
    while (s.next < until) {
      const n = next();
      if (n.chord) n.chord.forEach((m, k) => pluck(G, m, s.next + k * 0.11, 0.075, 2));
      if (n.chime) chime(G, n.chime, s.next + 0.3);
      if (n.rest) { s.next += n.rest; continue; }
      pluck(G, n.midi, s.next, 0.17 + Math.random() * 0.06);
      if (n.harm && n.midi - 12 >= 50) pluck(G, n.midi - 12, s.next + 0.02, 0.08);
      s.next += n.dur;
    }
  }

  let G = null, comp = null, st = null, timer = null, stopDrone = null, playing = false, started = false;
  function start() {
    if (!G) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      G = makeGraph(new AC());
      comp = composer();
    }
    if (G.ac.state === 'suspended') G.ac.resume();
    if (playing) return;
    playing = true; started = true;
    const t = G.ac.currentTime;
    G.master.gain.cancelScheduledValues(t); G.master.gain.setValueAtTime(G.master.gain.value, t); G.master.gain.linearRampToValueAtTime(ducked ? VOL * 0.35 : VOL, t + 2);
    st = { next: t + 0.4 };
    stopDrone = drone(G, t);
    scheduleUntil(G, comp, st, t + 1.5);
    timer = setInterval(() => scheduleUntil(G, comp, st, G.ac.currentTime + 1.5), 250);
  }
  function stop() {
    if (!playing) return;
    playing = false;
    clearInterval(timer); timer = null;
    const t = G.ac.currentTime;
    G.master.gain.cancelScheduledValues(t); G.master.gain.setValueAtTime(G.master.gain.value, t); G.master.gain.linearRampToValueAtTime(0, t + 0.8);
    if (stopDrone) { stopDrone(t + 0.9); stopDrone = null; }
    setTimeout(() => { if (!playing && G) G.ac.suspend(); }, 1200);
  }

  // 動画のナレーション中は小さくする
  let ducked = false;
  function duck(on) {
    ducked = on;
    if (!G || !playing) return;
    const t = G.ac.currentTime;
    G.master.gain.cancelScheduledValues(t); G.master.gain.setValueAtTime(G.master.gain.value, t); G.master.gain.linearRampToValueAtTime(on ? VOL * 0.35 : VOL, t + 0.6);
  }

  // 確認用：数秒ぶんを無音で作って、音の大きさ（最大・平均）を返す
  async function test(sec) {
    const ac = new OfflineAudioContext(1, 44100 * sec, 44100);
    const g = makeGraph(ac); g.master.gain.value = VOL;
    drone(g, 0);
    scheduleUntil(g, composer(), { next: 0.1 }, sec);
    const d = (await ac.startRendering()).getChannelData(0);
    let peak = 0, sum = 0;
    for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += d[i] * d[i]; }
    return { peak, rms: Math.sqrt(sum / d.length) };
  }

  return { start, stop, duck, test, get playing() { return playing; }, get started() { return started; } };
})();
