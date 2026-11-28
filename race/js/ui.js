/**
 * race/js/ui.js — 选择界面与按键/触屏控制
 * 依赖:data.js, engine.js
 */
(function () {
  const $ = id => document.getElementById(id);
  let car = 'spark';
  let planet = new URLSearchParams(location.search).get('planet');
  if (!PLANETS[planet]) planet = 'earth';                 // 从“时空漫游”跳转时可带 ?planet=mars

  // 驾驶员卡片(小鸟用照片头像,其余用 emoji)与视角
  let driver = 'bird', view = 'god';
  try { driver = localStorage.getItem('race-driver') || driver; view = localStorage.getItem('race-view') || view; } catch (e) {}
  if (!DRIVERS.some(d => d.id === driver)) driver = 'bird';
  if (view !== 'god' && view !== 'driver') view = 'god';
  DRIVERS.forEach(d => {
    const b = document.createElement('div'); b.className = 'opt'; b.dataset.id = d.id;
    const face = d.img ? '<img class="face" src="' + d.img + '" alt="' + d.name + '">' : '<span class="face emo">' + d.emoji + '</span>';
    b.innerHTML = face + '<b>' + d.name + '</b><small>' + d.desc + '</small>';
    b.onclick = () => { driver = d.id; try { localStorage.setItem('race-driver', d.id); } catch (e) {} mark(); };
    $('drivers').append(b);
  });
  const VIEWS = [['god', '🛰 上帝视角', '从高处看整条赛道,正北朝上,看得远'], ['driver', '👀 驾驶员视角', '车头朝前、画面拉近,单词牌变得很大,更容易读']];
  VIEWS.forEach(v => {
    const b = document.createElement('div'); b.className = 'opt'; b.dataset.id = v[0];
    b.innerHTML = '<b>' + v[1] + '</b><small>' + v[2] + '</small>';
    b.onclick = () => { setView(v[0]); };
    $('views').append(b);
  });
  function setView(v) { view = v; try { localStorage.setItem('race-view', v); } catch (e) {} Race.setView(v); mark(); }
  $('vbtn').onclick = () => setView(view === 'god' ? 'driver' : 'god');

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
  // 赛道(难度):名字、星级、障碍与单词数量
  let track = 'easy';
  try { track = localStorage.getItem('race-track') || track; } catch (e) {}
  if (!TRACKS[track]) track = 'easy';
  Object.keys(TRACKS).forEach(k => {
    const t = TRACKS[k], b = document.createElement('div'); b.className = 'opt'; b.dataset.id = k;
    b.innerHTML = '<b>' + t.name + ' · ' + '★'.repeat(t.stars) + '☆'.repeat(3 - t.stars) + ' ' + t.level + '</b><small>' + t.desc + '</small><br><small>障碍 ' + t.obst + ' · 单词牌 ' + t.words + '</small>';
    b.onclick = () => { track = k; try { localStorage.setItem('race-track', k); } catch (e) {} mark(); };
    $('tracks').append(b);
  });
  // 玩家人数与每位玩家的驾驶员/赛车
  const PN = ['#ff5d5d', '#4ade80', '#60a5fa', '#fbbf24'], KEYTXT = ['WASD', '方向键', 'I J K L', 'T F G H'];
  let nPl = 1; try { nPl = +(localStorage.getItem('race-npl') || 1); } catch (e) {} if (!(nPl >= 1 && nPl <= 4)) nPl = 1;
  const pl = [0, 1, 2, 3].map(i => ({ driver: DRIVERS[i % DRIVERS.length].id, car: CARS[i % CARS.length].id }));
  [1, 2, 3, 4].forEach(n => { const b = document.createElement('div'); b.className = 'opt'; b.dataset.id = n; b.innerHTML = '<b>' + ['🧑', '👫', '👨‍👩‍👦', '👨‍👩‍👧‍👦'][n - 1] + ' ' + n + ' 人</b><small>' + (n === 1 ? '单人,可用 WASD 或方向键' : '分屏对战 · 同一键盘/手柄') + '</small>'; b.onclick = () => { nPl = n; try { localStorage.setItem('race-npl', n); } catch (e) {} mark(); }; $('npl').append(b); });
  function buildPls() {
    const box = $('pls'); box.innerHTML = '';
    $('h1p').hidden = $('h2p').hidden = $('drivers').hidden = $('cars').hidden = nPl > 1;
    if (nPl === 1) return;
    for (let i = 0; i < nPl; i++) {
      const d = document.createElement('div'); d.className = 'pl';
      d.innerHTML = '<b style="color:' + PN[i] + '">P' + (i + 1) + '</b> <small>' + KEYTXT[i] + '</small> 驾驶员 <select data-k="driver">' + DRIVERS.map(x => '<option value="' + x.id + '"' + (x.id === pl[i].driver ? ' selected' : '') + '>' + x.name + '</option>').join('') + '</select> 赛车 <select data-k="car">' + CARS.map(x => '<option value="' + x.id + '"' + (x.id === pl[i].car ? ' selected' : '') + '>' + x.name + '</option>').join('') + '</select>';
      d.querySelectorAll('select').forEach(s => s.onchange = () => { pl[i][s.dataset.k] = s.value; });
      box.append(d);
    }
  }
  function mark() {
    document.querySelectorAll('#npl .opt').forEach(e => e.classList.toggle('on', +e.dataset.id === nPl)); buildPls();
    document.querySelectorAll('#drivers .opt').forEach(e => e.classList.toggle('on', e.dataset.id === driver));
    document.querySelectorAll('#views .opt').forEach(e => e.classList.toggle('on', e.dataset.id === view));
    $('vbtn').textContent = view === 'driver' ? '👀 驾驶员' : '🛰 上帝';
    document.querySelectorAll('#tracks .opt').forEach(e => e.classList.toggle('on', e.dataset.id === track));
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
  function begin() { $('setup').hidden = true; $('game').hidden = false; delete $('mtest').dataset.on; $('mtest').textContent = '▶ 试听'; Music.play(music); Race.start(car, planet, track, { speak: $('speak').checked, driver, view, ai: $('aifill').checked, players: nPl === 1 ? [{ driver, car }] : pl.slice(0, nPl).map(p => ({ driver: p.driver, car: p.car })) }); }
  $('start').onclick = begin;
  $('again').onclick = begin;
  $('back').onclick = $('back2').onclick = () => { Race.stop(); Music.stop(); $('game').hidden = true; $('setup').hidden = false; };

  // 键盘:单人 = WASD + 方向键 + 空格;多人 P1 WASD / P2 方向键 / P3 IJKL / P4 TFGH
  const KM = [['a', 'd', 'w', 's'], ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], ['j', 'l', 'i', 'k'], ['f', 'h', 't', 'g']], ACT = ['left', 'right', 'gas', 'brake'];
  function setKey(e, v) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; let hit = false;
    for (let p = 0; p < 4; p++) { const i = KM[p].indexOf(k); if (i < 0) continue; hit = true; if (nPl === 1 && p > 1) continue; if (nPl > 1 && p >= nPl) continue; Race.pk[nPl === 1 ? 0 : p][ACT[i]] = v; }
    if (nPl === 1 && k === ' ') { Race.pk[0].brake = v; hit = true; }
    return hit;
  }
  addEventListener('keydown', e => { if ((e.key === 'v' || e.key === 'V') && !$('game').hidden) { setView(view === 'god' ? 'driver' : 'god'); return; } if (setKey(e, true) && !$('game').hidden) e.preventDefault(); });
  addEventListener('keyup', e => { setKey(e, false); });
  // 触屏按钮
  document.querySelectorAll('#touch button').forEach(b => {
    const k = b.dataset.k;
    b.onpointerdown = e => { Race.keys[k] = true; e.preventDefault(); };
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => { Race.keys[k] = false; }));
  });
})();
