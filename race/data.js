/**
 * race/data.js — 车型与天体环境数据
 * 环境参数含义:
 *   air   大气阻力(0=真空)      grip 地面抓地系数      pw 动力系数(高温/低温影响发动机)
 *   wind  风力强度               solid 是否有固体表面(巨行星没有,赛道是悬浮在云顶的平台)
 *   g 表面重力 m/s²;temp/atm 仅用于展示。数据为近似值。
 */
const CARS = [
  { id: 'spark', name: '闪电跑车', color: '#ef4444', power: 1.0,  turn: 1.0,  grip: 0.9, maxv: 620, off: 1.0, hover: false, windRes: 0,   desc: '速度最快,抓地一般' },
  { id: 'rover', name: '越野车',   color: '#22c55e', power: 0.85, turn: 1.05, grip: 1.3, maxv: 520, off: 0.45, hover: false, windRes: 0.2, desc: '抓地强,冲出赛道损失小' },
  { id: 'truck', name: '重型卡车', color: '#f59e0b', power: 0.75, turn: 0.8,  grip: 1.1, maxv: 480, off: 0.7, hover: false, windRes: 0.7, desc: '车身重,几乎不怕风' },
  { id: 'hover', name: '悬浮车',   color: '#38bdf8', power: 0.95, turn: 1.1,  grip: 0.55, maxv: 580, off: 0.3, hover: true,  windRes: 0,   desc: '靠空气垫漂移;空气稀薄处动力下降' }
];

/**
 * 驾驶员:mods 是对赛车属性的倍率(windRes 为加法),AI 车手会分到其余驾驶员。
 * img 有图片时用图片(小鸟 = 玄凤鹦鹉照片),否则用 emoji。
 */
const DRIVERS = [
  { id: 'bird',    name: '小鸟',  emoji: '🐦', img: 'img/bird.png', mods: { turn: 1.12, grip: 1.05 },   desc: '玄凤鹦鹉:灵活,转向更好' },
  { id: 'lion',    name: '狮子',  emoji: '🦁', img: 'img/lion.png',           mods: { power: 1.08, maxv: 1.02 },  desc: '力量大,加速更猛' },
  { id: 'cheetah', name: '猎豹',  emoji: '🐆', img: 'img/cheetah.png',           mods: { maxv: 1.08, grip: 0.95 },   desc: '最高速度更快,但抓地略差' },
  { id: 'dino',    name: '恐龙',  emoji: '🦖', img: 'img/dino.png',           mods: { off: 0.7, windRes: 0.2 },   desc: '皮厚:冲出赛道和大风都不怕' }
];

