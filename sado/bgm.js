// ===== 茶の湯みち：和風BGM =====
// 音源ファイルは使わず、Web Audio でその場で琴の音を作って鳴らす（著作権・容量・オフラインの心配なし）。
// 音階は琴の「平調子」（レ・ミ・ファ・ラ・シ♭）。旋律は毎回少しずつ変わり、フレーズの間に「間」をとる。
// 低い持続音（笙のような響き）を薄く重ねる。ブラウザの決まりで、最初のタップまでは鳴らせない。

const BGM = (function () {
  const SCALE = [62, 64, 65, 69, 70, 74, 76, 77, 81];   // 平調子 D4〜A5（MIDI 番号）
  const HOME = [0, 3, 5, 8];                            // 落ち着く音（レ・ラ）
  const BEAT = 0.8;                                     // 1拍の秒数（ゆったり）
  const VOL = 0.7;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // 音の通り道：音 → bus →（そのまま／やまびこ）→ master → スピーカー
  function makeGraph(ac) {
    const master = ac.createGain(); master.gain.value = 0;
    const bus = ac.createGain();
    const delay = ac.createDelay(1); delay.delayTime.value = 0.34;
    const tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2200;
    const fb = ac.createGain(); fb.gain.value = 0.3;
    const wet = ac.createGain(); wet.gain.value = 0.3;
    bus.connect(master); bus.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(wet); wet.connect(master);
    master.connect(ac.destination);
    return { ac, master, bus };
  }

  // 琴の音：三角波（胴の響き）＋のこぎり波（爪の当たり）を短く。bend で半音押し上げる（押し手）
  function pluck(G, midi, t, vel, bend) {
    const ac = G.ac, f = hz(midi);
    const o1 = ac.createOscillator(), o2 = ac.createOscillator();
    o1.type = 'triangle'; o2.type = 'sawtooth';
    o1.frequency.setValueAtTime(f, t); o2.frequency.setValueAtTime(f, t);
    if (bend) { o1.frequency.setValueAtTime(f, t + 0.35); o1.frequency.linearRampToValueAtTime(f * Math.pow(2, 1 / 12), t + 0.6); }
    const g1 = ac.createGain(), g2 = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(f * 8, 9000), t); lp.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.6);
    g1.gain.setValueAtTime(0.0001, t); g1.gain.exponentialRampToValueAtTime(vel, t + 0.006); g1.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(lp); lp.connect(G.bus);
    o1.start(t); o2.start(t); o1.stop(t + 2.7); o2.stop(t + 0.35);
  }

  // 持続音（レとラ）。ゆっくり息をするように大きさが揺れる
  function drone(G, t) {
    const ac = G.ac;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 4);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.012; lfo.connect(lg); lg.connect(g.gain);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
    const oscs = [[50, -4], [50, 4], [57, 0], [62, 3]].map(([m, c]) => {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = c; o.connect(lp); o.start(t); return o;
    });
    lp.connect(g); g.connect(G.master); lfo.start(t);
    return (at) => {
      g.gain.cancelScheduledValues(ac.currentTime); g.gain.setValueAtTime(g.gain.value, ac.currentTime); g.gain.linearRampToValueAtTime(0.0001, at);
      oscs.forEach((o) => o.stop(at + 0.1)); lfo.stop(at + 0.1);
    };
  }

  // 旋律づくり：4〜8音で1フレーズ。近くの音へ動きやすく、終わりは落ち着く音で長く。フレーズの後は「間」
  function composer() {
    let idx = 3, left = 0;
    return function next() {
      if (left <= 0) { left = 4 + Math.floor(Math.random() * 5); return { rest: pick([2, 3, 3, 4]) * BEAT }; }
      left--;
      idx = Math.max(0, Math.min(SCALE.length - 1, idx + pick([-2, -1, -1, 0, 1, 1, 2, -3, 3])));
      let dur = pick([1, 1, 1, 2, 2, 0.5, 0.5, 3]);
      if (left === 0) { idx = HOME.reduce((p, h) => (Math.abs(h - idx) < Math.abs(p - idx) ? h : p), HOME[0]); dur = pick([3, 4]); }
      return { midi: SCALE[idx], dur: dur * BEAT, harm: Math.random() < 0.2 };
    };
  }
  function scheduleUntil(G, next, s, until) {
    while (s.next < until) {
      const n = next();
      if (n.rest) { s.next += n.rest; continue; }
      const pc = n.midi % 12, long = n.dur >= BEAT * 2;
      pluck(G, n.midi, s.next, 0.2 + Math.random() * 0.08, long && (pc === 4 || pc === 9) && Math.random() < 0.3);
      if (n.harm && n.midi - 12 >= 50) pluck(G, n.midi - 12, s.next + 0.02, 0.1, false);
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
