/**
 * cosmos.js — 更大的宇宙:银河系 / 本星系群(仙女座星系)/ 星云,与太阳系一起组成四个尺度
 * 银河系:太阳绕银心转一圈约 2.3 亿年——太阳的位置由时间轴的年份决定,拖动时间轴就能看到太阳绕银河系中心转动。
 * 银河系和本星系群可以放大缩小(按钮 / 滚轮 / 拖动平移);双击天体会放大到该天体的尺度,
 * 放大到足够大时自动进入下一个尺度(太阳 → 太阳系、猎户座星云 → 星云、银河系 → 银河系图)。
 * 依赖(需先加载):solar.js(g 画布、LEVEL、DRAWERS)、timeline.js(sl, u2y)
 * 提供(全局):setLevel
 */
(function () {
  const CXG = 360, CYG = 200, R = 160;                       // 银河系中心和半径(像素)
  const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  // ---- 银河系:4 条旋臂 + 核球 + 盘面散点(只生成一次)----
  const GAL = [];
  for (let i = 0; i < 1100; i++) {
    const arm = i % 4, r = Math.pow(rnd(), 0.7) * R, th = arm * Math.PI / 2 + r / R * 4.2 + (rnd() - 0.5) * 0.55 * (1.1 - r / R);
    GAL.push([r, th, 0.6 + rnd() * 1.4, rnd()]);
  }
  const BULGE = Array.from({ length: 260 }, () => { const r = Math.pow(rnd(), 1.8) * 34, th = rnd() * 7; return [r, th, 0.6 + rnd() * 1.2]; });
  const SKY = Array.from({ length: 70 }, () => [rnd() * 720, rnd() * 400, rnd() * 1.3]);
  // ---- 缩放视图:z 当前倍数,(cx,cy) 当前中心;t 开头的是目标值,每帧平滑逼近 ----
  const VW = {}, HITS = []; let Z = 1;
  const HX = k => 360, view = k => VW[k] || (VW[k] = { z: 1, cx: HX(k), cy: 200, tz: 1, tcx: HX(k), tcy: 200, go: null });
  function beginView(k) {
    const v = view(k), f = 0.14;
    v.z = Math.exp(Math.log(v.z) + (Math.log(v.tz) - Math.log(v.z)) * f); v.cx += (v.tcx - v.cx) * f; v.cy += (v.tcy - v.cy) * f; Z = v.z; HITS.length = 0;
    g.save(); g.translate(360, 200); g.scale(Z, Z); g.translate(-v.cx, -v.cy); g.lineWidth = 1 / Z;
    if (v.go && Z >= v.go.at) { const lv = v.go.level; v.go = null; setLevel(lv); }     // 放大到够大:进入下一个尺度
  }
  function endView(k) { g.restore(); const v = view(k); g.fillStyle = 'rgba(160,180,230,.9)'; g.font = '12px sans-serif'; g.textAlign = 'right'; g.fillText('放大 ×' + (v.z < 10 ? v.z.toFixed(1) : Math.round(v.z)), 712, 16); g.textAlign = 'left'; }
  const hit = (x, y, r, o) => HITS.push(Object.assign({ x, y, r }, o));
  const ZS = () => Math.pow(Z, -0.45);          // 放大时星点不要按比例变大
  function sky(t) { g.fillStyle = '#fff'; SKY.forEach(s => { g.globalAlpha = .25 + .35 * Math.sin(t * .002 + s[0]); g.fillRect(s[0], s[1], s[2], s[2]); }); g.globalAlpha = 1; }
  function glow(x, y, r, c0, c1) { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, c0); q.addColorStop(1, c1 || 'rgba(0,0,0,0)'); g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  function label(txt, x, y, col, size, al) { g.fillStyle = col || '#cfe3ff'; g.font = (size || 12) / Z + 'px sans-serif'; g.textAlign = al || 'left'; g.fillText(txt, x, y); g.textAlign = 'left'; }
  function spiral(cx, cy, scale, rot, t, tilt) {            // 画一个旋涡星系(银河系和仙女座共用)
    g.save(); g.translate(cx, cy); g.scale(1, tilt || 1); g.rotate(rot);
    glow(0, 0, R * scale * 1.05, 'rgba(110,130,255,.20)', 'rgba(0,0,0,0)');
    GAL.forEach(p => { const th = p[1] + t * 0.00004 * (1.2 - p[0] / R); g.fillStyle = p[3] > .85 ? '#ffd9a0' : p[3] > .5 ? '#bcd4ff' : '#8fa8e8'; g.globalAlpha = .55 + .4 * p[3]; g.fillRect(Math.cos(th) * p[0] * scale, Math.sin(th) * p[0] * scale, p[2] * Math.max(.7, scale * 1.3) * ZS(), p[2] * Math.max(.7, scale * 1.3) * ZS()); });
    g.globalAlpha = 1; BULGE.forEach(p => { g.fillStyle = '#ffe9b0'; g.fillRect(Math.cos(p[1]) * p[0] * scale, Math.sin(p[1]) * p[0] * scale, p[2] * ZS(), p[2] * ZS()); });
    glow(0, 0, 40 * scale, 'rgba(255,230,160,.9)', 'rgba(255,200,100,0)'); g.restore();
  }
  // ---- ① 银河系 ----
  function drawGalaxy(t) {
    g.clearRect(0, 0, 720, 400); sky(t); beginView('galaxy');
    const y = u2y(sl.value / 1000), SUNR = 82;                // 太阳离银心约 2.6 万光年 → 画面 82 像素
    spiral(CXG, CYG, 1, 0, t, 1);
    g.strokeStyle = 'rgba(255,180,84,.35)'; g.setLineDash([4, 4]); g.beginPath(); g.arc(CXG, CYG, SUNR, 0, 7); g.stroke(); g.setLineDash([]);
    // 太阳的位置 = 时间轴年份 ÷ 2.3 亿年 × 一圈(顺时针);再叠加一点点动画,让它看起来在走
    const ang = -2 * Math.PI * (y - NOW) / 2.3e8 + 1.1 + t * 0.00002, sx = CXG + Math.cos(ang) * SUNR, sy = CYG + Math.sin(ang) * SUNR;
    glow(sx, sy, 10 * Math.pow(Z, -0.5), 'rgba(255,220,100,1)', 'rgba(255,200,60,0)'); g.fillStyle = '#ffcc44'; g.beginPath(); g.arc(sx, sy, 3.2 * Math.pow(Z, -0.3), 0, 7); g.fill();
    // 猎户座星云 M42:约 1344 光年,在太阳附近(画面上只差几个像素)
    const ox = sx + Math.cos(ang + 0.5) * 9 + 6, oy = sy + Math.sin(ang + 0.5) * 9 - 5; glow(ox, oy, 9 * Math.pow(Z, -0.5), 'rgba(255,120,190,.95)', 'rgba(255,80,160,0)');
    g.strokeStyle = '#ff9ccf'; g.beginPath(); g.moveTo(ox + 4, oy - 4); g.lineTo(ox + 40, oy - 34); g.lineTo(ox + 52, oy - 34); g.stroke(); label('猎户座星云 M42 · 约 1344 光年', ox + 54, oy - 31, '#ff9ccf');
    g.strokeStyle = '#ffcc44'; g.beginPath(); g.moveTo(sx - 3, sy + 4); g.lineTo(sx - 30, sy + 40); g.lineTo(sx - 120, sy + 40); g.stroke(); label('太阳(绕银心一圈约 2.3 亿年)', sx - 118, sy + 36, '#ffcc44');
    label('银心 · 人马座 A*(黑洞)', CXG - 62, CYG + 26, '#ffe9b0');
    hit(sx, sy, 9, { id: 'sun', z: 48, go: ['solar', 40], info: '太阳:一颗普通的恒星,离银心约 2.6 万光年,绕银心一圈约 2.3 亿年。继续放大会进入太阳系。' });
    hit(ox, oy, 8, { id: 'm42', z: 48, go: ['nebula', 40], info: '猎户座星云 M42:约 1344 光年,恒星诞生地。继续放大会进入星云图。' });
    hit(CXG, CYG, 16, { id: 'sgr', z: 26, info: '银心 · 人马座 A*:银河系中心的超大质量黑洞,质量约 400 万个太阳。' });
    endView('galaxy'); Z = 1;
    label('银河系 · 直径约 10 万光年 · 约 1000–4000 亿颗恒星', 12, 392, '#8b97b8');
    label(Math.abs(y - NOW) < 1e5 ? '现在:太阳在这里(拖动时间轴到几千万年前/后,看它绕银心移动)' : (y > NOW ? '未来 ' : '过去 ') + (Math.abs(y - NOW) / 1e6).toFixed(0) + ' 百万年:太阳转到了这里', 12, 18, '#9fb4e8');
  }
  // ---- ② 本星系群:银河系、仙女座星系、三角座星系、两个麦哲伦云 ----
  function drawLocal(t) {
    g.clearRect(0, 0, 720, 400); sky(t); beginView('local');
    spiral(150, 230, 0.2, 0.3, t, 0.55); label('银河系', 150, 275, '#cfe3ff', 12, 'center');
    glow(122, 212, 4, 'rgba(180,200,255,.9)'); glow(112, 222, 3, 'rgba(180,200,255,.8)'); label('大/小麦哲伦云', 117, 200, '#8b97b8', 10, 'center');
    const m31x = 560 + Math.sin(t * .0003) * 3; spiral(m31x, 170, 0.34, -0.5, t, 0.4); label('仙女座星系 M31 · 约 254 万光年', m31x, 232, '#ffd1ec', 12, 'center');
    spiral(430, 90, 0.12, 0.2, t, 0.7); label('三角座星系 M33', 430, 66, '#8b97b8', 11, 'center');
    g.strokeStyle = 'rgba(255,209,236,.5)'; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(190, 222); g.lineTo(m31x - 90, 182); g.stroke(); g.setLineDash([]);
    label('→ 靠近中:约 110 km/s,几十亿年后可能与银河系相遇', 215, 196, '#ffd1ec', 11);
    hit(150, 230, 34, { id: 'mw', z: 11, go: ['galaxy', 8.5], info: '银河系:我们的家,直径约 10 万光年。继续放大会进入银河系图。' });
    hit(m31x, 170, 62, { id: 'm31', z: 4.6, info: '仙女座星系 M31:约 254 万光年,直径比银河系略大,是本星系群里最大的星系,正在靠近银河系。' });
    hit(430, 90, 24, { id: 'm33', z: 10, info: '三角座星系 M33:本星系群第三大星系,约 273 万光年。' });
    hit(122, 212, 9, { id: 'mc', z: 16, info: '大/小麦哲伦云:银河系的两个伴星系,在南半球夜空肉眼可见。' });
    endView('local'); Z = 1;
    label('本星系群 · 约 80 个星系,仙女座星系是其中最大的,夜空暗处肉眼可见', 12, 392, '#8b97b8');
  }
  // ---- ③ 星云:猎户座星云、蟹状星云、环状星云、马头星云(程序画的示意)----
  function neb(x, y, r, cols, t, seed) {
    for (let i = 0; i < 7; i++) { const a = seed + i * 1.1 + t * 0.00006, d = r * 0.35 * (i % 3) / 2; glow(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, r * (0.55 + 0.12 * ((i * 7) % 4)), cols[i % cols.length], 'rgba(0,0,0,0)'); }
  }
  function drawNeb(t) {
    g.clearRect(0, 0, 720, 400); sky(t);
    neb(180, 105, 95, ['rgba(255,90,170,.38)', 'rgba(130,90,255,.32)', 'rgba(255,170,120,.3)'], t, 1); for (let i = 0; i < 4; i++) glow(170 + i * 9, 100 + (i % 2) * 7, 3, 'rgba(255,255,255,1)', 'rgba(150,200,255,0)');
    label('猎户座星云 M42', 100, 205, '#ffb0dc'); label('恒星诞生地 · 约 1344 光年', 88, 220, '#8b97b8', 11);
    neb(540, 105, 80, ['rgba(110,190,255,.34)', 'rgba(255,230,160,.22)', 'rgba(255,120,90,.28)'], t, 3); g.strokeStyle = 'rgba(160,210,255,.4)'; for (let i = 0; i < 22; i++) { const a = i / 22 * 6.28; g.beginPath(); g.moveTo(540 + Math.cos(a) * 18, 105 + Math.sin(a) * 18); g.lineTo(540 + Math.cos(a + .3) * 70, 105 + Math.sin(a + .3) * 62); g.stroke(); } glow(540, 105, 6, 'rgba(255,255,255,1)', 'rgba(180,220,255,0)');
    label('蟹状星云 M1', 490, 205, '#9fd4ff'); label('超新星遗迹 · 公元 1054 年被记录', 450, 220, '#8b97b8', 11);
    g.strokeStyle = 'rgba(110,230,200,.85)'; g.lineWidth = 9; g.beginPath(); g.ellipse(180, 300, 52, 40, 0, 0, 7); g.stroke(); g.lineWidth = 1; glow(180, 300, 42, 'rgba(110,200,255,.18)'); glow(180, 300, 3, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    label('环状星云 M57', 130, 366, '#8ff0d8'); label('行星状星云 · 太阳老年的样子', 105, 381, '#8b97b8', 11);
    g.fillStyle = 'rgba(150,60,40,.35)'; g.fillRect(430, 262, 220, 120); g.fillStyle = '#05070f'; g.beginPath(); g.moveTo(520, 382); g.lineTo(520, 330); g.quadraticCurveTo(512, 300, 530, 296); g.quadraticCurveTo(550, 280, 560, 300); g.lineTo(572, 322); g.lineTo(580, 382); g.fill();
    label('马头星云', 470, 258, '#ffb59f'); label('暗星云 · 猎户座', 574, 374, '#8b97b8', 11);
  }

  // ---- ④ 夜空星座:以北天极为中心的星图(赤纬 > −45°),含黄道和今天的太阳位置 ----
  const SCX = 235, SCY = 200, SR = 190, SS = SR / 135, SELC = { id: null }, SKYH = [];
  const SPX = (ra, dec) => { const r = (90 - dec) * SS, th = ra * 15 * Math.PI / 180; return [SCX - r * Math.sin(th), SCY - r * Math.cos(th), r <= SR]; };
  const unwrap = (ras, i) => { let d = ras[i] - ras[0]; if (d > 12) d -= 24; if (d < -12) d += 24; return ras[0] + d; };
  const ZODIAC = () => CONS.filter(c => c.z), OTHERS = () => CONS.filter(c => !c.z);
  function sunToday() { const d = Date.now() / 86400000 + 2440587.5 - 2451545, L = (280.460 + 0.9856474 * d) % 360, gg = (357.528 + 0.9856003 * d) % 360 * Math.PI / 180, lam = (L + 1.915 * Math.sin(gg) + 0.020 * Math.sin(2 * gg)) * Math.PI / 180, e = 23.439 * Math.PI / 180; let ra = Math.atan2(Math.cos(e) * Math.sin(lam), Math.cos(lam)) * 12 / Math.PI; if (ra < 0) ra += 24; return [ra, Math.asin(Math.sin(e) * Math.sin(lam)) * 180 / Math.PI]; }
  function drawSky(t) {
    g.clearRect(0, 0, 720, 400); SKYH.length = 0; g.save(); g.beginPath(); g.rect(0, 0, 462, 400); g.clip(); beginView('sky'); const Zv = Z, setF = s => { g.font = s.replace(/(\d+(?:\.\d+)?)px/, (m, n) => n / Zv + 'px'); };
    g.fillStyle = '#050a1c'; g.beginPath(); g.arc(SCX, SCY, SR + 4, 0, 7); g.fill(); g.strokeStyle = 'rgba(110,140,220,.5)'; g.lineWidth = (1.5) / Zv; g.stroke(); g.lineWidth = 1 / Zv;
    [60, 30, 0, -30].forEach(d => { g.strokeStyle = d === 0 ? 'rgba(90,150,255,.45)' : 'rgba(120,140,200,.15)'; g.setLineDash(d === 0 ? [5, 4] : []); g.beginPath(); g.arc(SCX, SCY, (90 - d) * SS, 0, 7); g.stroke(); }); g.setLineDash([]);
    g.fillStyle = 'rgba(160,180,230,.55)'; setF('10px sans-serif'); g.textAlign = 'center';
    for (let h = 0; h < 24; h += 2) { const [x, y] = SPX(h, -39); g.fillText(h + 'h', x, y + 3); }
    g.fillText('天赤道', SCX + 6, SCY - 90 * SS - 3 + 0); g.textAlign = 'left';
    // 黄道(橙色虚线)
    g.strokeStyle = 'rgba(255,170,60,.75)'; g.setLineDash([6, 4]); g.beginPath(); let first = true;
    for (let l = 0; l <= 360; l += 3) { const lam = l * Math.PI / 180, e = 23.439 * Math.PI / 180; let ra = Math.atan2(Math.cos(e) * Math.sin(lam), Math.cos(lam)) * 12 / Math.PI; if (ra < 0) ra += 24; const dec = Math.asin(Math.sin(e) * Math.sin(lam)) * 180 / Math.PI, [x, y] = SPX(ra, dec); first ? g.moveTo(x, y) : g.lineTo(x, y); first = false; }
    g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(255,190,90,.9)'; setF('11px sans-serif'); g.fillText('黄道', SCX + 100, SCY + 70);
    // 星座
    const bright = {};
    CONS.forEach(c => {
      const sel = SELC.id === c.id, col = sel ? '#ffe27a' : c.z ? 'rgba(255,200,120,.8)' : 'rgba(150,200,255,.8)', ras = c.stars.map(s => s[0]), P = c.stars.map((s, i) => SPX(unwrap(ras, i), s[1]));
      g.strokeStyle = col; g.lineWidth = (sel ? 2.2 : 1.1) / Zv; c.lines.forEach(l => { const a = P[l[0]], b = P[l[1]]; if (a[2] && b[2]) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }); g.lineWidth = 1 / Zv;
      c.stars.forEach((s, i) => { const p = P[i]; if (!p[2]) return; const r = Math.max(1.3, 3.8 - s[2] * 0.85) / Math.sqrt(Zv); g.fillStyle = '#fff'; g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill(); if (s[3]) { bright[s[3]] = p; g.strokeStyle = 'rgba(255,226,122,.7)'; g.beginPath(); g.arc(p[0], p[1], r + 3, 0, 7); g.stroke(); SKYH.push({ x: p[0], y: p[1], r: 9, id: s[3], kind: 'star' }); } });
      const pin = P.filter(p => p[2]); if (!pin.length) return; const cx = pin.reduce((a, p) => a + p[0], 0) / pin.length, cy = pin.reduce((a, p) => a + p[1], 0) / pin.length;
      c.lx = cx; c.ly = cy; g.textAlign = 'center'; setF((sel ? '700 ' : '') + '11px sans-serif'); g.lineWidth = (3) / Zv; g.strokeStyle = 'rgba(3,6,20,.9)'; g.strokeText((c.z ? c.z + ' ' : '') + c.zh.replace(/\(.*\)/, ''), cx, cy + 16); g.fillStyle = sel ? '#ffe27a' : c.z ? '#ffd699' : '#bcd4ff'; g.fillText((c.z ? c.z + ' ' : '') + c.zh.replace(/\(.*\)/, ''), cx, cy + 16);
      setF('9px sans-serif'); g.strokeText(c.en + ' · ' + c.ja, cx, cy + 27); g.fillStyle = 'rgba(200,215,245,.85)'; g.fillText(c.en + ' · ' + c.ja, cx, cy + 27); g.lineWidth = 1 / Zv; g.textAlign = 'left';
      SKYH.push({ x: cx, y: cy + 16, r: 24, id: c.id, kind: 'con' });
    });
    // 三角形
    SKY_TRIANGLES.forEach(tr => { const pts = tr.ids.map(i => bright[i]); if (pts.some(p => !p)) return; g.strokeStyle = 'rgba(120,255,200,.45)'; g.setLineDash([3, 4]); g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); g.setLineDash([]); const mx = pts.reduce((a, p) => a + p[0], 0) / 3, my = pts.reduce((a, p) => a + p[1], 0) / 3; g.fillStyle = 'rgba(130,255,210,.9)'; setF('10px sans-serif'); g.textAlign = 'center'; g.fillText(tr.zh, mx, my + 3); g.textAlign = 'left'; });
    // 今天的太阳
    const [sra, sdec] = sunToday(), sp = SPX(sra, sdec); if (sp[2]) { glow(sp[0], sp[1], 14 + 2 * Math.sin(t * .004), 'rgba(255,220,100,1)', 'rgba(255,200,60,0)'); g.fillStyle = '#ffcc44'; g.beginPath(); g.arc(sp[0], sp[1], 4, 0, 7); g.fill(); g.fillStyle = '#ffe9a0'; setF('11px sans-serif'); g.fillText('☀ 今天的太阳', sp[0] + 8, sp[1] - 6); SKYH.push({ x: sp[0], y: sp[1], r: 11, id: 'sun', kind: 'star' }); }
    g.fillStyle = 'rgba(160,180,230,.85)'; setF('11px sans-serif'); g.textAlign = 'center'; g.fillText('北天极 ★ 北极星', SCX, SCY + 14 + 0); g.textAlign = 'left';
    endView('sky'); g.restore(); g.lineWidth = 1; { const zz = view('sky').z; g.fillStyle = 'rgba(160,180,230,.9)'; g.font = '12px sans-serif'; g.textAlign = 'right'; g.fillText('放大 ×' + (zz < 10 ? zz.toFixed(1) : Math.round(zz)), 712, 16); g.textAlign = 'left'; }
    // 右侧图例:黄道十二星座 + 其他
    g.fillStyle = '#ffd699'; g.font = '700 12px sans-serif'; g.fillText('黄道十二星座(点击查看)', 470, 18);
    ZODIAC().forEach((c, i) => { const x = 470 + (i % 2) * 124, y = 30 + Math.floor(i / 2) * 36, sel = SELC.id === c.id; g.fillStyle = sel ? 'rgba(255,226,122,.18)' : 'rgba(255,255,255,.04)'; g.fillRect(x - 3, y - 2, 120, 33); g.fillStyle = sel ? '#ffe27a' : '#ffd699'; g.font = '700 12px sans-serif'; g.fillText(c.z + ' ' + c.zh, x, y + 11); g.fillStyle = 'rgba(200,215,245,.85)'; g.font = '10px sans-serif'; g.fillText(c.en + ' · ' + c.ja, x, y + 25); SKYH.push({ scr: 1, x: x + 57, y: y + 14, r: 22, id: c.id, kind: 'con', rect: [x - 3, y - 2, 120, 33] }); });
    g.fillStyle = '#9fc3ff'; g.font = '700 12px sans-serif'; g.fillText('容易辨认的其他星座', 470, 250);
    OTHERS().forEach((c, i) => { const x = 470 + (i % 2) * 124, y = 257 + Math.floor(i / 2) * 28, sel = SELC.id === c.id; g.fillStyle = sel ? 'rgba(255,226,122,.18)' : 'rgba(255,255,255,.04)'; g.fillRect(x - 3, y - 2, 120, 26); g.fillStyle = sel ? '#ffe27a' : '#bcd4ff'; g.font = '700 11px sans-serif'; g.fillText(c.zh.replace(/\(.*\)/, ''), x, y + 10); g.fillStyle = 'rgba(200,215,245,.85)'; g.font = '9px sans-serif'; g.fillText(c.en + ' · ' + c.ja, x, y + 22); SKYH.push({ scr: 1, x: x + 57, y: y + 12, r: 20, id: c.id, kind: 'con', rect: [x - 3, y - 2, 120, 26] }); });
  }
  // ---- 星云图的可点击区域(屏幕坐标)----
  const NEBH = [{ x: 180, y: 105, r: 70, id: 'm42' }, { x: 540, y: 105, r: 65, id: 'm1' }, { x: 180, y: 300, r: 55, id: 'm57' }, { x: 540, y: 320, r: 70, id: 'b33' }];
  DRAWERS.galaxy = drawGalaxy; DRAWERS.sky = drawSky; DRAWERS.local = drawLocal; DRAWERS.nebula = drawNeb;
  const LV = [['solar', '☀ 太阳系', '太阳系:八大行星和冥王星绕太阳转动(俯视示意)。双击天体,在下面的 3D 里查看它、看介绍'],
    ['sky', '🔭 夜空星座', '夜空星座:从地球看到的背景恒星图案(以北天极为中心)。橙色虚线是黄道——太阳一年走一圈,经过的 12 个星座就是黄道十二星座。可放大缩小、拖动;点星座或亮星,在 3D 里看介绍'],
    ['nebula', '☁ 星云', '星云:银河系里的气体和尘埃云,有的是恒星诞生地,有的是恒星死亡后留下的(程序绘制的示意图)。点击星云,在 3D 里看介绍'],
    ['galaxy', '🌌 银河系', '银河系:太阳绕银心转一圈约 2.3 亿年;拖动时间轴,太阳的位置会随年份改变。可放大缩小,单击看介绍,双击放大到它的尺度'],
    ['local', '🌀 本星系群', '本星系群:银河系与仙女座星系、三角座星系等组成的星系群。可放大缩小,单击看介绍,双击放大到它的尺度']];
  function setLevel(k) { LEVEL = k; if (VW[k]) { Object.assign(VW[k], { z: 1, cx: HX(k), cy: 200, tz: 1, tcx: HX(k), tcy: 200, go: null }); }
    const zb = $('zoombar'); if (zb) zb.style.display = (k === 'galaxy' || k === 'local' || k === 'sky') ? 'flex' : 'none'; try { localStorage.setItem('ts-level', k); } catch (e) {} document.querySelectorAll('#lv button[data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === k)); document.querySelectorAll('#lvmap [data-k]').forEach(b => b.classList.toggle('cur', b.dataset.k === k)); $('lvnote').textContent = LV.find(v => v[0] === k)[2]; }
  LV.forEach(v => { const b = document.createElement('button'); b.textContent = v[1]; b.dataset.k = v[0]; b.onclick = () => setLevel(v[0]); $('lv').append(b); });
  // ---- 尺度关系:谁包含谁(点击跳转)----
  const MAP = [['', '🌍 地球 <small>1.3 万公里</small>'], ['solar', '☀ 太阳系 <small>约 2 光年(含奥尔特云)</small>'], ['galaxy', '🌌 银河系 <small>约 10 万光年</small>'], ['local', '🌀 本星系群 <small>约 1000 万光年</small>'], ['', '🌠 可观测宇宙 <small>约 930 亿光年</small>']];
  $('lvmap').innerHTML = '<b>尺度关系(小 ⊂ 大)</b>:' + MAP.map(m => '<span class="lvc" ' + (m[0] ? 'data-k="' + m[0] + '"' : '') + '>' + m[1] + '</span>').join(' ⊂ ') + '<br>☁ <span class="lvc" data-k="nebula">星云</span>(几十光年)和 🔭 <span class="lvc" data-k="sky">夜空星座</span>都在银河系里:星座是从地球看到的背景恒星(离我们几十到上千光年),猎户座星云约 1344 光年——在银河系的猎户臂上。';
  document.querySelectorAll('#lvmap [data-k]').forEach(e => { e.onclick = () => setLevel(e.dataset.k); });
  // ---- 缩放控件:按钮 / 滚轮 / 拖动平移 / 双击天体 ----
  const zb = document.createElement('span'); zb.id = 'zoombar'; zb.style.cssText = 'display:none;gap:6px;margin-left:auto'; $('lv').append(zb);
  const zbtn = (t, fn, tip) => { const b = document.createElement('button'); b.textContent = t; b.title = tip; b.onclick = fn; zb.append(b); };
  const cv_ = () => view(LEVEL), zoomBy = f => { const v = cv_(); v.go = null; v.tz = Math.max(1, Math.min(80, v.tz * f)); if (v.tz <= 1.001) { v.tcx = HX(LEVEL); v.tcy = 200; } };
  zbtn('＋ 放大', () => zoomBy(1.8), '放大'); zbtn('－ 缩小', () => zoomBy(1 / 1.8), '缩小'); zbtn('⟲ 复位', () => { const v = cv_(); v.go = null; v.tz = 1; v.tcx = HX(LEVEL); v.tcy = 200; $('lvnote').textContent = LV.find(x => x[0] === LEVEL)[2]; }, '回到全景');
  const toWorld = ev => { const r = cv.getBoundingClientRect(), v = cv_(), px = (ev.clientX - r.left) * 720 / r.width, py = (ev.clientY - r.top) * 400 / r.height; return [(px - 360) / v.z + v.cx, (py - 200) / v.z + v.cy, px, py]; };
  cv.addEventListener('dblclick', ev => {
    if (LEVEL !== 'galaxy' && LEVEL !== 'local' && LEVEL !== 'sky') return; const v = cv_(), [wx, wy] = toWorld(ev); let best = null, bd = 1e9;
    HITS.forEach(h => { const d = Math.hypot(wx - h.x, wy - h.y); if (d < Math.max(h.r, 10 / v.z) && d < bd) { bd = d; best = h; } });
    if (best) { v.tz = best.z; v.tcx = best.x; v.tcy = best.y; v.go = best.go ? { level: best.go[0], at: best.go[1] } : null; $('lvnote').textContent = best.info; }
    else { v.go = null; v.tz = Math.min(80, v.tz * 2); v.tcx = wx; v.tcy = wy; }
  });
  // 单击:银河系/本星系群的天体 → 3D 介绍;星云、星座图的天体 → 3D 介绍(星座可选中高亮)
  cv.addEventListener('click', ev => {
    const r = cv.getBoundingClientRect(), px = (ev.clientX - r.left) * 720 / r.width, py = (ev.clientY - r.top) * 400 / r.height; let best = null, bd = 1e9;
    const pick = (list, x, y, rf) => list.forEach(h => { const d = Math.hypot(x - h.x, y - h.y); if (d < rf(h) && d < bd) { bd = d; best = h; } });
    if (LEVEL === 'galaxy' || LEVEL === 'local') { const w = toWorld(ev), v = cv_(); pick(HITS, w[0], w[1], h => Math.max(h.r, 10 / v.z)); }
    else if (LEVEL === 'nebula') pick(NEBH, px, py, h => h.r);
    else if (LEVEL === 'sky') {
      const w = toWorld(ev), v = cv_(); let lg = null;
      SKYH.filter(h => h.scr).forEach(h => { if (px >= h.rect[0] && px <= h.rect[0] + h.rect[2] && py >= h.rect[1] && py <= h.rect[1] + h.rect[3]) lg = h; });
      if (lg) best = lg;
      else { SKYH.filter(h => !h.scr && h.kind === 'star').forEach(h => { const d = Math.hypot(w[0] - h.x, w[1] - h.y); if (d < h.r / v.z && d < bd) { bd = d; best = h; } });
        if (!best) SKYH.filter(h => !h.scr && h.kind === 'con').forEach(h => { const d = Math.hypot(w[0] - h.x, w[1] - h.y); if (d < h.r / v.z && d < bd) { bd = d; best = h; } }); }
    }
    if (!best) return;
    if (best.kind === 'con') { const c = CONS.find(x => x.id === best.id); SELC.id = c.id; const bs = c.stars.filter(s => s[3]).map(s => BODY[s[3]].zh); $('lvnote').textContent = (c.z ? c.z + ' ' : '') + c.zh + ' · ' + c.en + ' · ' + c.ja + (c.z ? '(黄道十二星座之一)' : '') + ' —— ' + c.stars.length + ' 颗主要的星' + (bs.length ? ',亮星:' + bs.join('、') + '(点亮星可在 3D 里看介绍)' : ''); return; }
    if (BODY[best.id]) { showBody(best.id); $('lvnote').textContent = (best.info ? best.info + ' ' : '') + '→ 3D 区域左下角有介绍。'; }
  });
  cv.addEventListener('wheel', ev => { if (LEVEL !== 'galaxy' && LEVEL !== 'local' && LEVEL !== 'sky') return; ev.preventDefault(); const v = cv_(), w = toWorld(ev); v.go = null; v.tz = Math.max(1, Math.min(80, v.tz * Math.exp(-ev.deltaY * 0.0018))); if (ev.deltaY < 0) { v.tcx = w[0]; v.tcy = w[1]; } else if (v.tz <= 1.001) { v.tcx = HX(LEVEL); v.tcy = 200; } }, { passive: false });
  let pan = null; cv.addEventListener('pointerdown', ev => { if ((LEVEL === 'galaxy' || LEVEL === 'local' || LEVEL === 'sky') && cv_().z > 1.2) pan = [ev.clientX, ev.clientY]; });
  addEventListener('pointerup', () => { pan = null; });
  addEventListener('pointermove', ev => { if (!pan) return; const v = cv_(), r = cv.getBoundingClientRect(), k = 720 / r.width / v.z; v.tcx -= (ev.clientX - pan[0]) * k; v.tcy -= (ev.clientY - pan[1]) * k; v.cx = v.tcx; v.cy = v.tcy; pan = [ev.clientX, ev.clientY]; });
  let k0 = 'solar'; try { k0 = localStorage.getItem('ts-level') || 'solar'; } catch (e) {} setLevel(LV.some(v => v[0] === k0) ? k0 : 'solar');
  window.setLevel = setLevel; window.HITS = HITS; window.SKYH = SKYH; window.VW = VW;   // HITS 仅供测试
})();
