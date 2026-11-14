/**
 * race/js/music.js — 背景音乐(Web Audio 实时合成,无需音频文件、无版权问题)
 * 原理:步进音序器(每小节 16 步),用振荡器/噪声合成鼓点、贝斯和旋律。
 * 提供:Music.LIST(给界面用)、Music.play(id) / stop() / setVolume(v) / render(id, 秒数)(测试用)
 * 新增风格:在 TRACKS 里加一项 { bpm, len(总步数), swing(摇摆 0~0.3), play(i, t) },再在 LIST 里登记名字即可。
 */
const Music = (function () {
  let ac = null, master = null, noiseBuf = null, timer = null, step = 0, nextT = 0, curId = 'off', vol = 0.5;
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);        // MIDI 音高 → 频率

  // ---------- 1. 乐器 ----------
  function mkNoise() { const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  function tone(t, f, dur, type, gain, lp) {                 // 有音高的音:起音 10ms,指数衰减
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (lp) { const b = ac.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = lp; o.connect(b); b.connect(g); } else o.connect(g);
    g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, hp, gain) {                         // 噪声(军鼓/踩镲)
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
  }
  function kick(t, g) { const o = ac.createOscillator(), a = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    a.gain.setValueAtTime(g || 0.9, t); a.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); o.connect(a); a.connect(master); o.start(t); o.stop(t + 0.3); }
  const snare = t => { noise(t, 0.16, 1800, 0.45); tone(t, 190, 0.1, 'triangle', 0.25); };
  const clap  = t => { noise(t, 0.05, 1200, 0.35); noise(t + 0.012, 0.05, 1200, 0.3); noise(t + 0.024, 0.14, 1200, 0.3); };
  const hat   = (t, open, g) => noise(t, open ? 0.2 : 0.045, 7000, g || 0.16);

  // ---------- 2. 曲目 ----------
  const TRACKS = {
    // 刺激:150 BPM 电子竞速。贝斯锯齿波八分音符 + 方波琶音 + 四四拍底鼓
    drive: { bpm: 150, len: 64, swing: 0,
      play(i, t) {
        const R = [57, 57, 53, 55], C = [[0, 3, 7, 12], [0, 3, 7, 12], [0, 4, 7, 12], [0, 4, 7, 12]], b = i >> 4, s = i & 15;
        if (s % 4 === 0) kick(t); if (s === 4 || s === 12) clap(t); if (s % 4 === 2) hat(t, false); if (s % 2 === 1) hat(t, false, 0.07);
        if (s % 2 === 0) tone(t, mf(R[b] - 24), 0.16, 'sawtooth', 0.2, 600);
        tone(t, mf(R[b] + 12 + C[b][[0, 1, 2, 3, 2, 1, 2, 3][s % 8]]), 0.12, 'square', 0.06, 2600);
      } },
    // Rap:90 BPM 老派节拍(boom-bap)。底鼓-军鼓、摇摆的踩镲、808 低音、小七和弦。注意:只有节拍,没有人声
    rap: { bpm: 90, len: 64, swing: 0.2,
      play(i, t) {
        const RB = [33, 33, 36, 31], b = i >> 4, s = i & 15, K = (b & 1) ? [0, 6, 10, 13] : [0, 7, 10];
        if (K.includes(s)) { kick(t, 1); tone(t, mf(RB[b]), 0.34, 'sine', 0.5); }
        if (s === 4 || s === 12) snare(t); if (s % 2 === 0) hat(t, false, 0.12); if (s === 14) hat(t, true, 0.12);
        if (s === 0 || s === 10) [0, 3, 7, 10].forEach(o => tone(t, mf(RB[b] + 24 + o), 0.26, 'triangle', 0.07, 2500));
      } },
    // ハテ、:暂定为“日式风格”:都节音阶(小三度/五度之外加半音)的拨弦旋律 + 太鼓 + 低音持续音
    hate: { bpm: 128, len: 64, swing: 0,
      play(i, t) {
        const SC = [0, 1, 5, 7, 8], MEL = [0, -1, 2, -1, 3, -1, 2, -1, 4, -1, 3, -1, 2, -1, 1, -1, 0, -1, 2, -1, 3, -1, 4, -1, 3, -1, 2, -1, 1, -1, 0, -1], s = i & 15, d = MEL[i % 32];
        if (s === 0 || s === 8) kick(t, 0.8); if (s === 0 || s === 6 || s === 10) tone(t, 75, 0.3, 'sine', 0.5);     // 太鼓
        if (s % 2 === 1) hat(t, false, 0.06);
        if (s === 0 && (i >> 4) % 2 === 0) tone(t, mf(45), 0.9, 'sine', 0.22);                                        // 低音持续音
        if (d >= 0) tone(t, mf(69 + SC[d] + ((i >> 5) ? 12 : 0)), 0.32, 'triangle', 0.14, 3800);                      // 拨弦旋律
      } }
  };
  const LIST = [
    { id: 'off',   short: '无',   name: '无音乐',          desc: '只听引擎声(安静)' },
    { id: 'drive', short: '刺激', name: '刺激 · 电子竞速', desc: '150 BPM,四四拍底鼓 + 快速琶音' },
    { id: 'rap',   short: 'Rap',  name: 'Rap · 说唱节拍',  desc: '90 BPM 老派鼓点 + 808 低音(只有节拍,没有人声)' },
    { id: 'hate',  short: 'ハテ、', name: 'ハテ、(日式风格 · 暂定)', desc: '128 BPM,日式音阶拨弦 + 太鼓' }
  ];

  // ---------- 3. 音序器 ----------
  function ensure() {
    if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination); noiseBuf = mkNoise(); }
    if (ac.state === 'suspended') ac.resume();
  }
  function sched() {                                          // 提前 150ms 把接下来的音符排进时间线
    const T = TRACKS[curId], sd = 60 / T.bpm / 4;
    while (nextT < ac.currentTime + 0.15) { T.play(step % T.len, nextT + ((step & 1) ? sd * (T.swing || 0) : 0)); nextT += sd; step++; }
  }
  function stop() { clearInterval(timer); timer = null; curId = 'off'; }
  function play(id) { stop(); if (!TRACKS[id]) return; ensure(); curId = id; step = 0; nextT = ac.currentTime + 0.1; timer = setInterval(sched, 25); }
  function setVolume(v) { vol = v; if (master) master.gain.value = v; }

  /** 离线渲染一段(测试用):返回 {rms, nan},rms>0 且 nan=0 说明确实发出了声音 */
  function render(id, sec) {
    const sr = 22050, oc = new OfflineAudioContext(1, sr * sec, sr), sA = ac, sM = master, sN = noiseBuf;
    ac = oc; master = oc.createGain(); master.gain.value = 0.5; master.connect(oc.destination); noiseBuf = mkNoise();
    const T = TRACKS[id], sd = 60 / T.bpm / 4;
    for (let s = 0, t = 0.05; t < sec - 0.3; s++, t += sd) T.play(s % T.len, t + ((s & 1) ? sd * (T.swing || 0) : 0));
    return oc.startRendering().then(buf => { ac = sA; master = sM; noiseBuf = sN; const d = buf.getChannelData(0); let e = 0, nan = 0; for (const x of d) { if (x !== x) nan++; e += x * x; } return { rms: Math.sqrt(e / d.length), nan }; });
  }
  return { LIST, play, stop, setVolume, render, stats: () => ({ id: curId, step, state: ac && ac.state }) };
})();