const PLANETS = {
  mercury: { name: '水星', en: 'Mercury', g: 3.7,  temp: '白天约 430°C,夜晚约 -180°C', atm: '几乎没有大气', air: 0.0,  grip: 0.7,  pw: 1.0,  wind: 0,   solid: true,  fx: 'none',
             ground: '#6f6f73', craters: '#58585c', road: '#303036', fog: null,
             note: '没有空气阻力,重力小、抓地差,车容易滑出去。' },
  venus:   { name: '金星', en: 'Venus',   g: 8.87, temp: '地表约 464°C',               atm: '极浓的二氧化碳大气(约 92 个大气压)', air: 0.55, grip: 0.9,  pw: 0.8,  wind: 15,  solid: true,  fx: 'lightning',
             ground: '#b8772e', craters: '#9a6122', road: '#4a2f16', fog: 'rgba(255,170,60,0.22)',
             note: '空气像浓汤,阻力很大;高温让发动机降低动力。' },
  earth:   { name: '地球', en: 'Earth',   g: 9.81, temp: '平均约 15°C',                atm: '氮气和氧气,约 1 个大气压', air: 0.30, grip: 1.0,  pw: 1.0,  wind: 0,   solid: true,  fx: 'none',
             ground: '#4a9d4a', craters: '#3f8a3f', road: '#3b3b42', fog: null,
             note: '标准环境,最容易上手。' },
  moon:    { name: '月球(卫星)', en: 'Moon', g: 1.62, temp: '白天约 120°C,夜晚约 -130°C', atm: '几乎没有大气', air: 0.0,  grip: 0.6,  pw: 1.0,  wind: 0,   solid: true,  fx: 'none',
             ground: '#8d8d90', craters: '#707074', road: '#2f2f35', fog: null,
             note: '重力只有地球的六分之一,抓地很差。(附加地点)' },
  mars:    { name: '火星', en: 'Mars',    g: 3.71, temp: '平均约 -63°C',                atm: '稀薄的二氧化碳大气', air: 0.08, grip: 0.7,  pw: 0.95, wind: 40,  solid: true,  fx: 'dust',
             ground: '#b4532e', craters: '#9a4626', road: '#5e2f1d', fog: 'rgba(210,120,70,0.20)',
             note: '沙尘暴时视线变差,阵风吹偏车子;空气稀薄,悬浮车动力下降。' },
  pluto:   { name: '冥王星', en: 'Pluto', g: 0.62, temp: '平均约 -230°C', atm: '极稀薄的氮气大气', air: 0.01, grip: 0.65, pw: 0.9, wind: 0, solid: true, fx: 'none',
             ground: '#bfa58f', craters: '#a58f7a', road: '#3a3340', fog: null,
             note: '重力只有地球的约 6%,冰面抓地差,车容易漂。(新视野号 2015 年飞掠过这里)' },
  jupiter: { name: '木星', en: 'Jupiter', g: 24.79, temp: '云顶(1 个大气压处)约 -108°C', atm: '氢和氦,没有固体表面', air: 0.45, grip: 1.25, pw: 0.9, wind: 90,  solid: false, fx: 'lightning',
             bands: ['#d9a066', '#c58a50', '#e8c690', '#b87a45'], road: '#5a4636', fog: null,
             note: '没有固体表面,赛道是漂浮在云顶的平台;重力最大,抓地强,但风暴很猛。' },
  saturn:  { name: '土星', en: 'Saturn',  g: 10.44, temp: '云顶约 -139°C',               atm: '氢和氦,没有固体表面', air: 0.40, grip: 1.0,  pw: 0.9, wind: 110, solid: false, fx: 'wind',
             bands: ['#e8d08a', '#d6bf78', '#f0dca0', '#cdb36a'], road: '#6b5a3a', fog: null,
             note: '赛道漂浮在云顶,头顶有壮观的行星环(想象);风很大。' },
  uranus:  { name: '天王星', en: 'Uranus', g: 8.87, temp: '云顶约 -197°C',               atm: '氢、氦和甲烷,没有固体表面', air: 0.38, grip: 0.9, pw: 0.85, wind: 80, solid: false, fx: 'wind',
             bands: ['#9fe6ea', '#86d3d8', '#b5f0f2', '#78c4ca'], road: '#2f5a63', fog: null,
             note: '极冷,电池变弱,动力下降;赛道漂浮在蓝绿色云顶。' },
  neptune: { name: '海王星', en: 'Neptune', g: 11.15, temp: '云顶约 -201°C',              atm: '氢、氦和甲烷,没有固体表面', air: 0.42, grip: 1.0, pw: 0.85, wind: 140, solid: false, fx: 'wind',
             bands: ['#4d6fe0', '#3f5fc8', '#6d8cf0', '#3652b5'], road: '#1d2a66', fog: null,
             note: '太阳系风速最快的行星之一,侧风会把车吹得到处跑。' }
};
const PLANET_ORDER = ['mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

/**
 * 赛道:ctrl = 中心线控制点(闭合曲线),road = 路半宽(越小越难),obst = 障碍数量,words = 单词牌数量,move = 是否有左右移动的障碍。
 * 想新增赛道:加一项即可(控制点太急的弯会让路面“折叠”,转弯半径建议 ≥ 路半宽的 1.2 倍)。
 */
const TRACKS = {
  easy: { name: '新手环道', stars: 1, level: '简单', road: 150, obst: 8, words: 10, move: false,
          desc: '路宽、弯缓、障碍少,先熟悉操作',
          ctrl: [[0,-700],[900,-800],[1500,-300],[1300,300],[600,500],[300,900],[-500,900],[-1300,500],[-1400,-200],[-800,-600]] },
  medium: { name: '山路弯弯', stars: 2, level: '中等', road: 120, obst: 14, words: 14, move: false,
          desc: '路窄一些,弯更多,障碍更密',
          ctrl: [[0,-900],[900,-1000],[1700,-650],[1900,100],[1500,700],[1500,1300],[700,1600],[-200,1300],[-800,1500],[-1600,1100],[-1900,300],[-1500,-300],[-900,-800]] },
  hard: { name: '蛇形挑战', stars: 3, level: '困难', road: 85, obst: 22, words: 18, move: true,
          desc: '又窄又长,急弯连连,还有左右晃动的障碍',
          ctrl: [[0,-1000],[1000,-1200],[1900,-700],[1500,-100],[1900,600],[1200,1100],[600,800],[100,1400],[-700,1500],[-1400,1000],[-1000,400],[-1700,100],[-1600,-600],[-900,-600]].map(p => [p[0] * 1.4, p[1] * 1.4]) }
};

/** 英语单词(en 英文 / zh 中文 / ja 日语读音)。赛道上的单词牌从这里随机抽取。 */
const WORDS = [
  ['tea','茶','おちゃ'],['cup','杯子','カップ'],['hat','帽子','ぼうし'],['table','桌子','テーブル'],['chair','椅子','いす'],['clock','钟','とけい'],
  ['sit','坐','すわる'],['drink','喝','のむ'],['move','移动','うごく'],['sleep','睡觉','ねむる'],['wait','等待','まつ'],['mad','疯狂的','おかしい'],
  ['sun','太阳','たいよう'],['moon','月亮','つき'],['star','星星','ほし'],['rocket','火箭','ロケット'],['planet','行星','わくせい'],['wind','风','かぜ'],
  ['rain','雨','あめ'],['cloud','云','くも'],['hot','热','あつい'],['cold','冷','つめたい'],['fast','快','はやい'],['slow','慢','おそい'],
  ['car','汽车','くるま'],['road','路','みち'],['race','比赛','レース'],['win','赢','かつ'],['rock','岩石','いわ'],['dust','灰尘','ほこり'],
  ['ice','冰','こおり'],['storm','风暴','あらし'],['fly','飞','とぶ'],['stop','停','とまる'],['go','走','いく'],['left','左','ひだり'],['right','右','みぎ'],['fire','火','ひ']
].map(w => ({ en: w[0], zh: w[1], ja: w[2] }));
