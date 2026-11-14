/**
 * race/js/ui.js — 选择界面与按键/触屏控制
 * 依赖:data.js, engine.js
 */
(function () {
  const $ = id => document.getElementById(id);
  let car = 'spark';
  let planet = new URLSearchParams(location.search).get('planet');
  if (!PLANETS[planet]) planet = 'earth';                 // 从“时空漫游”跳转时可带 ?planet=mars

  // 车型卡片
  CARS.forEach(c => {
    const b = document.createElement('div'); b.className = 'opt'; b.dataset.id = c.id;
    const bar = v => '<div class="bar"><i style="width:' + Math.round(Math.min(1, v) * 100) + '%"></i></div>';
    b.innerHTML = '<b><span class="sw" style="background:' + c.color + '"></span>' + c.name + '</b><small>' + c.desc + '</small><br>速度' + bar(c.maxv / 650) + '抓地' + bar(c.grip / 1.4) + '操控' + bar(c.turn / 1.2);
    b.onclick = () => { car = c.id; mark(); };
    $('cars').append(b);
  });
  // 行星按钮
  PLANET_ORDER.forEach(k => {
    const p = PLANETS[k], b = document.createElement('div'); b.className = 'opt'; b.dataset.id = k;
    const sw = p.solid ? p.ground : p.bands[0];
    b.innerHTML = '<b><span class="sw" style="background:' + sw + '"></span>' + p.name + '</b><small>' + p.en + (p.solid ? '' : ' · 云顶平台') + '</small>';
    b.onclick = () => { planet = k; mark(); };
    $('planets').append(b);
  });
  function mark() {
    document.querySelectorAll('#cars .opt').forEach(e => e.classList.toggle('on', e.dataset.id === car));
    document.querySelectorAll('#planets .opt').forEach(e => e.classList.toggle('on', e.dataset.id === planet));
    const p = PLANETS[planet];
    $('info').innerHTML = '<b>' + p.name + '</b> · 重力 ' + p.g + ' m/s² · ' + p.temp + '<br>' + p.atm + (p.solid ? '' : '(没有固体表面,赛道是漂浮在云顶的平台)') + '<br><span style="color:#93a0c2">' + p.note + '</span>';
  }
  // 背景音乐(选择与音量会记住;“试听”需要用户点一下,这是浏览器的自动播放限制)
  let music = 'drive', vol = 50;
  try { music = localStorage.getItem('race-music') || music; vol = +(localStorage.getItem('race-vol') || vol); } catch (e) {}
  if (!Music.LIST.some(m => m.id === music)) music = 'drive';
  Music.LIST.forEach(m => {
    const b = document.createElement('div'); b.className = 'opt'; b.dataset.id = m.id;
    b.innerHTML = '<b>' + m.name + '</b><small>' + m.desc + '</small>';
    b.onclick = () => { music = m.id; save(); markMusic(); if (!$('game').hidden) Music.play(music); };
    $('music').append(b);
  });
  function markMusic() {
    document.querySelectorAll('#music .opt').forEach(e => e.classList.toggle('on', e.dataset.id === music));
    $('mbtn').textContent = '🎵 ' + Music.LIST.find(m => m.id === music).short;
  }
  function save() { try { localStorage.setItem('race-music', music); localStorage.setItem('race-vol', vol); } catch (e) {} }
  $('vol').value = vol; Music.setVolume(vol / 100);
  $('vol').oninput = () => { vol = +$('vol').value; Music.setVolume(vol / 100); save(); };
  $('mtest').onclick = () => { if ($('mtest').dataset.on) { Music.stop(); delete $('mtest').dataset.on; $('mtest').textContent = '▶ 试听'; } else { Music.play(music); $('mtest').dataset.on = 1; $('mtest').textContent = '■ 停止'; } };
  $('mbtn').onclick = () => { const i = Music.LIST.findIndex(m => m.id === music); music = Music.LIST[(i + 1) % Music.LIST.length].id; save(); markMusic(); Music.play(music); };   // 比赛中点 🎵 切换下一首
  markMusic();
  mark();

  // 开始 / 返回
  function begin() { $('setup').hidden = true; $('game').hidden = false; delete $('mtest').dataset.on; $('mtest').textContent = '▶ 试听'; Music.play(music); Race.start(car, planet); }
  $('start').onclick = begin;
  $('again').onclick = begin;
  $('back').onclick = $('back2').onclick = () => { Race.stop(); Music.stop(); $('game').hidden = true; $('setup').hidden = false; };

  // 键盘:方向键 / WASD
  const map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'gas', w: 'gas', W: 'gas', ArrowDown: 'brake', s: 'brake', S: 'brake', ' ': 'brake' };
  addEventListener('keydown', e => { if (map[e.key]) { Race.keys[map[e.key]] = true; e.preventDefault(); } });
  addEventListener('keyup',   e => { if (map[e.key]) Race.keys[map[e.key]] = false; });
  // 触屏按钮
  document.querySelectorAll('#touch button').forEach(b => {
    const k = b.dataset.k;
    b.onpointerdown = e => { Race.keys[k] = true; e.preventDefault(); };
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => { Race.keys[k] = false; }));
  });
})();
