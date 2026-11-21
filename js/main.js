/**
 * main.js — 启动
 * 最后加载:绘制刻度、显示当前事件、启动动画。
 * 依赖(需先加载):全部模块
 * 提供(全局):
 */
renderTicks();show();requestAnimationFrame(draw);
// 赛车入口:带上当前事件所在的天体(地球/月球/火星),赛车页会预选该地点
$('rc').onclick=()=>{const b=(cur&&['earth','moon','mars'].includes(cur.p))?cur.p:'earth';location.href=RACE_URL+'?planet='+b};

$('sp').onclick=()=>{location.href=SPACE_URL};
