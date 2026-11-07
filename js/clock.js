/**
 * clock.js — 年月日时分秒显示
 * 滑块位置→公历时间;有精确时刻的事件显示精确时间;“回到现在”后实时走时。
 * 依赖(需先加载):timeline.js
 * 提供(全局):clk, liveTick, d2y, y2d, fmt, YNOW, LIVE, P2
 */
let LIVE=false,lastInfo=null;
const P2=n=>String(n).padStart(2,'0');
const ys=Y=>{const a=new Date(0);a.setUTCFullYear(Y,0,1);a.setUTCHours(0,0,0,0);return a};
const y2d=y=>{const Y=Math.floor(y),a=ys(Y),b=ys(Y+1);return new Date(a.getTime()+(y-Y)*(b-a))};
const d2y=d=>{const Y=d.getUTCFullYear(),a=ys(Y),b=ys(Y+1);return Y+(d-a)/(b-a)};
const YNOW=()=>d2y(new Date());
function fmt(d,loc){const g=loc?['getFullYear','getMonth','getDate','getHours','getMinutes','getSeconds']:['getUTCFullYear','getUTCMonth','getUTCDate','getUTCHours','getUTCMinutes','getUTCSeconds'],v=g.map(k=>d[k]()),Y=v[0];
 return [(Y<=0?'公元前 '+(1-Y):Y)+' 年 '+P2(v[1]+1)+' 月 '+P2(v[2])+' 日',P2(v[3])+':'+P2(v[4])+':'+P2(v[5])]}
function clk(y,e,bd){let a,b,tg='';
 if(Math.abs(y-1970)>2.6e5){a='约 '+fy(y);b='--:--:--';tg='远古:只能精确到“约多少年”'}
 else if(e&&bd<.004){if(e.dt){[a,b]=fmt(new Date(e.dt),false);if(e.dt.length<=10)b='--:--:--';tg=e.dt.length>10?'UTC · 事件发生时刻':'事件日期'}else{a='约 '+fy(e.y);b='--:--:--';tg='事件年份(无精确时刻)'}}
 else{[a,b]=fmt(y2d(y),false);tg='UTC · 滑块位置(公历推算)'}
 $('clk').textContent=a+'  '+b;$('clkt').textContent=tg}
function liveTick(){const [a,b]=fmt(new Date(),true);$('clk').textContent=a+'  '+b;$('clkt').textContent='本地时间 · 实时走时'}
setInterval(()=>{if(LIVE)liveTick()},1000);
