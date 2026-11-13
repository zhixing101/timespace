/**
 * map.js — 地球双击 → 打开地图
 * 双击 3D 地球上的一点:算出经纬度;在中国境内推荐腾讯地图,否则推荐谷歌地图(两个按钮都可点)。
 * 依赖(需先加载):config.js(TENCENT_KEY, RACE_URL)
 * 提供(全局):pickToLatLon, isInChina, mapUrls, showMapPopup
 */

/** 球面局部坐标 → 经纬度。与 globe.js 里 setGlobe 的“经纬度 → 坐标”公式互为逆运算。 */
function pickToLatLon(x, y, z) {
  const r = Math.hypot(x, y, z);
  const lat = Math.asin(y / r) * 180 / Math.PI;
  let lon = Math.atan2(z, -x) * 180 / Math.PI - 180;
  if (lon < -180) lon += 360;
  return [lat, lon];
}

/** 中国大致范围(简化多边形,[经度,纬度]);边境附近可能有偏差,所以界面上两个地图都可选 */
const CHINA_POLY = [[73.5,39.5],[74.5,37.5],[75,36],[78,35],[79,32.5],[81,30.2],[84,28.8],[88,27.9],[92,27.8],[96,28.3],[98.5,27],[98.7,24.5],[97.5,23.8],[99,22],[101.5,21.2],[103,22.5],[106.7,22],[108,21.5],[109.8,21.4],[110.5,20.2],[111.5,21.5],[113.5,22],[116.5,22.8],[119,25.3],[120.5,27.5],[121.9,29.5],[122,31],[121,32.5],[120.3,35],[122.5,37.3],[121,38.8],[121.5,40.5],[124.3,40],[126,41.2],[128,42],[130,42.4],[131,43.3],[131,45],[133.1,45],[134.7,48.4],[133,48.1],[130,48.9],[127.5,49.8],[126,52.8],[122,53.5],[120.5,52.5],[118,49.7],[116.7,49.8],[115.5,48],[119.8,46.7],[117.4,46.5],[112,45],[111.5,43.7],[107,42.2],[105,41.6],[101,42.5],[97,42.8],[96.4,44.4],[91,45.2],[90.9,47.7],[87.8,49.2],[85.5,47],[83,47.2],[82.5,45.3],[80.3,44.8],[80.4,42.3],[78,41],[75,40.4]];
function isInChina(lat, lon) {
  if (lon >= 108.6 && lon <= 111.1 && lat >= 18.1 && lat <= 20.2) return true;      // 海南
  if (lon >= 119.9 && lon <= 122.1 && lat >= 21.8 && lat <= 25.4) return true;      // 台湾
  let inside = false;                                                                  // 射线法判断点是否在多边形内
  for (let i = 0, j = CHINA_POLY.length - 1; i < CHINA_POLY.length; j = i++) {
    const [xi, yi] = CHINA_POLY[i], [xj, yj] = CHINA_POLY[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** 生成两个地图的链接(腾讯地图坐标系略有偏移,在城市级缩放下可忽略) */
function mapUrls(lat, lon) {
  const a = lat.toFixed(4), b = lon.toFixed(4);
  return {
    google:  'https://www.google.com/maps/search/?api=1&query=' + a + ',' + b,
    tencent: 'https://apis.map.qq.com/uri/v1/marker?marker=coord:' + a + ',' + b + ';title:' + encodeURIComponent('所选位置') + '&referer=' + encodeURIComponent(TENCENT_KEY || 'timespace')
  };
}

/** 在 3D 区域底部显示弹窗:坐标、推荐地图、赛车入口 */
function showMapPopup(lat, lon, body) {
  const host = document.getElementById('g3');
  let pop = document.getElementById('map-pop');
  if (!pop) { pop = document.createElement('div'); pop.id = 'map-pop'; pop.className = 'map-pop'; host.append(pop); }
  const names = { earth: '地球', moon: '月球', mars: '火星' };
  const btn = (text, fn, on) => { const b = document.createElement('button'); b.className = 'mapbtn' + (on ? ' on' : ''); b.textContent = text; b.onclick = fn; return b; };
  const open = u => window.open(u, '_blank', 'noopener');
  pop.innerHTML = '';
  const t = document.createElement('div');
  t.textContent = '📍 纬度 ' + lat.toFixed(2) + '°,经度 ' + lon.toFixed(2) + '°';
  pop.append(t);
  const row = document.createElement('div'); row.className = 'row';
  if (body === 'earth') {
    const cn = isInChina(lat, lon), u = mapUrls(lat, lon);
    t.textContent += ' · ' + (cn ? '在中国境内(估计)' : '不在中国境内(估计)');
    const tx = btn('腾讯地图', () => open(u.tencent), cn), gg = btn('谷歌地图', () => open(u.google), !cn);
    cn ? row.append(tx, gg) : row.append(gg, tx);
  } else {
    t.textContent += ' · ' + (names[body] || '该天体') + '暂无地图跳转';
  }
  row.append(btn('🏎 在此天体赛车', () => { location.href = RACE_URL + '?planet=' + (body || 'earth'); }), btn('✕', () => pop.remove()));
  pop.append(row);
}
