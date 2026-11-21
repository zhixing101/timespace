/**
 * space/js/engine.js — 星际旅行引擎
 * 两个视角:
 *   god(上帝视角)  俯视整个星空,跟着飞船走,能看到行星、星座、小行星带、柯伊伯带,右上角有小地图和目标箭头
 *   driver(驾驶员视角) 坐在驾驶舱里,透过玻璃看外面(透视投影),能看到仪表盘、雷达、驾驶员和副驾驶
 * 世界是二维平面(x,y),驾驶员视角里用 z(高度)做出一点立体感。
 * 依赖:data.js(CRAFTS、buildWorld、DRIVERS)
 */
const Space = (function () {
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const keys = { left: false, right: false, gas: false, brake: false, boost: false };
  let W = 0, H = 0, dpr = 1, raf = 0, run = null;
  const TAU = Math.PI * 2, hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177 | 0; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
  const avatars = {};
  function avatar(d) { if (d.img && !avatars[d.id]) { const i = new Image(); i.src = d.img; avatars[d.id] = i; } return avatars[d.id]; }
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; }
  addEventListener('resize', () => { if (run) resize(); });

  // ---------- 1. 工具:头像、星球、发光 ----------
  function drawAvatar(d, r) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    const im = avatar(d);
    if (im && im.complete && im.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, 7); ctx.clip(); ctx.drawImage(im, -r, -r, 2 * r, 2 * r); ctx.restore(); }
    else { ctx.font = Math.round(r * 1.5) + 'px system-ui,"Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(d.emoji, 0, 2); }
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  }
  function glow(x, y, r, c0, c1) { const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r)); g.addColorStop(0, c0); g.addColorStop(1, c1 || 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, Math.max(1, r), 0, 7); ctx.fill(); }
  function shade(c, k) { const n = parseInt(c.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; }
  /** 在屏幕坐标 (x,y) 画半径 r 的天体;spin 用于木星条纹 */
  function body(o, x, y, r) {
    if (o.k === 'sun') { glow(x, y, r * 2.2, 'rgba(255,200,80,.45)'); glow(x, y, r, '#fff6c0', '#ffb521'); return; }
    if (o.k === 'neb') { for (let i = 0; i < 6; i++) glow(x + Math.cos(i * 1.2) * r * .35, y + Math.sin(i * 1.7) * r * .3, r * (.6 + .1 * i % .4), 'rgba(' + o.col + ',.30)'); for (let i = 0; i < 4; i++) glow(x - r * .1 + i * r * .08, y - r * .1 + (i % 2) * r * .06, Math.max(2, r * .05), '#fff', 'rgba(255,255,255,0)'); return; }
    if (o.k === 'galaxy') { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5); ctx.scale(1, 0.4); glow(0, 0, r * 1.3, 'rgba(' + o.col + ',.5)'); for (let i = 0; i < 90; i++) { const a = i * 2.4, d = r * (i / 90), th = a + d / r * 4; ctx.fillStyle = 'rgba(220,230,255,.8)'; ctx.fillRect(Math.cos(th) * d, Math.sin(th) * d, 2, 2); } glow(0, 0, r * .25, 'rgba(255,240,200,.95)'); ctx.restore(); return; }
    if (o.k === 'star') { glow(x, y, r * 2.4, 'rgba(255,255,255,.35)'); glow(x, y, r, '#fff', o.col); return; }
    if (o.k === 'rock') { ctx.fillStyle = o.col; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, q = r * (.78 + .3 * Math.sin(o.ph * 3 + i * 2.1)); ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); ctx.fill(); ctx.stroke(); return; }
    // 行星:渐变球体 + 简单装饰
    const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r); g.addColorStop(0, shade(o.col, 1.35)); g.addColorStop(1, shade(o.col, .55));
    if (o.ring) { ctx.strokeStyle = 'rgba(235,215,160,.85)'; ctx.lineWidth = Math.max(2, r * .16); ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * .55, -.3, Math.PI, TAU); ctx.stroke(); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (o.id === 'jupiter') { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.fillStyle = 'rgba(150,90,50,.35)'; [-.45, -.1, .3].forEach(q => ctx.fillRect(x - r, y + q * r, r * 2, r * .18)); ctx.fillStyle = 'rgba(200,70,50,.7)'; ctx.beginPath(); ctx.ellipse(x + r * .25, y + r * .35, r * .18, r * .1, 0, 0, 7); ctx.fill(); ctx.restore(); }
    if (o.id === 'earth') { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.fillStyle = 'rgba(70,170,80,.8)'; ctx.beginPath(); ctx.ellipse(x - r * .25, y - r * .1, r * .35, r * .25, .5, 0, 7); ctx.ellipse(x + r * .3, y + r * .3, r * .22, r * .3, 0, 0, 7); ctx.fill(); ctx.restore(); }
    if (o.ring) { ctx.strokeStyle = 'rgba(235,215,160,.9)'; ctx.lineWidth = Math.max(2, r * .16); ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * .55, -.3, 0, Math.PI); ctx.stroke(); }
  }
  function label(o, x, y, size, fy) { ctx.font = '700 ' + size + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,12,.85)'; ctx.strokeText(o.name.zh, x, y); ctx.fillStyle = o.visited ? '#7CFFB2' : '#ffffff'; ctx.fillText(o.name.zh, x, y);
    ctx.font = (size * .72) + 'px system-ui,sans-serif'; ctx.fillStyle = 'rgba(190,205,240,.9)'; ctx.fillText(o.name.en, x, y + size * .95); }

  // ---------- 2. 开始 / 物理 ----------
  function start(craftId, missionId, opts) {
    stop(); resize();
    const C0 = CRAFTS.find(c => c.id === craftId) || CRAFTS[0], drv = DRIVERS.find(d => d.id === (opts && opts.driver)) || DRIVERS[0];
    const m = drv.mods || {}, C = Object.assign({}, C0);
    C.thrust *= (m.power || 1); C.maxv *= (m.maxv || 1); C.turn *= (m.turn || 1); C.brake *= (m.grip || 1);
    C.dmg = (m.off || 1) * (1 - (m.windRes || 0));                       // 恐龙:皮厚,撞击伤害更小
    const world = buildWorld(missionId), st = world.start, co = DRIVERS.filter(d => d !== drv)[1];
    if (opts && opts.from) { const b = world.objs.find(o => o.id === opts.from); if (b) { const a = Math.atan2(b.y, b.x), d = b.r + (b.k === 'sun' ? 700 : 420); st.x = b.x + Math.cos(a) * d; st.y = b.y + Math.sin(a) * d; st.a = a; if (b.id === 'moon') { st.x = b.x + 120; st.y = b.y - 60; } } }   // 从指定天体附近出发
    run = { C, C0, drv, co, world, opts: opts || {}, view: (opts && opts.view) || 'god', t: 0, time: 0, count: 3, last: performance.now(), score: 0, learned: [], toast: 0, hit: 0, shake: 0, flash: 0,
      me: { x: st.x, y: st.y, a: st.a, vx: 0, vy: 0, speed: 0 }, shield: C.shield, fuel: C.fuel, boosting: false, dead: 0, cp: { x: st.x, y: st.y, a: st.a }, done: false, sky: [], missionId, rot: 0 };
    for (let i = 0; i < 260; i++) run.sky.push([Math.random() * TAU, (Math.random() - 0.5) * 1.1, Math.random() * 1.6 + 0.4, Math.random()]);
    run.stops = world.objs.filter(o => o.stop); run.stops.forEach(o => { o.visited = false; });
    DRIVERS.forEach(avatar);
    document.getElementById('end').hidden = true;
    document.getElementById('env').innerHTML = '<b>' + C0.name + '</b> · 驾驶员:' + drv.name + '<br>' + MISSIONS.find(x => x.id === missionId).desc;
    raf = requestAnimationFrame(frame);
  }
  function toast(html, ms) { const t = document.getElementById('toast'); t.innerHTML = html; t.style.opacity = 1; clearTimeout(run.tt); run.tt = setTimeout(() => { t.style.opacity = 0; }, ms || 4200); }
  function speak(w) { if (!run.opts.speak || !window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(w); u.lang = 'en-US'; u.rate = .9; speechSynthesis.speak(u); }
  function physics(dt) {
    const me = run.me, C = run.C;
    if (keys.left) me.a -= C.turn * 2.1 * dt; if (keys.right) me.a += C.turn * 2.1 * dt;
    run.boosting = keys.boost && run.fuel > 2 && keys.gas;
    const pw = C.thrust * 330 * (run.boosting ? C.boost : 1);
    if (keys.gas) { me.vx += Math.cos(me.a) * pw * dt; me.vy += Math.sin(me.a) * pw * dt; }
    if (keys.brake) { const k = Math.exp(-2.2 * C.brake * dt); me.vx *= k; me.vy *= k; }
    const dr = Math.exp(-0.10 * dt); me.vx *= dr; me.vy *= dr;          // 太空里几乎没有阻力:松开油门会一直滑行
    const sp = Math.hypot(me.vx, me.vy), vmax = C.maxv * (run.boosting ? 1.7 : 1);
    if (sp > vmax) { const k = 1 - Math.min(1, 3 * dt) * (1 - vmax / sp); me.vx *= k; me.vy *= k; }
    if (run.boosting) run.fuel = Math.max(0, run.fuel - 26 * dt); else run.fuel = Math.min(C.fuel, run.fuel + 9 * dt);
    me.x += me.vx * dt; me.y += me.vy * dt; me.speed = Math.hypot(me.vx, me.vy);
  }
  function damage(n) { run.shield = Math.max(0, run.shield - n * run.C.dmg); run.hit = 0.6; run.shake = 0.3; run.flash = 1; }
  function interact(dt) {
    const me = run.me; run.hit = Math.max(0, run.hit - dt); run.flash = Math.max(0, run.flash - dt * 2.5);
    for (const o of run.world.objs) {
      if (o.k === 'rock' || o.k === 'planet' || o.k === 'sun') {
        const dx = me.x - o.x, dy = me.y - o.y, d = Math.hypot(dx, dy) || 1, R = o.r + 16;
        if (d < R) { const nx = dx / d, ny = dy / d, vn = me.vx * nx + me.vy * ny;
          if (vn < 0) { me.vx -= 1.7 * vn * nx; me.vy -= 1.7 * vn * ny; }
          me.x = o.x + nx * R; me.y = o.y + ny * R;
          if (run.hit <= 0) { damage(o.k === 'sun' ? 40 : Math.min(40, 6 + me.speed * (o.k === 'rock' ? .035 : .05))); if (o.k !== 'sun') run.score = Math.max(0, run.score - 5); toast('💥 撞到了' + (o.name ? o.name.zh : '岩石') + '!护盾 −', 1200); } }
        if (o.k === 'sun' && d < R + 380 && run.hit <= 0 && d >= R) { damage(2 * dt * 30); run.hit = 0.1; }   // 太阳附近很烫:护盾持续下降
      }
      if (o.stop && !o.visited) {
        let near = false;
        if (o.k === 'belt') { const d = Math.hypot(me.x, me.y); near = d > o.r0 && d < o.r1; }
        else near = Math.hypot(me.x - o.x, me.y - o.y) < (o.trig || o.r + 150);
        if (near) { o.visited = true; run.score += o.k === 'star' ? 60 : 100; run.learned.push(o);
          toast('<b>' + o.name.zh + '</b> · ' + o.name.en + ' · ' + o.name.ja + '<br><span style="font-weight:400;font-size:14px">' + (o.fact || '') + '</span> <b>+' + (o.k === 'star' ? 60 : 100) + '</b>', 5200); speak(o.name.en);
          const left = run.stops.filter(x => !x.visited).length; if (!left) { run.done = true; run.doneT = 1.4; } }
      }
    }
    if (run.shield <= 0) { run.dead += 1; run.shield = run.C.shield * 0.6; run.score = Math.max(0, run.score - 50); const c = run.cp; Object.assign(run.me, { x: c.x, y: c.y, a: c.a, vx: 0, vy: 0 }); toast('🛟 护盾耗尽,被拖回出发点(−50 分)', 2600); }
  }
  const nextTarget = () => { const me = run.me; let b = null, bd = 1e12; run.stops.forEach(o => { if (o.visited) return; const p = o.k === 'belt' ? { x: Math.cos(Math.atan2(me.y, me.x)) * (o.r0 + o.r1) / 2, y: Math.sin(Math.atan2(me.y, me.x)) * (o.r0 + o.r1) / 2 } : o, d = Math.hypot(p.x - me.x, p.y - me.y); if (d < bd) { bd = d; b = { o, x: p.x, y: p.y, d }; } }); return b; };

  // ---------- 3. 上帝视角 ----------
  function sky2d(cx, cy) {            // 三层视差星空:近处的星动得快
    for (let l = 0; l < 3; l++) { const cell = 260, f = 0.12 + l * 0.14, ox = cx * f, oy = cy * f, i0 = Math.floor((ox - W / 2) / cell), i1 = Math.floor((ox + W / 2) / cell), j0 = Math.floor((oy - H / 2) / cell), j1 = Math.floor((oy + H / 2) / cell);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const h = hash(i + l * 77, j), x = (i + hash(i, j + 5)) * cell - ox + W / 2, y = (j + hash(j, i + 9)) * cell - oy + H / 2; ctx.globalAlpha = .35 + .5 * h; ctx.fillStyle = h > .8 ? '#ffe9b0' : '#fff'; ctx.fillRect(x, y, 1 + l * .8, 1 + l * .8); } }
    ctx.globalAlpha = 1;
  }
  function shipShape(C, a, x, y, s, flame) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    if (flame > 0) { const L = 16 + flame * 26 + Math.random() * 6; const g = ctx.createLinearGradient(-14, 0, -14 - L, 0); g.addColorStop(0, 'rgba(255,230,120,.95)'); g.addColorStop(1, 'rgba(255,90,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-14 - L, 0); ctx.lineTo(-14, 6); ctx.fill(); }
    ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 2; ctx.fillStyle = C.color;
    if (C.id === 'rocket') { ctx.beginPath(); ctx.moveTo(26, 0); ctx.quadraticCurveTo(14, -10, -14, -8); ctx.lineTo(-14, 8); ctx.quadraticCurveTo(14, 10, 26, 0); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-22, -16); ctx.lineTo(-6, -8); ctx.moveTo(-14, 8); ctx.lineTo(-22, 16); ctx.lineTo(-6, 8); ctx.fill(); ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(8, 0, 4, 0, 7); ctx.fill(); }
    else if (C.id === 'shuttle') { ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(10, -6); ctx.lineTo(-14, -7); ctx.lineTo(-14, 7); ctx.lineTo(10, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(-18, -22); ctx.lineTo(-14, -6); ctx.moveTo(-4, 6); ctx.lineTo(-18, 22); ctx.lineTo(-14, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f97316'; ctx.fillRect(-14, -3, 5, 6); }
    else if (C.id === 'ship') { ctx.beginPath(); ctx.ellipse(0, 0, 22, 12, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(56,189,248,.85)'; ctx.beginPath(); ctx.ellipse(6, 0, 9, 6, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#64748b'; ctx.fillRect(-10, -16, 8, 5); ctx.fillRect(-10, 11, 8, 5); }
    else { ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-10, -9); ctx.lineTo(-4, 0); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-6, 0, 14, 2.2, 4.1); ctx.stroke(); }
    ctx.restore();
  }
  function god() {
    const me = run.me, z = 0.5 - Math.min(0.2, me.speed / 3300), cx = me.x, cy = me.y, w2s = (x, y) => [(x - cx) * z + W / 2, (y - cy) * z + H / 2];
    ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, H); sky2d(cx, cy);
    const sx = run.shake > 0 ? (Math.random() - .5) * 14 : 0; ctx.save(); ctx.translate(sx, sx);
    // 轨道线
    run.world.orbits.forEach(r => { const [x, y] = w2s(0, 0); ctx.strokeStyle = 'rgba(120,140,200,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r * z, 0, 7); ctx.stroke(); });
    run.world.belts.forEach(b => { const [x, y] = w2s(0, 0); ctx.strokeStyle = b.id === 'kuiper' ? 'rgba(140,180,220,.10)' : 'rgba(180,160,120,.10)'; ctx.lineWidth = (b.r1 - b.r0) * z; ctx.beginPath(); ctx.arc(x, y, (b.r0 + b.r1) / 2 * z, 0, 7); ctx.stroke(); const lab = { name: b.name, visited: run.stops.find(s => s.id === b.id).visited }; const lx = x - Math.cos(0.9) * 0, ly = y + (b.r0 + b.r1) / 2 * z * 0; if (Math.abs(Math.hypot(me.x, me.y) - (b.r0 + b.r1) / 2) < 1800) { const a = Math.atan2(me.y, me.x) + 0.35, px = x + Math.cos(a) * (b.r1 + 220) * z, py = y + Math.sin(a) * (b.r1 + 220) * z; label(lab, px, py, 16); } });
    // 星座连线
    run.world.lines.forEach(l => { const a = w2s(l[0].x, l[0].y), b = w2s(l[1].x, l[1].y), on = l[0].visited && l[1].visited; ctx.strokeStyle = on ? 'rgba(255,240,160,.95)' : 'rgba(180,200,255,.18)'; ctx.lineWidth = on ? 3 : 1; ctx.setLineDash(on ? [] : [6, 8]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]); });
    // 天体
    const tgt = nextTarget();
    for (const o of run.world.objs) {
      if (o.k === 'belt') continue; const [x, y] = w2s(o.x, o.y), r = Math.max(o.k === 'star' ? 5 : 1.5, o.r * z), pad = r * 2.2 + 80; if (x < -pad || x > W + pad || y < -pad || y > H + pad) continue;
      if (o.k === 'label') { ctx.font = '700 22px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = o.col; ctx.globalAlpha = .8; ctx.fillText(o.name.zh + ' ' + o.name.en, x, y); ctx.globalAlpha = 1; continue; }
      body(o, x, y, r);
      if (o.name && o.k !== 'rock') label(o, x, y + r + 20, o.k === 'sun' || o.k === 'planet' ? 15 : 14);
      if (tgt && tgt.o === o) { ctx.strokeStyle = '#ffb454'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 14 + 4 * Math.sin(run.t * 6), 0, 7); ctx.stroke(); }
    }
    shipShape(run.C0, me.a, W / 2, H / 2, 1.15, keys.gas ? (run.boosting ? 1.6 : 0.8) : 0);
    ctx.save(); ctx.translate(W / 2, H / 2 - 34); ctx.scale(.55, .55); drawAvatar(run.drv, 18); ctx.restore();   // 飞船上方的小头像
    ctx.restore();
    if (tgt) { const a = Math.atan2(tgt.y - me.y, tgt.x - me.x); ctx.save(); ctx.translate(W / 2 + Math.cos(a) * 90, H / 2 + Math.sin(a) * 90); ctx.rotate(a); ctx.fillStyle = '#ffb454'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.fill(); ctx.restore(); }
    minimap(tgt);
  }
  function minimap(tgt) {
    const E = run.world.extent, w = Math.min(170, W * .32), h = w * (E.y1 - E.y0) / (E.x1 - E.x0), x0 = W - w - 12, y0 = 58, mx = x => x0 + (x - E.x0) / (E.x1 - E.x0) * w, my = y => y0 + (y - E.y0) / (E.y1 - E.y0) * h;
    ctx.fillStyle = 'rgba(4,8,24,.72)'; ctx.strokeStyle = 'rgba(120,150,230,.6)'; ctx.lineWidth = 1.5; ctx.fillRect(x0, y0, w, h); ctx.strokeRect(x0, y0, w, h);
    run.world.objs.forEach(o => { if (o.k === 'rock' || o.k === 'belt' || o.k === 'label') return; ctx.fillStyle = o.visited ? '#7CFFB2' : (o.k === 'sun' ? '#ffcc44' : o.k === 'star' ? '#ffe9a8' : o.k === 'neb' ? '#ff7ac0' : o.k === 'galaxy' ? '#b9c6ff' : '#9fc3ff'); ctx.beginPath(); ctx.arc(mx(o.x), my(o.y), o.k === 'sun' ? 3 : 2, 0, 7); ctx.fill(); });
    if (run.missionId === 'solar') run.world.belts.forEach(b => { ctx.strokeStyle = 'rgba(200,180,140,.35)'; ctx.beginPath(); ctx.arc(mx(0), my(0), (b.r0 + b.r1) / 2 / (E.x1 - E.x0) * w, 0, 7); ctx.stroke(); });
    if (tgt && Math.floor(run.t * 3) % 2) { ctx.strokeStyle = '#ffb454'; ctx.beginPath(); ctx.arc(mx(tgt.x), my(tgt.y), 6, 0, 7); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx(run.me.x), my(run.me.y), 3, 0, 7); ctx.fill();
  }

  // ---------- 4. 驾驶员视角:透过舷窗看外面 + 驾驶舱 ----------
  const WIN = () => ({ t: H * 0.06, b: H * 0.64, l: W * 0.06, r: W * 0.94 });
  function proj(me, x, y, z, fo, hz) {
    const ca = Math.cos(me.a), sa = Math.sin(me.a), dx = x - me.x, dy = y - me.y, f = dx * ca + dy * sa, l = -dx * sa + dy * ca;
    if (f < 6) return null; return { f, sx: W / 2 + l / f * fo, sy: hz - (z || 0) / f * fo };
  }
  function outside() {
    const me = run.me, fo = W * 0.95, hz = H * 0.36, wn = WIN();
    ctx.save(); ctx.beginPath(); ctx.moveTo(W * .08, wn.t); ctx.lineTo(W * .92, wn.t); ctx.lineTo(W * .985, wn.b); ctx.lineTo(W * .015, wn.b); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, hz - 120, 0, hz + 120); bg.addColorStop(0, 'rgba(60,70,140,0)'); bg.addColorStop(.5, 'rgba(90,100,180,.12)'); bg.addColorStop(1, 'rgba(60,70,140,0)'); ctx.fillStyle = bg; ctx.fillRect(0, hz - 120, W, 240);   // 银河光带
    const spd = me.speed / run.C.maxv, streak = spd * (run.boosting ? 60 : 24);
    for (const s of run.sky) { let d = s[0] - me.a; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) > 1.2) continue; const x = W / 2 + d * fo, y = hz - s[1] * fo * .9; ctx.globalAlpha = .4 + .6 * s[3]; ctx.fillStyle = s[3] > .8 ? '#ffe9b0' : '#fff';
      if (streak > 3) { const dx = x - W / 2, dy = y - hz, L = Math.hypot(dx, dy) || 1; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = s[2] * .8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx / L * streak * s[2], y + dy / L * streak * s[2]); ctx.stroke(); } else ctx.fillRect(x, y, s[2], s[2]); }
    ctx.globalAlpha = 1;
    // 世界物体:按远近排序,远的先画
    const list = []; for (const o of run.world.objs) { if (o.k === 'belt' || o.k === 'label') continue; const p = proj(me, o.x, o.y, o.z || 0, fo, hz); if (p) list.push([o, p]); }
    list.sort((a, b) => b[1].f - a[1].f);
    const tgt = nextTarget();
    for (const [o, p] of list) { const r = Math.min(2400, Math.max(o.k === 'star' ? 6 : 1.2, o.r * fo / p.f)); if (p.sx < -r - 60 || p.sx > W + r + 60 || p.sy < -r - 60 || p.sy > H + r + 60) continue;
      body(o, p.sx, p.sy, r);
      if (o.name && o.k !== 'rock' && p.f < 9000 && r > 4) label(o, p.sx, Math.max(wn.t + 34, p.sy - Math.min(r, 400) - 14), Math.max(16, Math.min(40, 16 + r / 8)));
      if (tgt && tgt.o === o) { ctx.strokeStyle = '#ffb454'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.min(500, r + 22), 0, 7); ctx.stroke(); ctx.setLineDash([]); } }
    // 星座连线(两端都在前方时)
    run.world.lines.forEach(l => { const a = proj(me, l[0].x, l[0].y, l[0].z, fo, hz), b = proj(me, l[1].x, l[1].y, l[1].z, fo, hz); if (!a || !b) return; const on = l[0].visited && l[1].visited; ctx.strokeStyle = on ? 'rgba(255,240,160,.9)' : 'rgba(180,200,255,.22)'; ctx.lineWidth = on ? 3 : 1; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke(); });
    // 玻璃反光
    const gl = ctx.createLinearGradient(0, wn.t, W, wn.b); gl.addColorStop(0, 'rgba(255,255,255,.07)'); gl.addColorStop(.35, 'rgba(255,255,255,0)'); gl.addColorStop(.7, 'rgba(255,255,255,.04)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    if (run.flash > 0) { ctx.fillStyle = 'rgba(255,60,40,' + run.flash * .35 + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  function cockpit() {
    const me = run.me, C = run.C, wn = WIN(), s = Math.min(1.2, H / 700), t = run.t;
    // 舱壁(挖出舷窗)
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(W * .08, wn.t); ctx.lineTo(W * .92, wn.t); ctx.lineTo(W * .985, wn.b); ctx.lineTo(W * .015, wn.b); ctx.closePath();
    const wg = ctx.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#1b2438'); wg.addColorStop(1, '#0a0f1c'); ctx.fillStyle = wg; ctx.fill('evenodd');
    ctx.strokeStyle = '#6b7aa3'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W * .08, wn.t); ctx.lineTo(W * .92, wn.t); ctx.lineTo(W * .985, wn.b); ctx.lineTo(W * .015, wn.b); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#10182a'; [[.345, .3], [.655, .7]].forEach(q => { ctx.beginPath(); ctx.moveTo(W * (q[0] - .012), wn.t); ctx.lineTo(W * (q[0] + .012), wn.t); ctx.lineTo(W * (q[1] + .016), wn.b); ctx.lineTo(W * (q[1] - .016), wn.b); ctx.fill(); });   // 窗框立柱
    ctx.fillStyle = '#0d1424'; ctx.fillRect(0, wn.t - 2, W, 0);
    // 仪表台
    const y0 = wn.b, dg = ctx.createLinearGradient(0, y0, 0, H); dg.addColorStop(0, '#2a3552'); dg.addColorStop(.12, '#161e33'); dg.addColorStop(1, '#0a0e1a'); ctx.fillStyle = dg; ctx.fillRect(0, y0, W, H - y0);
    ctx.strokeStyle = '#4a5a85'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, y0 + 2); ctx.lineTo(W, y0 + 2); ctx.stroke();
    // 指示灯
    for (let i = 0; i < 14; i++) { const on = Math.sin(t * 2 + i * 1.7) > 0.2; ctx.fillStyle = on ? ['#4ade80', '#fbbf24', '#38bdf8'][i % 3] : '#22304f'; ctx.beginPath(); ctx.arc(W * .30 + i * W * .028, y0 + 16 * s, 4 * s, 0, 7); ctx.fill(); }
    const cy = y0 + (H - y0) * .58;
    // 左:速度表
    const gx = W * .27, gr = 62 * s; ctx.save(); ctx.translate(gx, cy); ctx.strokeStyle = '#26335a'; ctx.lineWidth = 12 * s; ctx.beginPath(); ctx.arc(0, 0, gr, .75 * Math.PI, 2.25 * Math.PI); ctx.stroke();
    const k = Math.min(1, me.speed / (C.maxv * 1.7)); ctx.strokeStyle = run.boosting ? '#fb923c' : '#38bdf8'; ctx.beginPath(); ctx.arc(0, 0, gr, .75 * Math.PI, (.75 + 1.5 * k) * Math.PI); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos((.75 + 1.5 * k) * Math.PI) * (gr - 10), Math.sin((.75 + 1.5 * k) * Math.PI) * (gr - 10)); ctx.stroke();
    ctx.fillStyle = '#e8ecf8'; ctx.font = '700 ' + 16 * s + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(Math.round(me.speed * 8), 0, 30 * s); ctx.font = 11 * s + 'px system-ui'; ctx.fillStyle = '#93a0c2'; ctx.fillText('km/s', 0, 44 * s); ctx.restore();
    // 中:雷达(车头朝上)
    const rx = W * .5, rr = 66 * s; ctx.save(); ctx.translate(rx, cy); ctx.fillStyle = 'rgba(8,40,30,.85)'; ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.fill(); ctx.strokeStyle = '#2f9e6a'; ctx.lineWidth = 1.5; [1, .66, .33].forEach(q => { ctx.beginPath(); ctx.arc(0, 0, rr * q, 0, 7); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(-rr, 0); ctx.lineTo(rr, 0); ctx.moveTo(0, -rr); ctx.lineTo(0, rr); ctx.stroke();
    const sw = t * 2.2; ctx.fillStyle = 'rgba(80,255,160,.18)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rr, sw - .5, sw); ctx.fill();
    const RANGE = run.missionId === 'solar' ? 2600 : 3600;
    run.world.objs.forEach(o => { if (o.k === 'belt' || o.k === 'label') return; const dx = o.x - me.x, dy = o.y - me.y, d = Math.hypot(dx, dy); if (d > RANGE) return; const a = Math.atan2(dy, dx) - me.a - Math.PI / 2; ctx.fillStyle = o.k === 'rock' ? '#9ca3af' : o.visited ? '#7CFFB2' : o.stop ? '#ffb454' : '#38bdf8'; ctx.beginPath(); ctx.arc(Math.cos(a) * d / RANGE * rr, Math.sin(a) * d / RANGE * rr, o.k === 'rock' ? 1.6 : 3.2, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.fill(); ctx.fillStyle = '#7CFFB2'; ctx.font = 10 * s + 'px system-ui'; ctx.fillText('雷达', 0, rr + 14 * s); ctx.restore();
    // 右:燃料 / 护盾
    const bx = W * .64, bw = W * .17;
    const bar = (yy, v, col, name) => { ctx.fillStyle = '#26335a'; ctx.fillRect(bx, yy, bw, 14 * s); ctx.fillStyle = col; ctx.fillRect(bx, yy, bw * Math.max(0, Math.min(1, v)), 14 * s); ctx.strokeStyle = '#5b6c92'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, yy, bw, 14 * s); ctx.fillStyle = '#c8d3f0'; ctx.font = 12 * s + 'px system-ui'; ctx.textAlign = 'left'; ctx.fillText(name, bx, yy - 4); };
    bar(cy - 36 * s, run.shield / C.shield, run.shield / C.shield < .3 ? '#ef4444' : '#4ade80', '护盾'); bar(cy + 10 * s, run.fuel / C.fuel, run.boosting ? '#fb923c' : '#facc15', '加速燃料(空格/Shift)');
    ctx.fillStyle = '#e8ecf8'; ctx.font = '700 ' + 14 * s + 'px system-ui'; ctx.fillText('得分 ' + run.score + ' · 已到访 ' + run.stops.filter(o => o.visited).length + '/' + run.stops.length, bx, cy + 52 * s);
    if (run.shield / C.shield < .3 && Math.floor(t * 4) % 2) { ctx.fillStyle = '#ef4444'; ctx.font = '700 ' + 20 * s + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('⚠ 护盾过低', W / 2, wn.t + 56); }
    // 驾驶员(左下,座椅)和副驾驶(右下)
    const seat = (x, d, r, name) => { ctx.save(); ctx.translate(x, H - 18 * s); ctx.fillStyle = '#0c1220'; ctx.beginPath(); ctx.ellipse(0, 6, r * 1.5, r * 1.1, 0, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = '#334069'; ctx.lineWidth = 3; ctx.stroke(); ctx.translate(0, -r * .35); drawAvatar(d, r); ctx.fillStyle = '#c8d3f0'; ctx.font = 11 * s + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(name, 0, r + 14 * s); ctx.restore(); };
    seat(W * .09, run.drv, 38 * s, '驾驶员 ' + run.drv.name); seat(W * .92, run.co, 28 * s, '副驾驶 ' + run.co.name);
    // 操纵杆
    ctx.strokeStyle = '#8a96b8'; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(W * .5 - 120 * s, H - 8); ctx.lineTo(W * .5 - 120 * s + (keys.right - keys.left) * 14 * s, H - 46 * s); ctx.stroke(); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(W * .5 - 120 * s + (keys.right - keys.left) * 14 * s, H - 48 * s, 7 * s, 0, 7); ctx.fill();
  }
  function driver() { outside(); cockpit(); }

  // ---------- 5. 主循环 ----------
  function hud() {
    const tgt = nextTarget(), left = run.stops.filter(o => !o.visited).length;
    document.getElementById('hud').innerHTML = '<span>' + run.C0.name + ' · ' + Math.round(run.me.speed * 8) + ' km/s</span><span>' + run.time.toFixed(0) + ' 秒</span><span>得分 ' + run.score + '</span><span>已到访 ' + (run.stops.length - left) + ' / ' + run.stops.length + '</span><span>🎯 ' + (tgt ? tgt.o.name.zh + '(' + Math.round(tgt.d / 10) * 10 + ')' : '全部完成!') + '</span>';
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - run.last) / 1000); run.last = now; run.t += dt;
    if (run.count > 0) { run.count -= dt; document.getElementById('count').textContent = run.count > 0 ? Math.ceil(run.count) : 'GO!'; }
    else { run.time += dt; run.count -= dt; document.getElementById('count').textContent = run.count > -0.8 ? 'GO!' : ''; }
    if (run.count <= 0 && !run.done) { physics(dt); interact(dt); } else if (run.done) { run.me.vx *= .98; run.me.vy *= .98; run.me.x += run.me.vx * dt; run.me.y += run.me.vy * dt; run.me.speed = Math.hypot(run.me.vx, run.me.vy); }
    if (run.shake > 0) run.shake -= dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    run.view === 'driver' ? driver() : god();
    hud(); document.getElementById('env').style.display = run.view === 'driver' ? 'none' : '';
    if (run.done && !run.ended) { run.doneT -= dt; if (run.doneT <= 0) { run.ended = true; endMission(); } }
    raf = requestAnimationFrame(frame);
  }
  function endMission() {
    const bonus = Math.max(0, Math.round(600 - run.time * 3)), tot = run.score + bonus;
    document.getElementById('endlist').innerHTML = '<li>用时 ' + run.time.toFixed(0) + ' 秒(时间奖励 +' + bonus + ')</li><li>护盾耗尽 ' + run.dead + ' 次</li><li>航天器:' + run.C0.name + ' · 驾驶员:' + run.drv.name + '</li>';
    document.getElementById('endscore').innerHTML = '<b>总分 ' + tot + '</b>';
    document.getElementById('endwords').innerHTML = '你认识了:' + run.learned.map(o => o.name.zh + ' ' + o.name.en).join('、');
    document.getElementById('end').hidden = false;
  }
  function stop() { cancelAnimationFrame(raf); run = null; }
  function setView(v) { if (run) run.view = v; }
  return { start, stop, keys, setView, getView: () => run ? run.view : 'god', debug: () => run };
})();
