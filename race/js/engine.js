/**
 * race/js/engine.js — 赛车引擎(俯视视角,Canvas)
 * 依赖:data.js(CARS, PLANETS)
 * 提供:Race.start(carId, planetKey, onFinish) / Race.stop() / Race.keys(按键状态)
 * 结构:赛道生成 → 车辆物理 → AI → 环境绘制 → 主循环
 */
const Race = (function () {
  const LAPS = 3, N_PER_SEG = 24;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const keys = { left: false, right: false, gas: false, brake: false };
  let W = 0, H = 0, dpr = 1, raf = 0, run = null;

  // ---------- 1. 赛道:Catmull-Rom 闭合曲线,得到中心线点列(控制点来自 data.js 的 TRACKS)----------
  function buildTrack(CTRL) {
    const pts = [], n = CTRL.length;
    for (let i = 0; i < n; i++) {
      const p0 = CTRL[(i + n - 1) % n], p1 = CTRL[i], p2 = CTRL[(i + 1) % n], p3 = CTRL[(i + 2) % n];
      for (let k = 0; k < N_PER_SEG; k++) {
        const t = k / N_PER_SEG, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return pts;
  }

  // ---------- 2. 车辆 ----------
  function makeCar(def, idx, lane, isPlayer, skill) {
    const T = run.track, N = T.length, p = T[idx], q = T[(idx + 1) % N];
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    return { def, isPlayer, skill, x: p[0] + Math.cos(a + Math.PI / 2) * lane, y: p[1] + Math.sin(a + Math.PI / 2) * lane,
             a, vx: 0, vy: 0, idx, lap: -1, prog: 0, off: false, done: false, time: 0 };
  }

  /** 物理:发动机沿车头方向加力;横向速度按抓地衰减(抓地小=漂移);阻力来自大气;风是侧向力 */
  function physics(c, dt, input, env) {
    const d = c.def, fx = Math.cos(c.a), fy = Math.sin(c.a);
    let vf = c.vx * fx + c.vy * fy;                                   // 前向速度
    let lx = c.vx - fx * vf, ly = c.vy - fy * vf;                      // 横向速度
    let pw = d.power * env.pw * 320 * (c.isPlayer ? 1 : c.skill);
    if (d.hover) pw *= 0.35 + Math.min(1, env.air / 0.3) * 0.65;       // 悬浮车:真空里没有气垫
    const grip = 3.0 * d.grip * env.grip * (c.off ? 0.5 : 1);
    const drag = 0.15 + env.air + (c.off ? 2.2 * d.off + (env.solid ? 0 : 3) : 0);
    if (input.gas) vf += pw * dt;
    if (input.brake) vf -= (vf > 0 ? 700 : 200) * dt;
    vf *= Math.exp(-drag * dt);
    const lat = Math.exp(-grip * dt); lx *= lat; ly *= lat;
    vf = Math.max(-120, Math.min(d.maxv, vf));
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    c.a += steer * d.turn * 2.4 * Math.min(1, Math.abs(vf) / 200) * (vf < 0 ? -1 : 1) * dt;
    let wx = 0, wy = 0;
    if (env.wind) { const g = (Math.sin(run.t * 0.6) + 0.5 * Math.sin(run.t * 1.7)) * env.wind * (1 - d.windRes), ang = run.t * 0.15; wx = Math.cos(ang) * g; wy = Math.sin(ang) * g; }
    c.vx = fx * vf + lx + wx * dt; c.vy = fy * vf + ly + wy * dt;
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.speed = Math.hypot(c.vx, c.vy);
  }

  /** 找最近的中心线点(只在上次位置附近搜索),并统计圈数 */
  function track(c) {
    const T = run.track, N = T.length; let best = c.idx, bd = 1e12;
    for (let k = -14; k <= 14; k++) {
      const i = (c.idx + k + N) % N, dx = T[i][0] - c.x, dy = T[i][1] - c.y, dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = i; }
    }
    if (best < c.idx - N / 2) c.lap++; else if (best > c.idx + N / 2) c.lap--;   // 过起点线
    c.idx = best; c.off = Math.sqrt(bd) > run.road; c.prog = c.lap * N + best;
  }

  /** AI:朝前方第 8 个点转向,弯急时松油门 */
  function ai(c) {
    const T = run.track, t = T[(c.idx + 8) % T.length];
    let diff = Math.atan2(t[1] - c.y, t[0] - c.x) - c.a; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return { left: diff < -0.05, right: diff > 0.05, gas: Math.abs(diff) < 0.6, brake: false };
  }


  // ---------- 2b. 障碍与单词牌 ----------
  /** 沿中心线生成障碍和单词牌(固定种子,同一赛道每次位置相同);位置互相避开,起点附近留空 */
  function spawn(trk) {
    const T = run.track, N = T.length; let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const nrm = i => { const a = T[(i + 1) % N], b = T[(i + N - 1) % N], dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const used = [], free = (x, y) => used.every(u => Math.hypot(u[0] - x, u[1] - y) > 130);
    run.obst = []; run.words = [];
    for (let k = 0; k < trk.obst; k++) for (let tr = 0; tr < 30; tr++) {
      const idx = Math.min(N - 16, 16 + Math.floor(((k + 0.5) / trk.obst) * (N - 32)) + Math.floor(rnd() * 5)), n = nrm(idx), off = (rnd() * 2 - 1) * run.road * 0.7;
      const bx = T[idx][0], by = T[idx][1], mv = trk.move && k % 3 === 0, x = bx + n[0] * off, y = by + n[1] * off;
      if (!free(x, y)) continue; used.push([x, y]);
      run.obst.push({ bx, by, nx: n[0], ny: n[1], off, r: 22 + rnd() * 12, kind: rnd() < 0.5 ? 0 : 1, mv, amp: run.road * 0.45, f: 0.6 + rnd(), ph: rnd() * 6.28, x, y, hit: 0 }); break;
    }
    const pool = WORDS.slice().sort(() => rnd() - 0.5);
    for (let k = 0; k < trk.words; k++) for (let tr = 0; tr < 30; tr++) {
      const idx = Math.min(N - 16, 16 + Math.floor(((k + 0.2 + rnd() * 0.6) / trk.words) * (N - 32))), n = nrm(idx), off = (rnd() * 2 - 1) * run.road * 0.55;
      const x = T[idx][0] + n[0] * off, y = T[idx][1] + n[1] * off; if (!free(x, y)) continue; used.push([x, y]);
      run.words.push({ x, y, w: pool[k % pool.length], got: false }); break;
    }
    pickTarget();
  }
  function pickTarget() { const left = run.words.filter(w => !w.got); run.target = left.length ? left[Math.floor(Math.random() * left.length)] : null; }
  function toast(html, ms) { const t = document.getElementById('toast'); t.innerHTML = html; t.style.opacity = 1; clearTimeout(run.tt); run.tt = setTimeout(() => { t.style.opacity = 0; }, ms || 1800); }
  function speak(w) { if (!run.opts.speak || !window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(w); u.lang = 'en-US'; u.rate = 0.85; speechSynthesis.speak(u); }

  /** 每帧:移动障碍、碰撞(撞到减速;玩家扣分)、收集单词牌(玩家加分) */
  function interact(dt) {
    for (const o of run.obst) {
      if (o.mv) { const d = o.off + o.amp * Math.sin(run.t * o.f + o.ph); o.x = o.bx + o.nx * d; o.y = o.by + o.ny * d; }
      if (o.hit > 0) o.hit -= dt;
    }
    for (const c of run.cars) {
      if (c.cool > 0) c.cool -= dt;
      for (const o of run.obst) {
        const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy);
        if (d < o.r + 16) {
          c.x += dx / (d || 1) * (o.r + 16 - d); c.y += dy / (d || 1) * (o.r + 16 - d);          // 顶出去,避免穿过去
          if (!(c.cool > 0)) { c.cool = 0.5; c.vx *= 0.35; c.vy *= 0.35; o.hit = 0.5;
            if (c.isPlayer) { run.score = Math.max(0, run.score - 5); run.shake = 0.35; toast('💥 撞到障碍 −5 分', 900); } }
        }
      }
      if (c.isPlayer) for (const w of run.words) {
        if (w.got || Math.hypot(c.x - w.x, c.y - w.y) > 52) continue;
        w.got = true; const isT = run.target === w, pts = isT ? 30 : 10; run.score += pts; run.got.push(w.w);
        toast((isT ? '🎯 ' : '✔ ') + '<b>' + w.w.en + '</b> = ' + w.w.zh + ' · ' + w.w.ja + '  <b>+' + pts + '</b>');
        speak(w.w.en); if (isT) pickTarget();
      }
    }
  }
  function drawItems(env) {
    for (const o of run.obst) {
      ctx.save(); ctx.translate(o.x, o.y); if (o.hit > 0) ctx.globalAlpha = 0.45;
      if (!env.solid) {                                                         // 巨行星:乌云团
        ctx.fillStyle = '#2b2f4a'; [[0, 0, o.r], [-o.r * 0.7, o.r * 0.3, o.r * 0.7], [o.r * 0.7, o.r * 0.2, o.r * 0.75]].forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, 7); ctx.fill(); });
        ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-4, -o.r * 0.4); ctx.lineTo(4, 0); ctx.lineTo(-3, 2); ctx.lineTo(5, o.r * 0.5); ctx.stroke();
      } else if (o.kind === 0) {                                                // 岩石
        ctx.fillStyle = '#6b6f78'; ctx.strokeStyle = '#2b2f3a'; ctx.lineWidth = 4; ctx.beginPath();
        for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, r = o.r * (0.85 + 0.25 * Math.sin(o.ph * 3 + i * 2.1)); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(-o.r * 0.3, -o.r * 0.3, o.r * 0.3, 0, 7); ctx.fill();
      } else {                                                                  // 锥桶
        ctx.fillStyle = '#ff7a1a'; ctx.strokeStyle = '#7a2f00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -o.r); ctx.lineTo(o.r * 0.9, o.r * 0.8); ctx.lineTo(-o.r * 0.9, o.r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(-o.r * 0.45, -o.r * 0.1, o.r * 0.9, o.r * 0.28);
      }
      ctx.restore();
    }
    ctx.font = '700 24px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const w of run.words) {                                                // 单词牌:只显示英文,捡到后才显示意思
      if (w.got) continue; const tw = ctx.measureText(w.w.en).width + 28, isT = run.target === w;
      ctx.fillStyle = isT ? '#fff3b0' : '#ffffff'; ctx.strokeStyle = isT ? '#f59e0b' : '#3b82f6'; ctx.lineWidth = isT ? 6 : 4;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(w.x - tw / 2, w.y - 20, tw, 40, 14) : ctx.rect(w.x - tw / 2, w.y - 20, tw, 40); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1e293b'; ctx.fillText(w.w.en, w.x, w.y + 1);
    }
  }

  // ---------- 3. 环境绘制 ----------
  function drawGround(env, camX, camY, z) {
    const x0 = camX - W / 2 / z, y0 = camY - H / 2 / z, x1 = camX + W / 2 / z, y1 = camY + H / 2 / z;
    if (env.solid) {
      ctx.fillStyle = env.ground; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = env.craters;
      for (const c of run.craters) { if (c.x < x0 - 80 || c.x > x1 + 80 || c.y < y0 - 80 || c.y > y1 + 80) continue; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.fill(); }
    } else {                                                           // 巨行星:云带(横向条纹)
      const bh = 150, s = Math.floor(y0 / bh);
      for (let k = s; k * bh < y1; k++) { ctx.fillStyle = env.bands[((k % 4) + 4) % 4]; ctx.fillRect(x0, k * bh, x1 - x0, bh + 1); }
    }
  }
  function drawRoad(env) {
    const T = run.track; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const path = () => { ctx.beginPath(); T.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    path(); ctx.strokeStyle = env.solid ? '#ffffff' : '#e8f4ff'; ctx.lineWidth = run.road * 2 + 18; ctx.stroke();      // 路缘
    path(); ctx.strokeStyle = env.road; ctx.lineWidth = run.road * 2; ctx.stroke();                                 // 路面
    path(); ctx.setLineDash([40, 50]); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 6; ctx.stroke(); ctx.setLineDash([]);
    const p = T[0], q = T[1], a = Math.atan2(q[1] - p[1], q[0] - p[0]);                                            // 起点线
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a); ctx.fillStyle = '#fff';
    for (let i = -6; i < 6; i++) ctx.fillRect(-8, i * 20, 16, 20 * ((i & 1) ? 0 : 1)); ctx.restore();
  }
  function drawCar(c) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
    if (c.def.hover) { ctx.fillStyle = 'rgba(56,189,248,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 20, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = c.def.color; ctx.fillRect(-24, -13, 48, 26);
    ctx.fillStyle = '#0b1220'; ctx.fillRect(2, -9, 14, 18); ctx.fillStyle = '#fff'; ctx.fillRect(22, -10, 3, 5); ctx.fillRect(22, 5, 3, 5);
    if (c.isPlayer) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(-24, -13, 48, 26); }
    ctx.restore();
  }
  function drawFx(env, dt, playerSpeed) {                              // 屏幕空间粒子:沙尘/风线/闪电/雾
    for (const p of run.parts) {
      p.x -= (Math.sin(run.t * 0.3) * env.wind * 2 + 60 + (env.fx === 'wind' ? 400 : 0)) * dt * p.s; p.y += (p.s - 0.5) * 30 * dt;
      if (p.x < 0) { p.x = W; p.y = Math.random() * H; }
      if (env.fx === 'dust') { ctx.fillStyle = 'rgba(230,160,110,.35)'; ctx.fillRect(p.x, p.y, 3, 3); }
      else if (env.fx === 'wind') { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 40 * p.s, p.y); ctx.stroke(); }
    }
    if (env.fog) { ctx.fillStyle = env.fog; ctx.fillRect(0, 0, W, H); }
    if (env.fx === 'lightning') { if (Math.random() < 0.004) run.flash = 1; if (run.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (run.flash * 0.35) + ')'; ctx.fillRect(0, 0, W, H); run.flash -= dt * 4; } }
  }

  // ---------- 4. 主循环 ----------
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; }
  addEventListener('resize', resize);
  function hud(p, rank, total) {
    document.getElementById('hud').innerHTML = '<span>第 ' + Math.min(LAPS, Math.max(1, p.lap + 1)) + ' / ' + LAPS + ' 圈</span><span>名次 ' + rank + ' / ' + total + '</span><span>' + Math.round(p.speed || 0) + ' km/h</span><span>' + run.time.toFixed(1) + ' 秒</span><span>得分 ' + run.score + '</span><span>🎯 找:' + (run.target ? run.target.w.zh + '(' + run.target.w.ja + ')' : '全部收集!') + '</span>';
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - run.last) / 1000); run.last = now; run.t += dt;
    const env = run.env, N = run.track.length;
    if (run.count > 0) { run.count -= dt; document.getElementById('count').textContent = run.count > 0 ? Math.ceil(run.count) : 'GO!'; }
    else { run.time += dt; run.count -= dt; if (run.count > -0.8) document.getElementById('count').textContent = 'GO!'; else document.getElementById('count').textContent = ''; }
    const go = run.count <= 0;
    for (const c of run.cars) {
      if (c.done) { physics(c, dt, { gas: false, brake: true }, env); continue; }
      const input = c.isPlayer ? keys : ai(c);
      if (go) physics(c, dt, input, env); else { c.speed = 0; }
      track(c);
      if (go && !c.done && c.prog >= LAPS * N) { c.done = true; c.time = run.time; run.finish.push(c); if (c.isPlayer) { run.playerDone = true; } }
    }
    interact(dt);
    const order = run.cars.slice().sort((a, b) => b.prog - a.prog), me = run.cars[0];
    hud(me, order.indexOf(me) + 1, order.length);
    // 绘制
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const z = 0.78 - Math.min(0.2, (me.speed || 0) / 3500);
    if (run.shake > 0) run.shake -= dt;
    ctx.save(); ctx.translate(W / 2 + (run.shake > 0 ? (Math.random() - 0.5) * run.shake * 30 : 0), H / 2 + (run.shake > 0 ? (Math.random() - 0.5) * run.shake * 30 : 0)); ctx.scale(z, z); ctx.translate(-me.x, -me.y);
    drawGround(env, me.x, me.y, z); drawRoad(env); drawItems(env); run.cars.slice().reverse().forEach(drawCar);
    ctx.restore(); drawFx(env, dt, me.speed);
    if (run.playerDone && !run.ended) { run.ended = true; setTimeout(endRace, 900); }
    raf = requestAnimationFrame(frame);
  }
  function endRace() {
    const list = run.cars.slice().sort((a, b) => (b.done - a.done) || (a.done ? a.time - b.time : b.prog - a.prog));
    document.getElementById('endlist').innerHTML = list.map(c => '<li>' + (c.isPlayer ? '<b>' : '') + c.def.name + (c.isPlayer ? '(你)</b>' : '') + ' — ' + (c.done ? c.time.toFixed(1) + ' 秒' : '未完赛') + '</li>').join('');
    const rank = list.indexOf(run.cars[0]) + 1, bonus = [0, 50, 30, 15, 0][rank] || 0, total = run.score + bonus, key = 'race-best-' + run.trackId;
    let best = 0; try { best = +(localStorage.getItem(key) || 0); if (total > best) { best = total; localStorage.setItem(key, best); } } catch (e) {}
    document.getElementById('endscore').innerHTML = '<b>得分 ' + total + '</b>(单词和障碍 ' + run.score + ' + 名次奖励 ' + bonus + ')· 本赛道最高分 ' + best;
    document.getElementById('endwords').innerHTML = run.got.length ? '<b>这局学到的单词(' + run.got.length + ' 个)</b><br>' + run.got.map(w => w.en + ' ' + w.zh + ' ' + w.ja).join(' · ') : '这局没有收集到单词,下次试试!';
    document.getElementById('end').hidden = false;
    run.onFinish && run.onFinish(list.indexOf(run.cars[0]) + 1);
  }

  function start(carId, planetKey, trackId, opts) {
    stop(); resize();
    const env = PLANETS[planetKey], trk = TRACKS[trackId] || TRACKS.easy, N = buildTrack(trk.ctrl).length;
    run = { env, track: buildTrack(trk.ctrl), road: trk.road, trackId, opts: opts || {}, t: 0, time: 0, count: 3.5, last: performance.now(), flash: 0, finish: [], cars: [], craters: [], parts: [], score: 0, got: [], shake: 0, obst: [], words: [] };
    const me = CARS.find(c => c.id === carId), others = CARS.filter(c => c.id !== carId);
    run.cars.push(makeCar(me, N - 2, -45, true, 1));
    others.forEach((d, i) => run.cars.push(makeCar(d, N - 4 - i * 2, i % 2 ? 45 : -45, false, 0.8 + i * 0.05)));
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;           // 固定种子:每次环形山位置相同
    spawn(trk);
    for (let i = 0; i < 420; i++) run.craters.push({ x: (rnd() - 0.5) * 6200, y: (rnd() - 0.5) * 4600, r: 14 + rnd() * 70 });
    for (let i = 0; i < 90; i++) run.parts.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() });
    document.getElementById('end').hidden = true;
    document.getElementById('env').innerHTML = '<b>' + env.name + '</b> · 重力 ' + env.g + ' m/s² · ' + env.temp + '<br>' + env.atm + ' · ' + env.note;
    raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); run = null; }
  return { start, stop, keys, LAPS, debug: () => run };   // debug 仅供测试使用
})();
