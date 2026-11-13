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
const PLANET_ORDER = ['mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
