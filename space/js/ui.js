/**
 * space/js/ui.js — 选择界面与按键/触屏控制
 * 依赖:../race/data.js(DRIVERS)、../race/js/music.js(Music)、data.js、engine.js
 */
(function () {
  const BODY_FROM = id => ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(id);
  const $ = id => document.getElementById(id);
  const get = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  let driver = get('space-driver', 'bird'), craft = get('space-craft', 'rocket'), mission = get('space-mission', 'solar'), view = get('space-view', 'god'), music = get('space-music', 'drive'), vol = +get('space-vol', 50);
  if (!DRIVERS.some(d => d.id === driver)) driver = 'bird'; if (!CRAFTS.some(c => c.id === craft)) craft = 'rocket'; if (!MISSIONS.some(m => m.id === mission)) mission = 'solar'; if (view !== 'god' && view !== 'driver') view = 'god';
  const FROM = new URLSearchParams(location.search).get('from');          // 从主页 3D 双击跳转来:?from=jupiter → 太阳系巡游,出发点在该天体附近
  if (FROM && BODY_FROM(FROM)) mission = 'solar';
  const bar = v => '<div class="bar"><i style="width:' + Math.round(Math.min(1, v) * 100) + '%"></i></div>';
  const card = (host, id, html, on) => { const b = document.createElement('div'); b.className = 'opt'; b.dataset.id = id; b.innerHTML = html; b.onclick = on; $(host).append(b); };
  DRIVERS.forEach(d => card('drivers', d.id, (d.img ? '<img class="face" src="' + d.img + '" alt="' + d.name + '">' : '<span class="face emo">' + d.emoji + '</span>') + '<b>' + d.name + '</b><small>' + d.desc + '</small>', () => { driver = d.id; put('space-driver', d.id); mark(); }));
  CRAFTS.forEach(c => card('crafts', c.id, '<b><span class="sw" style="background:' + c.color + '"></span>' + c.name + ' <small>' + c.en + '</small></b><small>' + c.desc + '</small><br>推力' + bar(c.thrust / 1.4) + '速度' + bar(c.maxv / 800) + '灵活' + bar(c.turn / 1.5) + '护盾' + bar(c.shield / 130), () => { craft = c.id; put('space-craft', c.id); mark(); }));
  MISSIONS.forEach(m => card('missions', m.id, '<b>' + m.name + '</b><small>' + m.desc + '</small>', () => { mission = m.id; put('space-mission', m.id); mark(); }));
  [['god', '🛰 上帝视角', '俯视星空:在行星、星座之间穿梭,穿过小行星带和柯伊伯带;有小地图和目标箭头'], ['driver', '👨‍🚀 驾驶员视角', '坐进驾驶舱,透过玻璃看外面;能看到仪表盘、雷达、驾驶员和副驾驶']].forEach(v => card('views', v[0], '<b>' + v[1] + '</b><small>' + v[2] + '</small>', () => setView(v[0])));
  function setView(v) { view = v; put('space-view', v); Space.setView(v); mark(); }
  function mark() {
    [['drivers', driver], ['crafts', craft], ['missions', mission], ['views', view]].forEach(p => document.querySelectorAll('#' + p[0] + ' .opt').forEach(e => e.classList.toggle('on', e.dataset.id === p[1])));
    $('vbtn').textContent = view === 'driver' ? '👨‍🚀 驾驶舱' : '🛰 上帝';
  }
  // 背景音乐(与赛车页共用同一套合成音乐)
  if (!Music.LIST.some(m => m.id === music)) music = 'drive';
  Music.LIST.forEach(m => card('music', m.id, '<b>' + m.name + '</b><small>' + m.desc + '</small>', () => { music = m.id; put('space-music', m.id); markMusic(); if (!$('game').hidden) Music.play(music); }));
  function markMusic() { document.querySelectorAll('#music .opt').forEach(e => e.classList.toggle('on', e.dataset.id === music)); $('mbtn').textContent = '🎵 ' + Music.LIST.find(m => m.id === music).short; }
  $('vol').value = vol; Music.setVolume(vol / 100); $('vol').oninput = () => { vol = +$('vol').value; Music.setVolume(vol / 100); put('space-vol', vol); };
  $('mtest').onclick = () => { if ($('mtest').dataset.on) { Music.stop(); delete $('mtest').dataset.on; $('mtest').textContent = '▶ 试听'; } else { Music.play(music); $('mtest').dataset.on = 1; $('mtest').textContent = '■ 停止'; } };
  $('mbtn').onclick = () => { const i = Music.LIST.findIndex(m => m.id === music); music = Music.LIST[(i + 1) % Music.LIST.length].id; put('space-music', music); markMusic(); Music.play(music); };
  markMusic(); mark();
  function begin() { $('setup').hidden = true; $('game').hidden = false; delete $('mtest').dataset.on; $('mtest').textContent = '▶ 试听'; Music.play(music); Space.start(craft, mission, { driver, view, speak: $('speak').checked, from: mission === 'solar' ? FROM : null }); }
  $('start').onclick = begin; $('again').onclick = begin; $('vbtn').onclick = () => setView(view === 'god' ? 'driver' : 'god');
  $('back').onclick = $('back2').onclick = () => { Space.stop(); Music.stop(); $('game').hidden = true; $('setup').hidden = false; };
  const map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'gas', w: 'gas', W: 'gas', ArrowDown: 'brake', s: 'brake', S: 'brake', ' ': 'boost', Shift: 'boost' };
  addEventListener('keydown', e => { if ((e.key === 'v' || e.key === 'V') && !$('game').hidden) { setView(view === 'god' ? 'driver' : 'god'); return; } if (map[e.key]) { Space.keys[map[e.key]] = true; e.preventDefault(); } });
  addEventListener('keyup', e => { if (map[e.key]) Space.keys[map[e.key]] = false; });
  document.querySelectorAll('#touch button').forEach(b => { const k = b.dataset.k; b.onpointerdown = e => { Space.keys[k] = true; e.preventDefault(); }; ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => { Space.keys[k] = false; })); });
})();
