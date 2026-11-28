/**
 * race/js/engine.js — 赛车引擎(俯视视角,Canvas)
 * 依赖:data.js(CARS, PLANETS)
 * 提供:Race.start(carId, planetKey, onFinish) / Race.stop() / Race.keys(按键状态)
 * 结构:赛道生成 → 车辆物理 → AI → 环境绘制 → 主循环
 */
const Race = (function () {
  const LAPS = 3, N_PER_SEG = 24;
  const CS = 1.7, RC = 22, OFFS = [-26, 0, 26];                    // 车身放大 1.7 倍;碰撞用沿车身排列的 3 个圆(半径 RC)
  const PCOL = ['#ff5d5d', '#4ade80', '#60a5fa', '#fbbf24'];       // 玩家颜色 P1–P4
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const pk = [0, 1, 2, 3].map(() => ({ left: false, right: false, gas: false, brake: false })), keys = pk[0];   // 每位玩家一组按键;keys 是玩家 1(触屏按钮用)
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
  /** 车型 + 驾驶员倍率 → 实际属性(复制一份,不改原始数据) */
  function withDriver(def, drv) {
    const d = Object.assign({}, def), m = (drv && drv.mods) || {};
    ['power', 'turn', 'grip', 'maxv', 'off'].forEach(k => { if (m[k]) d[k] *= m[k]; });
    if (m.windRes) d.windRes = Math.min(0.95, d.windRes + m.windRes);
    return d;
  }
  const avatars = {};                                              // 头像图片缓存(玄凤鹦鹉照片)
  function avatar(drv) { if (drv.img && !avatars[drv.id]) { const i = new Image(); i.src = drv.img; avatars[drv.id] = i; } return avatars[drv.id]; }
  /** 画驾驶员头像:白底圆 + 图片或 emoji;r 为半径,调用前要保证坐标系是“屏幕正向” */
  function drawAvatar(drv, r) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    const im = avatar(drv);
    if (im && im.complete && im.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, 7); ctx.clip(); ctx.drawImage(im, -r, -r, 2 * r, 2 * r); ctx.restore(); }
    else { ctx.font = Math.round(r * 1.5) + 'px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(drv.emoji, 0, 2); }
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  }
  function makeCar(def0, idx, lane, isPlayer, skill, drv, pidx) {
    const def = withDriver(def0, drv);
    const T = run.track, N = T.length, p = T[idx], q = T[(idx + 1) % N];
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    return { def, isPlayer, skill, x: p[0] + Math.cos(a + Math.PI / 2) * lane, y: p[1] + Math.sin(a + Math.PI / 2) * lane,
             a, vx: 0, vy: 0, idx, lap: -1, driver: drv, prog: 0, off: false, done: false, time: 0, pidx, spin: 0, score: 0, got: [], target: null, shake: 0, cool: 0, ccool: 0 };
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
    c.a += (c.spin || 0) * dt; c.spin *= Math.exp(-3 * dt);          // 撞车后的旋转
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
      run.obst.push({ bx, by, nx: n[0], ny: n[1], off, r: 17 + rnd() * 9, kind: rnd() < 0.5 ? 0 : 1, mv, amp: run.road * 0.45, f: 0.6 + rnd(), ph: rnd() * 6.28, x, y, hit: 0 }); break;
    }
    const pool = WORDS.slice().sort(() => rnd() - 0.5);
    for (let k = 0; k < trk.words; k++) for (let tr = 0; tr < 30; tr++) {
      const idx = Math.min(N - 16, 16 + Math.floor(((k + 0.2 + rnd() * 0.6) / trk.words) * (N - 32))), n = nrm(idx), off = (rnd() * 2 - 1) * run.road * 0.55;
      const x = T[idx][0] + n[0] * off, y = T[idx][1] + n[1] * off; if (!free(x, y)) continue; used.push([x, y]);
      run.words.push({ x, y, w: pool[k % pool.length], got: false }); break;
    }
    pickAll();
  }
  function pickTarget(c) { const left = run.words.filter(w => !w.got); c.target = left.length ? left[Math.floor(Math.random() * left.length)] : null; }
  function pickAll() { run.players.forEach(pickTarget); }
  function toast(c, html, ms) { const t = c.toastEl; if (!t) return; t.innerHTML = html; t.style.opacity = 1; clearTimeout(c.tt); c.tt = setTimeout(() => { t.style.opacity = 0; }, ms || 1800); }
  function speak(w) { if (!run.opts.speak || !window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(w); u.lang = 'en-US'; u.rate = 0.85; speechSynthesis.speak(u); }

  const circles = c => { const fx = Math.cos(c.a), fy = Math.sin(c.a); return OFFS.map(o => [c.x + fx * o, c.y + fy * o]); };
  function spark(x, y, n, spd) { for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, v = (0.3 + Math.random()) * spd; run.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.3 }); } }
  function shakeNear(x, y, amt) { run.cars.forEach(c => { if (c.isPlayer && Math.hypot(c.x - x, c.y - y) < 700) c.shake = Math.max(c.shake, amt); }); }
  /** 车与车碰撞:3 圆 + 质量冲量(卡车重、悬浮车轻),撞后会弹开并旋转,冒火花、震屏、发出撞击声 */
  function carCollide(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y; if (dx * dx + dy * dy > 110 * 110) return;
    const ca = circles(a), cb = circles(b); let best = null;
    for (const p of ca) for (const q of cb) { const ddx = q[0] - p[0], ddy = q[1] - p[1], d = Math.hypot(ddx, ddy); if (d < 2 * RC && (!best || d < best.d)) best = { d, nx: ddx / (d || 1), ny: ddy / (d || 1), px: (p[0] + q[0]) / 2, py: (p[1] + q[1]) / 2 }; }
    if (!best) return;
    const ma = a.def.mass || 1, mb = b.def.mass || 1, pen = 2 * RC - best.d, tot = ma + mb;
    a.x -= best.nx * pen * mb / tot; a.y -= best.ny * pen * mb / tot; b.x += best.nx * pen * ma / tot; b.y += best.ny * pen * ma / tot;
    const vn = (b.vx - a.vx) * best.nx + (b.vy - a.vy) * best.ny;
    if (vn >= 0) return;
    const j = -(1.55) * vn / (1 / ma + 1 / mb);
    a.vx -= j * best.nx / ma; a.vy -= j * best.ny / ma; b.vx += j * best.nx / mb; b.vy += j * best.ny / mb;
    const tq = (c, fx, fy) => (best.px - c.x) * fy - (best.py - c.y) * fx;                 // 力矩 = r × F
    a.spin += tq(a, -j * best.nx, -j * best.ny) * 0.0006 / ma; b.spin += tq(b, j * best.nx, j * best.ny) * 0.0006 / mb;
    const imp = -vn;
    if (imp > 40 && !(a.ccool > 0 && b.ccool > 0)) {
      a.ccool = b.ccool = 0.25; spark(best.px, best.py, Math.min(24, 4 + imp / 25), 140 + imp * 0.6);
      shakeNear(best.px, best.py, Math.min(0.6, imp / 500)); Music.sfx(imp > 200 ? 'crash' : 'bump', Math.min(1, imp / 300));
      if (imp > 150) [a, b].forEach(c => { if (c.isPlayer) toast(c, '💥 撞车!', 700); });
    }
  }
  /** 每帧:移动障碍、碰撞(撞到减速;玩家扣分)、车与车碰撞、收集单词牌(玩家加分) */
  function interact(dt) {
    for (const o of run.obst) {
      if (o.mv) { const d = o.off + o.amp * Math.sin(run.t * o.f + o.ph); o.x = o.bx + o.nx * d; o.y = o.by + o.ny * d; }
      if (o.hit > 0) o.hit -= dt;
    }
    for (const c of run.cars) {
      if (c.cool > 0) c.cool -= dt; if (c.ccool > 0) c.ccool -= dt; if (c.shake > 0) c.shake -= dt;
      for (const o of run.obst) for (const q of circles(c)) {
        const dx = q[0] - o.x, dy = q[1] - o.y, d = Math.hypot(dx, dy), R = o.r + RC;
        if (d < R) {
          const ux = dx / (d || 1), uy = dy / (d || 1); c.x += ux * (R - d); c.y += uy * (R - d);         // 顶出去,避免穿过去
          if (!(c.cool > 0)) { c.cool = 0.5; const sp = c.speed || 0; c.vx *= 0.35; c.vy *= 0.35; o.hit = 0.5; c.spin += (Math.random() - 0.5) * 2;
            spark(q[0] - ux * RC, q[1] - uy * RC, 8, 160); if (sp > 120) Music.sfx('bump', Math.min(1, sp / 400));
            if (c.isPlayer) { c.score = Math.max(0, c.score - 5); c.shake = 0.35; toast(c, '💥 撞到障碍 −5 分', 900); } }
        }
      }
      if (c.isPlayer) for (const w of run.words) {
        if (w.got || Math.hypot(c.x - w.x, c.y - w.y) > 66) continue;
        w.got = true; const isT = c.target === w, pts = isT ? 30 : 10; c.score += pts; c.got.push(w.w);
        toast(c, (isT ? '🎯 ' : '✔ ') + '<b>' + w.w.en + '</b> = ' + w.w.zh + ' · ' + w.w.ja + '  <b>+' + pts + '</b>');
        Music.sfx('pick'); speak(w.w.en); run.players.forEach(p => { if (p.target === w) pickTarget(p); });
      }
    }
    for (let i = 0; i < run.cars.length; i++) for (let k = i + 1; k < run.cars.length; k++) carCollide(run.cars[i], run.cars[k]);
    run.sparks = run.sparks.filter(p => (p.life -= dt) > 0); run.sparks.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; });
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
    // 单词牌:上帝视角正常大小;驾驶员视角放大 2.4 倍,并反向旋转保持文字正立
    const big = run.view === 'driver', ws = big ? 2.4 : 1;
    ctx.font = '700 24px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const w of run.words) {                                                // 单词牌:只显示英文,捡到后才显示意思
      if (w.got) continue; const tw = ctx.measureText(w.w.en).width + 28, isT = run.viewer && run.viewer.target === w;
      ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(run.cr); ctx.scale(ws, ws);
      ctx.fillStyle = isT ? '#fff3b0' : '#ffffff'; ctx.strokeStyle = isT ? '#f59e0b' : '#3b82f6'; ctx.lineWidth = isT ? 6 : 4;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-tw / 2, -20, tw, 40, 14) : ctx.rect(-tw / 2, -20, tw, 40); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1e293b'; ctx.fillText(w.w.en, 0, 1); ctx.restore();
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
    ctx.save(); ctx.scale(CS, CS);
    if (c.def.hover) { ctx.fillStyle = 'rgba(56,189,248,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 20, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-23, -10, 48, 26);                              // 影子
    ctx.fillStyle = c.def.color; ctx.fillRect(-24, -13, 48, 26);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-24, -13, 48, 5);                         // 车身高光
    ctx.fillStyle = '#0b1220'; ctx.fillRect(2, -9, 14, 18); ctx.fillStyle = '#fff3a0'; ctx.fillRect(22, -10, 3, 5); ctx.fillRect(22, 5, 3, 5);
    ctx.fillStyle = '#ff3b3b'; ctx.fillRect(-25, -11, 2, 4); ctx.fillRect(-25, 7, 2, 4);             // 尾灯
    if (c.isPlayer) { ctx.strokeStyle = PCOL[c.pidx]; ctx.lineWidth = 3; ctx.strokeRect(-24, -13, 48, 26); }
    ctx.restore();
    if (c.driver) { ctx.rotate(-c.a - run.rot); ctx.translate(-3, 0); drawAvatar(c.driver, run.view === 'driver' ? 24 : 20); }   // 头像保持正立
    ctx.restore();
    if (c.isPlayer && run.players.length > 1) {                                                      // P1/P2… 标签(屏幕正向)
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(run.cr); ctx.translate(0, -48); ctx.fillStyle = PCOL[c.pidx]; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.font = '800 20px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText('P' + (c.pidx + 1), 0, 0); ctx.fillText('P' + (c.pidx + 1), 0, 0); ctx.restore();
    }
  }
  function drawSparks() { ctx.lineWidth = 3; ctx.lineCap = 'round'; for (const p of run.sparks) { ctx.strokeStyle = p.life > 0.3 ? '#fff6b0' : '#ff9a2e'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke(); } }
  function updateFx(env, dt) {
    for (const p of run.parts) {
      p.x -= (Math.sin(run.t * 0.3) * env.wind * 2 + 60 + (env.fx === 'wind' ? 400 : 0)) * dt * p.s; p.y += (p.s - 0.5) * 30 * dt;
      if (p.x < 0) { p.x = W; p.y = Math.random() * H; }
    }
    if (env.fx === 'lightning') { if (Math.random() < 0.004) run.flash = 1; if (run.flash > 0) run.flash -= dt * 4; }
  }
  function drawFx(env) {                                                // 屏幕空间粒子:沙尘/风线/闪电/雾(调用前已把坐标系映射到视口)
    for (const p of run.parts) {
      if (env.fx === 'dust') { ctx.fillStyle = 'rgba(230,160,110,.35)'; ctx.fillRect(p.x, p.y, 3, 3); }
      else if (env.fx === 'wind') { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 40 * p.s, p.y); ctx.stroke(); }
    }
    if (env.fog) { ctx.fillStyle = env.fog; ctx.fillRect(0, 0, W, H); }
    if (env.fx === 'lightning' && run.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (run.flash * 0.35) + ')'; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- 4. 主循环(1–4 个玩家 = 1–4 个分屏视口)----------
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; if (run) layoutUI(); }
  addEventListener('resize', resize);
  function viewports(n) {
    if (n === 1) return [{ x: 0, y: 0, w: W, h: H }];
    if (n === 2) return W >= H * 0.9 ? [{ x: 0, y: 0, w: W / 2, h: H }, { x: W / 2, y: 0, w: W / 2, h: H }] : [{ x: 0, y: 0, w: W, h: H / 2 }, { x: 0, y: H / 2, w: W, h: H / 2 }];
    return [0, 1, 2, 3].slice(0, n).map(i => ({ x: (i % 2) * W / 2, y: (i >> 1) * H / 2, w: W / 2, h: H / 2 }));
  }
  /** 为每位玩家建立 HUD / 提示 DOM,并按视口定位 */
  function buildUI() {
    const box = document.getElementById('vpui'); box.innerHTML = '';
    run.players.forEach(p => {
      p.hudEl = document.createElement('div'); p.hudEl.className = 'phud'; p.toastEl = document.createElement('div'); p.toastEl.className = 'ptoast';
      box.append(p.hudEl, p.toastEl);
    });
    layoutUI();
  }
  function layoutUI() {
    const vps = run.vps = viewports(run.players.length), multi = run.players.length > 1;
    document.getElementById('hud').style.display = 'none';
    document.getElementById('env').style.display = multi ? 'none' : '';
    run.players.forEach((p, i) => { const v = vps[i];
      p.hudEl.style.cssText = 'left:' + v.x + 'px;top:' + v.y + 'px;width:' + v.w + 'px;' + (multi ? 'font-size:12px;' : '');
      p.toastEl.style.cssText = 'left:' + (v.x + v.w / 2) + 'px;top:' + (v.y + v.h - (multi ? 40 : 76)) + 'px;' + (multi ? 'font-size:14px;' : ''); });
  }
  function hud(p, rank, total) {
    const multi = run.players.length > 1, s = (Music.info && Music.info().season) || '';
    p.hudEl.innerHTML = (multi ? '<span style="color:' + PCOL[p.pidx] + '"><b>P' + (p.pidx + 1) + ' ' + p.driver.name + '</b></span>' : '') +
      '<span>第 ' + Math.min(LAPS, Math.max(1, p.lap + 1)) + ' / ' + LAPS + ' 圈</span><span>名次 ' + rank + ' / ' + total + '</span><span>' + Math.round(p.speed || 0) + ' km/h</span>' +
      (multi && p.pidx ? '' : '<span>' + run.time.toFixed(1) + ' 秒</span>') + '<span>得分 ' + p.score + '</span><span>🎯 ' + (p.target ? p.target.w.zh + '(' + p.target.w.ja + ')' : '全部收集!') + '</span>' + (s && p.pidx === 0 ? '<span>' + s + '</span>' : '');
  }
  function padInput(i) {
    const g = navigator.getGamepads && navigator.getGamepads()[i]; if (!g) return null;
    const ax = g.axes[0] || 0, b = k => g.buttons[k] && g.buttons[k].pressed;
    return { left: ax < -0.3 || b(14), right: ax > 0.3 || b(15), gas: b(0) || b(7) || b(12), brake: b(1) || b(6) || b(13) };
  }
  function inputOf(c) {
    const k = pk[c.pidx], g = padInput(c.pidx); if (!g) return k;
    return { left: k.left || g.left, right: k.right || g.right, gas: k.gas || g.gas, brake: k.brake || g.brake };
  }
  function renderView(me, vp, env, nPl) {
    const dt = run.dt;
    ctx.save(); ctx.beginPath(); ctx.rect(vp.x, vp.y, vp.w, vp.h); ctx.clip();
    const zf = nPl === 1 ? 1 : Math.max(0.6, Math.min(1, Math.sqrt(vp.w * vp.h / (W * H)) * 1.15));
    const sh = me.shake > 0 ? () => (Math.random() - 0.5) * me.shake * 30 : () => 0;
    run.viewer = me;
    let z;
    ctx.save();
    if (run.view === 'driver') {                                   // 驾驶员视角:车头朝上、拉近,车在视口下方
      z = (1.3 - Math.min(0.3, (me.speed || 0) / 2200)) * zf;
      run.rot = -Math.PI / 2 - me.a; run.cr = -run.rot;
      ctx.translate(vp.x + vp.w / 2 + sh(), vp.y + vp.h * 0.72 + sh()); ctx.rotate(run.rot); ctx.scale(z, z); ctx.translate(-me.x, -me.y);
      drawGround(env, me.x, me.y, z * 0.42);
    } else {                                                       // 上帝视角:正北朝上、拉远,看到整段赛道
      z = (0.62 - Math.min(0.15, (me.speed || 0) / 4200)) * zf;
      run.rot = 0; run.cr = 0;
      ctx.translate(vp.x + vp.w / 2 + sh(), vp.y + vp.h / 2 + sh()); ctx.scale(z, z); ctx.translate(-me.x, -me.y);
      drawGround(env, me.x, me.y, z);
    }
    drawRoad(env); drawItems(env); run.cars.slice().reverse().forEach(drawCar); drawSparks();
    ctx.restore();
    ctx.save(); ctx.translate(vp.x, vp.y); ctx.scale(vp.w / W, vp.h / H); drawFx(env); ctx.restore();
    if (nPl === 1 && run.view === 'driver' && me.driver) { ctx.save(); ctx.translate(58, H - 140); drawAvatar(me.driver, 38); ctx.fillStyle = '#fff'; ctx.font = '700 14px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(me.driver.name, 0, 56); ctx.restore(); }
    ctx.restore();
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - run.last) / 1000); run.last = now; run.t += dt; run.dt = dt;
    const env = run.env, N = run.track.length;
    if (run.count > 0) { run.count -= dt; document.getElementById('count').textContent = run.count > 0 ? Math.ceil(run.count) : 'GO!'; }
    else { run.time += dt; run.count -= dt; if (run.count > -0.8) document.getElementById('count').textContent = 'GO!'; else document.getElementById('count').textContent = ''; }
    const go = run.count <= 0;
    for (const c of run.cars) {
      if (c.done) { physics(c, dt, { gas: false, brake: true }, env); continue; }
      const input = c.isPlayer ? inputOf(c) : ai(c);
      if (go) physics(c, dt, input, env); else { c.speed = 0; }
      track(c);
      if (go && !c.done && c.prog >= LAPS * N) { c.done = true; c.time = run.time; run.finish.push(c); if (c.isPlayer && run.endAt == null) run.endAt = run.time + 15; }
    }
    interact(dt); updateFx(env, dt);
    const order = run.cars.slice().sort((a, b) => b.prog - a.prog);
    run.players.forEach(p => hud(p, order.indexOf(p) + 1, order.length));
    // 绘制
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const n = run.players.length; run.vps = viewports(n);
    run.players.forEach((p, i) => renderView(p, run.vps[i], env, n));
    if (n > 1) {                                                   // 分隔线;3 人时第 4 格显示排名
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; run.vps.forEach(v => ctx.strokeRect(v.x, v.y, v.w, v.h));
      if (n === 3) { ctx.fillStyle = '#0b1220'; ctx.fillRect(W / 2, H / 2, W / 2, H / 2); ctx.fillStyle = '#fff'; ctx.font = '700 18px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('实时排名', W / 2 + 20, H / 2 + 16); order.forEach((c, k) => { ctx.fillStyle = c.isPlayer ? PCOL[c.pidx] : '#cbd5e1'; ctx.fillText((k + 1) + '. ' + (c.isPlayer ? 'P' + (c.pidx + 1) + ' ' : '电脑 ') + c.driver.name + (c.done ? ' ✔' : ''), W / 2 + 20, H / 2 + 50 + k * 28); }); }
    }
    const humansDone = run.players.every(p => p.done);
    if (!run.ended && (humansDone || (run.endAt != null && run.time > run.endAt))) { run.ended = true; setTimeout(endRace, 900); }
    raf = requestAnimationFrame(frame);
  }
  function endRace() {
    if (!run) return;
    const list = run.cars.slice().sort((a, b) => (b.done - a.done) || (a.done ? a.time - b.time : b.prog - a.prog));
    document.getElementById('endlist').innerHTML = list.map(c => '<li>' + (c.isPlayer ? '<b style="color:' + PCOL[c.pidx] + '">' : '') + (c.isPlayer ? 'P' + (c.pidx + 1) + ' ' + c.driver.name + ' · ' : '') + c.def.name + (c.isPlayer && run.players.length === 1 ? '(你)' : '') + (c.isPlayer ? '</b>' : '') + ' — ' + (c.done ? c.time.toFixed(1) + ' 秒' : '未完赛') + '</li>').join('');
    const key = 'race-best-' + run.trackId; let best = 0, lines = [], allWords = [];
    run.players.forEach(p => {
      const rank = list.indexOf(p) + 1, bonus = [0, 50, 30, 15, 0][rank] || 0, total = p.score + bonus; if (total > best) best = total; allWords = allWords.concat(p.got);
      lines.push((run.players.length > 1 ? '<span style="color:' + PCOL[p.pidx] + '">P' + (p.pidx + 1) + ' ' + p.driver.name + '</span> ' : '') + '<b>得分 ' + total + '</b>(单词和障碍 ' + p.score + ' + 名次奖励 ' + bonus + ')');
    });
    let rec = 0; try { rec = +(localStorage.getItem(key) || 0); if (best > rec) { rec = best; localStorage.setItem(key, rec); } } catch (e) { rec = best; }
    document.getElementById('endscore').innerHTML = lines.join('<br>') + '<br>本赛道最高分 ' + rec;
    document.getElementById('endwords').innerHTML = allWords.length ? '<b>这局学到的单词(' + allWords.length + ' 个)</b><br>' + allWords.map(w => w.en + ' ' + w.zh + ' ' + w.ja).join(' · ') : '这局没有收集到单词,下次试试!';
    document.getElementById('end').hidden = false;
    run.onFinish && run.onFinish(list.indexOf(run.players[0]) + 1);
  }

  /** opts: { speak, view('god' | 'driver'), ai(true=电脑车手补满 4 辆), players:[{driver(DRIVERS 的 id), car(CARS 的 id)}](1–4 人),
   *          driver(单人旧写法) }  —— 单人时可只传 carId */
  function start(carId, planetKey, trackId, opts) {
    stop(); resize(); opts = opts || {};
    const env = PLANETS[planetKey], trk = TRACKS[trackId] || TRACKS.easy, track = buildTrack(trk.ctrl), N = track.length;
    const plist = (opts.players && opts.players.length ? opts.players : [{ driver: opts.driver, car: carId }]).slice(0, 4);
    run = { env, track, road: trk.road, trackId, opts, t: 0, time: 0, dt: 0, count: 3.5, last: performance.now(), flash: 0, finish: [], cars: [], craters: [], parts: [], sparks: [], obst: [], words: [], view: opts.view || 'god', rot: 0, cr: 0, players: [], viewer: null, endAt: null };
    const used = [];
    plist.forEach((pl, i) => {
      const def = CARS.find(c => c.id === pl.car) || CARS[i % CARS.length], drv = DRIVERS.find(d => d.id === pl.driver) || DRIVERS[i % DRIVERS.length];
      used.push(drv); const c = makeCar(def, N - 2 - i * 4, (i % 2 ? 1 : -1) * 55, true, 1, drv, i); run.cars.push(c); run.players.push(c);
    });
    const nAI = opts.ai === false ? 0 : Math.max(0, 4 - plist.length), otherDrv = DRIVERS.filter(d => !used.includes(d)), pool = CARS.filter(c => !plist.some(p => p.car === c.id));
    for (let i = 0; i < nAI; i++) run.cars.push(makeCar((pool.length ? pool : CARS)[i % (pool.length ? pool.length : CARS.length)], N - 2 - (plist.length + i) * 4, ((plist.length + i) % 2 ? 1 : -1) * 55, false, 0.8 + i * 0.05, (otherDrv.length ? otherDrv : DRIVERS)[i % (otherDrv.length ? otherDrv.length : DRIVERS.length)], -1));
    DRIVERS.forEach(avatar);
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;           // 固定种子:每次环形山位置相同
    spawn(trk);
    for (let i = 0; i < 420; i++) run.craters.push({ x: (rnd() - 0.5) * 6200, y: (rnd() - 0.5) * 4600, r: 14 + rnd() * 70 });
    for (let i = 0; i < 90; i++) run.parts.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() });
    document.getElementById('end').hidden = true; buildUI();
    document.getElementById('env').innerHTML = '<b>' + env.name + '</b> · 重力 ' + env.g + ' m/s² · ' + env.temp + '<br>' + env.atm + ' · ' + env.note;
    raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); run = null; const b = document.getElementById('vpui'); if (b) b.innerHTML = ''; }
  function setView(v) { if (run) run.view = v; }
  function getView() { return run ? run.view : 'god'; }
  return { start, stop, keys, pk, LAPS, setView, getView, debug: () => run };   // debug 仅供测试使用
})();
