/**
 * race/js/engine.js — 赛车引擎(俯视视角,Canvas)
 * 依赖:data.js(CARS, PLANETS)
 * 提供:Race.start(carId, planetKey, onFinish) / Race.stop() / Race.keys(按键状态)
 * 结构:赛道生成 → 车辆物理 → AI → 环境绘制 → 主循环
 */
const Race = (function () {
  const LAPS = 3, ROAD_HALF = 120, N_PER_SEG = 24;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const keys = { left: false, right: false, gas: false, brake: false };
  let W = 0, H = 0, dpr = 1, raf = 0, run = null;

  // ---------- 1. 赛道:Catmull-Rom 闭合曲线,得到中心线点列 ----------
  const CTRL = [[0,-700],[900,-800],[1500,-300],[1300,300],[600,500],[300,900],[-500,900],[-1300,500],[-1400,-200],[-800,-600]];
  function buildTrack() {
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
    c.idx = best; c.off = Math.sqrt(bd) > ROAD_HALF; c.prog = c.lap * N + best;
  }

  /** AI:朝前方第 8 个点转向,弯急时松油门 */
  function ai(c) {
    const T = run.track, t = T[(c.idx + 8) % T.length];
    let diff = Math.atan2(t[1] - c.y, t[0] - c.x) - c.a; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return { left: diff < -0.05, right: diff > 0.05, gas: Math.abs(diff) < 0.6, brake: false };
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
    path(); ctx.strokeStyle = env.solid ? '#ffffff' : '#e8f4ff'; ctx.lineWidth = ROAD_HALF * 2 + 18; ctx.stroke();      // 路缘
    path(); ctx.strokeStyle = env.road; ctx.lineWidth = ROAD_HALF * 2; ctx.stroke();                                 // 路面
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
    document.getElementById('hud').innerHTML = '<span>第 ' + Math.min(LAPS, Math.max(1, p.lap + 1)) + ' / ' + LAPS + ' 圈</span><span>名次 ' + rank + ' / ' + total + '</span><span>' + Math.round(p.speed || 0) + ' km/h</span><span>' + run.time.toFixed(1) + ' 秒</span>';
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - run.last) / 1000); run.last = now; run.t += dt;
    const env = run.env, N = run.track.length;
    if (run.count > 0) { run.count -= dt; document.getElementById('count').textContent = run.count > 0 ? Math.ceil(run.count) : 'GO!'; }
    else { run.time += dt; if (run.count > -0.8) document.getElementById('count').textContent = 'GO!'; else document.getElementById('count').textContent = ''; }
    const go = run.count <= 0;
    for (const c of run.cars) {
      if (c.done) { physics(c, dt, { gas: false, brake: true }, env); continue; }
      const input = c.isPlayer ? keys : ai(c);
      if (go) physics(c, dt, input, env); else { c.speed = 0; }
      track(c);
      if (go && !c.done && c.prog >= LAPS * N) { c.done = true; c.time = run.time; run.finish.push(c); if (c.isPlayer) { run.playerDone = true; } }
    }
    const order = run.cars.slice().sort((a, b) => b.prog - a.prog), me = run.cars[0];
    hud(me, order.indexOf(me) + 1, order.length);
    // 绘制
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const z = 0.78 - Math.min(0.2, (me.speed || 0) / 3500);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-me.x, -me.y);
    drawGround(env, me.x, me.y, z); drawRoad(env); run.cars.slice().reverse().forEach(drawCar);
    ctx.restore(); drawFx(env, dt, me.speed);
    if (run.playerDone && !run.ended) { run.ended = true; setTimeout(endRace, 900); }
    raf = requestAnimationFrame(frame);
  }
  function endRace() {
    const list = run.cars.slice().sort((a, b) => (b.done - a.done) || (a.done ? a.time - b.time : b.prog - a.prog));
    document.getElementById('endlist').innerHTML = list.map(c => '<li>' + (c.isPlayer ? '<b>' : '') + c.def.name + (c.isPlayer ? '(你)</b>' : '') + ' — ' + (c.done ? c.time.toFixed(1) + ' 秒' : '未完赛') + '</li>').join('');
    document.getElementById('end').hidden = false;
    run.onFinish && run.onFinish(list.indexOf(run.cars[0]) + 1);
  }

  function start(carId, planetKey, onFinish) {
    stop(); resize();
    const env = PLANETS[planetKey], track = buildTrack(), N = track.length;
    run = { env, track, t: 0, time: 0, count: 3.5, last: performance.now(), flash: 0, finish: [], onFinish, cars: [], craters: [], parts: [] };
    const me = CARS.find(c => c.id === carId), others = CARS.filter(c => c.id !== carId);
    run.cars.push(makeCar(me, N - 2, -45, true, 1));
    others.forEach((d, i) => run.cars.push(makeCar(d, N - 4 - i * 2, i % 2 ? 45 : -45, false, 0.8 + i * 0.05)));
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;           // 固定种子:每次环形山位置相同
    for (let i = 0; i < 260; i++) run.craters.push({ x: (rnd() - 0.5) * 4600, y: (rnd() - 0.5) * 3400, r: 14 + rnd() * 70 });
    for (let i = 0; i < 90; i++) run.parts.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() });
    document.getElementById('end').hidden = true;
    document.getElementById('env').innerHTML = '<b>' + env.name + '</b> · 重力 ' + env.g + ' m/s² · ' + env.temp + '<br>' + env.atm + ' · ' + env.note;
    raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); run = null; }
  return { start, stop, keys, LAPS, debug: () => run };   // debug 仅供测试使用
})();
