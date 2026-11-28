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
  function tone(t, f, dur, type, gain, lp, att, hold) {         // 有音高的音:起音默认 10ms;hold=true 时持续到结尾再收(管风琴/铺底)
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; att = att || 0.01;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + att);
    if (hold) { g.gain.setValueAtTime(gain, Math.max(t + att, t + dur - 0.5)); }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (lp) { const b = ac.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = lp; o.connect(b); b.connect(g); } else o.connect(g);
    g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function organ(t, f, dur, gain) { [[1, 1], [2, 0.45], [3, 0.2], [4, 0.1]].forEach(p => tone(t, f * p[0], dur, 'sine', gain * p[1], 3200, 0.35, true)); }   // 管风琴:加法合成
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
      } },
    // 星际穿越风(原创):96 BPM,A 小调 Am–F–C–G。管风琴琶音(八分音符)+ 长长的铺底和弦 + 低音 + 钟表滴答。不是电影原声
    space: { bpm: 96, len: 128, swing: 0,
      play(i, t) {
        const CH = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 60, 64, 67], [55, 59, 62, 67]], c = CH[i >> 5], j = i & 31, bar = (i >> 4) & 1;
        if (j === 0) { c.forEach((n, k) => organ(t, mf(n - 12), 5.0, 0.05)); tone(t, mf(c[0] - 24), 5.0, 'sine', 0.3, 300, 0.2, true); }   // 铺底 + 低音,持续 2 小节
        if (j % 2 === 0) { const k = [0, 1, 2, 3, 2, 1, 3, 2][(j >> 1) % 8]; tone(t, mf(c[k] + 12), 0.5, 'triangle', 0.075, 1900, 0.02); }   // 琶音
        if (i % 6 === 3) tone(t, 2100, 0.02, 'square', 0.02, 5000);                                                                          // 钟表滴答
        if ((i >> 5) % 2 === 1 && (j === 0 || j === 12 || j === 24)) tone(t, mf(c[(j / 4) % 4 | 0] + 24), 1.6, 'sine', 0.06, null, 0.02);     // 高处的钟声
        if (j === 16) kick(t, 0.35);
      } },
    // めぐる季節(程序原创):春夏秋冬各 2 小节(32 步),音阶/乐器/节奏随季节改变,然后循环。不是同名歌曲
    seasons: { bpm: 100, len: 128, swing: 0.06,
      play(i, t) {
        const S = i >> 5, j = i & 31, h = ((i * 2654435761) >>> 0) % 100, deg = (sc, root, d) => mf(root + sc[((d % sc.length) + sc.length) % sc.length] + 12 * Math.floor(d / sc.length));
        if (S === 0) {                                                  // 春:C 大调五声,明亮的拨弦
          const sc = [0, 2, 4, 7, 9], M = [4, -9, 2, -9, 3, -9, 0, -9, 2, -9, 4, -9, 5, -9, 4, -9, 7, -9, 5, -9, 4, -9, 2, -9, 3, -9, 2, -9, 0, -9, -9, -9];
          if (j % 16 === 0) { kick(t, 0.5); tone(t, mf(36 + (j >= 16 ? 7 : 0)), 0.6, 'sine', 0.3); } if (j % 4 === 2) hat(t, false, 0.05);
          if (M[j] > -9) tone(t, deg(sc, 72, M[j]), 0.24, 'triangle', 0.15, 3500);
          if (j % 8 === 0) tone(t, deg(sc, 96, h % 5), 0.5, 'sine', 0.045);
        } else if (S === 1) {                                           // 夏:D 混合利底亚,四四拍 + 十六分琶音
          const sc = [0, 2, 4, 5, 7, 9, 10];
          if (j % 4 === 0) kick(t, 0.8); if (j % 16 === 8) clap(t); if (j % 2 === 0) hat(t, j % 4 === 2, 0.1);
          if (j % 4 === 2) tone(t, mf(38 + (j >= 16 ? 5 : 0)), 0.16, 'sawtooth', 0.14, 700);
          tone(t, deg(sc, 74, [0, 2, 4, 2, 4, 5, 4, 2][j % 8] + (h % 3 === 0 ? 7 : 0)), 0.1, 'square', 0.05, 2800);
        } else if (S === 2) {                                           // 秋:日本都节音阶,稀疏、低沉
          const sc = [0, 2, 3, 7, 8], M = [4, 3, 2, 0, 2, 3, 2, 0];
          if (j === 0 || j === 16) { kick(t, 0.55); tone(t, 70, 0.5, 'sine', 0.4); }
          if (j === 0) organ(t, mf(45), 3.2, 0.04);
          if (j % 4 === 0) tone(t, deg(sc, 69, M[(j >> 2) % 8]), 0.55, 'triangle', 0.15, 2600);
          if (j % 8 === 6) hat(t, false, 0.04);
        } else {                                                        // 冬:E 利底亚,高处的钟声 + 雪橇铃
          const sc = [0, 2, 4, 6, 7, 9, 11];
          if (j === 0) { [64, 71, 76].forEach(n => organ(t, mf(n), 3.4, 0.035)); }
          if (j % 6 === 0) tone(t, deg(sc, 88, h % 7 - 2), 1.4, 'sine', 0.09, null, 0.005);
          if (j % 2 === 1) noise(t, 0.04, 9000, 0.03);
          if (j === 16) tone(t, mf(40), 1.5, 'sine', 0.2);
        }
      } }
  };
  const LIST = [
    { id: 'off',   short: '无',   name: '无音乐',          desc: '只听引擎声(安静)' },
    { id: 'drive', short: '刺激', name: '刺激 · 电子竞速', desc: '150 BPM,四四拍底鼓 + 快速琶音' },
    { id: 'rap',   short: 'Rap',  name: 'Rap · 说唱节拍',  desc: '90 BPM 老派鼓点 + 808 低音(只有节拍,没有人声)' },
    { id: 'hate',  short: 'ハテ、', name: 'ハテ、(日式风格 · 暂定)', desc: '128 BPM,日式音阶拨弦 + 太鼓' },
    { id: 'space', short: '星际', name: '星际穿越 · 太空管风琴(原创)', desc: '96 BPM,管风琴琶音 + 长铺底 + 钟表滴答(原创风格,不是电影原声)' },
    { id: 'seasons', short: 'めぐる季節', name: 'めぐる季節 · 四季循环(程序原创)', desc: '春夏秋冬各 2 小节,音阶和乐器随季节变化(原创,不是同名歌曲)' }
  ];
  const SEASONS = ['🌸 春 はる', '☀ 夏 なつ', '🍁 秋 あき', '❄ 冬 ふゆ'];

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
  /** 音效:撞车 crash / 轻撞 bump / 捡到单词 pick(和音乐共用音量) */
  function sfx(kind, g) {
    if (vol <= 0) return; ensure(); const t = ac.currentTime + 0.005; g = g || 1;
    if (kind === 'crash') { noise(t, 0.35, 400, 0.5 * g); kick(t, 0.9 * g); tone(t, 520, 0.25, 'square', 0.12 * g, 2200); tone(t, 347, 0.3, 'square', 0.1 * g, 1800); }
    else if (kind === 'bump') { noise(t, 0.12, 900, 0.3 * g); kick(t, 0.5 * g); }
    else if (kind === 'pick') { tone(t, 880, 0.1, 'triangle', 0.15); tone(t + 0.06, 1320, 0.12, 'triangle', 0.15); }
  }
  const info = () => ({ season: curId === 'seasons' ? SEASONS[Math.floor(((step + 127) % 128) / 32)] : '' });
  return { LIST, play, stop, setVolume, render, sfx, info, stats: () => ({ id: curId, step, state: ac && ac.state }) };
})();
