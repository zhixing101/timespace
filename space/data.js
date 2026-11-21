/**
 * space/data.js — 星际旅行:航天器、任务地图(太阳系巡游 / 星座穿梭)
 * 驾驶员沿用赛车页的 DRIVERS(../race/data.js),这里只把头像路径改成相对 space/ 的路径。
 * 长度单位是“游戏单位”(不是真实比例:太阳系被大幅压缩,方便在一两分钟里飞完)。
 */
DRIVERS.forEach(d => { if (d.img && !d.img.startsWith('../')) d.img = '../race/' + d.img; });

/** 航天器:thrust 推力、maxv 最高速度、turn 转向、brake 制动、shield 护盾、fuel 燃料(加速用)、boost 加速倍数 */
const CRAFTS = [
  { id: 'rocket',  name: '火箭',     en: 'Rocket',        color: '#e5e7eb', thrust: 1.25, maxv: 620, turn: 0.85, brake: 0.8, shield: 100, fuel: 100, boost: 2.4, desc: '加速最猛,但转弯笨重' },
  { id: 'shuttle', name: '航天飞机', en: 'Space Shuttle', color: '#f8fafc', thrust: 1.0,  maxv: 560, turn: 1.1,  brake: 1.2, shield: 120, fuel: 100, boost: 2.0, desc: '均衡,刹车好,护盾厚' },
  { id: 'ship',    name: '宇宙飞船', en: 'Spaceship',     color: '#93c5fd', thrust: 0.9,  maxv: 520, turn: 1.45, brake: 1.0, shield: 110, fuel: 120, boost: 2.0, desc: '最灵活,适合穿过小行星带' },
  { id: 'warp',    name: '曲速飞船', en: 'Warp Ship',     color: '#c4b5fd', thrust: 0.85, maxv: 760, turn: 0.8,  brake: 0.7, shield: 90,  fuel: 140, boost: 2.8, desc: '(想象)速度最高,燃料最多' }
];

const DEG = Math.PI / 180;
const T = (zh, en, ja) => ({ zh, en, ja });

/** 任务:id、名称、说明。地图由 buildWorld 生成 */
const MISSIONS = [
  { id: 'solar', name: '太阳系巡游', desc: '飞过地球、月球、火星、小行星带、木星、土星、天王星、海王星、柯伊伯带和冥王星' },
  { id: 'stars', name: '星座穿梭', desc: '在猎户座、北斗七星、仙后座的恒星之间穿梭,穿过猎户座星云,飞向仙女座星系' }
];

/** 生成地图:返回 { objs, lines, extent, start, orbits, belts } */
function buildWorld(id) {
  let s = 20261121; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const W = { objs: [], lines: [], orbits: [], belts: [], start: null, extent: null };
  const add = o => { W.objs.push(o); return o; };
  if (id === 'solar') {
    const P = [   // id, 轨道半径, 角度, 半径, 颜色, 名字, 事实
      ['mercury', 700, 30, 40, '#9ca3af', T('水星', 'Mercury', '水星(すいせい)'), '离太阳最近,没有大气,昼夜温差极大。'],
      ['venus', 1050, 200, 70, '#e9c28a', T('金星', 'Venus', '金星(きんせい)'), '浓厚的二氧化碳大气,是太阳系最热的行星。'],
      ['earth', 1450, 300, 80, '#3b82f6', T('地球', 'Earth', '地球(ちきゅう)'), '我们的家,表面约 71% 是海洋。'],
      ['mars', 1950, 15, 55, '#e5603c', T('火星', 'Mars', '火星(かせい)'), '红色的星球,有太阳系最高的火山奥林帕斯山。'],
      ['jupiter', 4200, 120, 220, '#d9a066', T('木星', 'Jupiter', '木星(もくせい)'), '最大的行星,大红斑是一场持续数百年的风暴。'],
      ['saturn', 5200, 250, 190, '#e8d08a', T('土星', 'Saturn', '土星(どせい)'), '有壮观的行星环,密度比水还小。'],
      ['uranus', 6100, 60, 120, '#7de3e8', T('天王星', 'Uranus', '天王星(てんのうせい)'), '躺着绕太阳转的冰巨星。'],
      ['neptune', 6900, 330, 115, '#4f6ff0', T('海王星', 'Neptune', '海王星(かいおうせい)'), '风速极快的蓝色冰巨星。'],
      ['pluto', 8600, 160, 36, '#d6b9a0', T('冥王星', 'Pluto', '冥王星(めいおうせい)'), '柯伊伯带里最著名的矮行星。']
    ];
    add({ k: 'sun', id: 'sun', x: 0, y: 0, r: 380, col: '#ffcc44', name: T('太阳', 'Sun', '太陽(たいよう)'), z: 0 });
    P.forEach(p => {
      const a = p[2] * DEG, o = add({ k: 'planet', id: p[0], x: Math.cos(a) * p[1], y: Math.sin(a) * p[1], r: p[3], col: p[4], name: p[5], fact: p[6], stop: true, trig: p[3] + 260, z: 0, ring: p[0] === 'saturn' });
      W.orbits.push(p[1]);
      if (p[0] === 'earth') add({ k: 'planet', id: 'moon', x: o.x + 230, y: o.y - 90, r: 28, col: '#cbd5e1', name: T('月球', 'Moon', '月(つき)'), fact: '地球唯一的天然卫星,约 27.3 天绕地球一圈。', stop: true, trig: 230, z: 0 });
    });
    W.belts.push({ id: 'asteroid', r0: 2500, r1: 3300, name: T('小行星带', 'Asteroid Belt', '小惑星帯(しょうわくせいたい)'), fact: '火星和木星之间,有几十万颗岩石小天体。', col: '#9a8f80', n: 170, size: [12, 44] });
    W.belts.push({ id: 'kuiper', r0: 7600, r1: 9400, name: T('柯伊伯带', 'Kuiper Belt', 'カイパーベルト'), fact: '海王星之外的冰冻小天体带,冥王星就在这里。', col: '#8fb4d8', n: 230, size: [14, 60] });
    W.belts.forEach(b => { for (let i = 0; i < b.n; i++) { const a = rnd() * 6.2832, d = b.r0 + rnd() * (b.r1 - b.r0); add({ k: 'rock', x: Math.cos(a) * d, y: Math.sin(a) * d, r: b.size[0] + rnd() * (b.size[1] - b.size[0]), col: b.col, z: (rnd() - 0.5) * 500, ph: rnd() * 6 }); }
      add({ k: 'belt', id: b.id, x: 0, y: 0, r: 0, r0: b.r0, r1: b.r1, name: b.name, fact: b.fact, stop: true }); });
    const e = W.objs.find(o => o.id === 'earth'), a0 = Math.atan2(e.y, e.x);
    W.start = { x: e.x + Math.cos(a0) * 420, y: e.y + Math.sin(a0) * 420, a: a0 };
    W.extent = { x0: -10200, y0: -10200, x1: 10200, y1: 10200 };
  } else {
    const CON = [   // 星座:原点偏移 + 星(名字、相对坐标)+ 连线
      { id: 'orion', name: T('猎户座', 'Orion', 'オリオン座'), ox: 0, oy: 0, col: '#bcd4ff', stars: [
        ['参宿四', 'Betelgeuse', 'ベテルギウス', -520, -1150, '红超巨星,是猎户的肩膀,体积巨大。'], ['参宿五', 'Bellatrix', 'ベラトリックス', 520, -1050, '猎户另一侧的肩膀,蓝白色亮星。'],
        ['参宿三', 'Mintaka', 'ミンタカ', 260, -140, '猎户腰带最右边的一颗。'], ['参宿二', 'Alnilam', 'アルニラム', 0, -70, '腰带中间的蓝色超巨星。'], ['参宿一', 'Alnitak', 'アルニタク', -250, 0, '腰带的另一端。'],
        ['参宿六', 'Saiph', 'サイフ', -430, 1050, '猎户的左脚。'], ['参宿七', 'Rigel', 'リゲル', 560, 950, '猎户的右脚,蓝白色超巨星,非常明亮。']],
        links: [[0, 4], [1, 2], [4, 3], [3, 2], [4, 5], [2, 6], [0, 1]] },
      { id: 'dipper', name: T('北斗七星', 'Big Dipper', '北斗七星(ほくとしちせい)'), ox: 5200, oy: -3600, col: '#ffe9a8', stars: [
        ['天枢', 'Dubhe', 'ドゥーベ', 0, 0, '勺口的一角;天枢和天璇连线延长,可以找到北极星。'], ['天璇', 'Merak', 'メラク', -80, 520, '和天枢一起“指向”北极星。'], ['天玑', 'Phecda', 'フェクダ', 480, 600, '勺底的一角。'], ['天权', 'Megrez', 'メグレズ', 470, 100, '七颗星里最暗的一颗。'],
        ['玉衡', 'Alioth', 'アリオト', 900, 50, '勺柄的第一颗。'], ['开阳', 'Mizar', 'ミザール', 1300, -100, '旁边有一颗小星“辅”,古人用它测视力。'], ['摇光', 'Alkaid', 'アルカイド', 1750, -300, '勺柄的末端。']],
        links: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
      { id: 'cass', name: T('仙后座', 'Cassiopeia', 'カシオペヤ座'), ox: -6200, oy: -4200, col: '#ffc9e3', stars: [
        ['王良四', 'Caph', 'カフ', 0, 0, 'W 形的一端。'], ['王良一', 'Schedar', 'シェダル', 300, 350, '仙后座最亮的星之一。'], ['策', 'Navi', 'ナヴィ', 650, 100, 'W 中间的尖角。'], ['阁道三', 'Ruchbah', 'ルクバー', 1000, 400, 'W 的第四颗。'], ['阁道二', 'Segin', 'セギン', 1300, 50, 'W 的另一端。']],
        links: [[0, 1], [1, 2], [2, 3], [3, 4]] }
    ];
    CON.forEach(c => { const idx = [];
      c.stars.forEach((st, i) => { idx.push(add({ k: 'star', id: c.id + i, con: c.id, x: c.ox + st[3], y: c.oy + st[4], r: 55, col: c.col, name: T(st[0], st[1], st[2]), fact: st[5], stop: true, trig: 170, z: (rnd() - 0.5) * 300 })); });
      c.links.forEach(l => W.lines.push([idx[l[0]], idx[l[1]], c.id])); add({ k: 'label', x: c.ox + 600, y: c.oy - 260, name: c.name, col: c.col, z: 0 }); });
    add({ k: 'neb', id: 'm42', x: 0, y: 520, r: 360, col: [255, 90, 170], name: T('猎户座星云 M42', 'Orion Nebula', 'オリオン大星雲'), fact: '约 1344 光年外,新恒星正在这里诞生,猎户“剑”上的模糊亮点就是它。', stop: true, trig: 230, z: 0 });
    add({ k: 'galaxy', id: 'm31', x: -4700, y: -1800, r: 520, col: [190, 200, 255], name: T('仙女座星系 M31', 'Andromeda Galaxy', 'アンドロメダ銀河'), fact: '约 254 万光年,是离银河系最近的大星系,暗夜里肉眼能看到一小团光。', stop: true, trig: 420, z: 0 });
    for (let i = 0; i < 70; i++) add({ k: 'rock', x: (rnd() - 0.5) * 13000, y: (rnd() - 0.5) * 11000, r: 14 + rnd() * 40, col: '#8b8f99', z: (rnd() - 0.5) * 600, ph: rnd() * 6 });
    W.start = { x: 0, y: 2900, a: -Math.PI / 2 };
    W.extent = { x0: -7500, y0: -5600, x1: 7600, y1: 3600 };
  }
  return W;
}
