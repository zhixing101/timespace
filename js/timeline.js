/**
 * timeline.js — 时间轴核心
 * 对数时间轴换算、滑块、事件切换(go)、电影模式、上一个/下一个、刻度与按钮渲染。
 * 依赖(需先加载):config.js, data/*.js
 * 提供(全局):all, y2u, u2y, fy, show, go, stop, renderTicks, $, sl, PN, plans
 */
let plans=[];try{plans=JSON.parse(localStorage.getItem('tsplans')||'[]')}catch(e){}
const all=()=>E.concat(plans,COURSES.map(c=>({y:c.y,p:c.p,l:c.l,la:c.la,lo:c.lo,t:'📚 '+c.t,d:c.sum+'(点击下方按钮进入课程)',course:c.id}))).sort((a,b)=>a.y-b.y);
const y2u=y=>{const d=y-NOW;return d<0?-Math.min(1,Math.log10(-d+1)/8.4):Math.min(1,Math.log10(d+1)/4)};
const u2y=u=>NOW+(u<0?-(Math.pow(10,-u*8.4)-1):Math.pow(10,u*4)-1);
const sl=document.getElementById('sl'),$=id=>document.getElementById(id);
function fy(y){const d=y-NOW;if(d<-1e8)return(-d/1e8).toFixed(1)+' 亿年前';if(d<-1e4)return Math.round(-d/1e4)+' 万年前';
 if(y<=0)return '公元前 '+Math.round(-y)+' 年';return '公元 '+Math.floor(y+1e-9)+' 年'}
const PN={earth:'地球',moon:'月球',mars:'火星',venus:'金星',jupiter:'木星',mercury:'水星',saturn:'土星'};
let cur=null;
function show(){const u=sl.value/1000,y=u2y(u);let best=null,bd=9;
 all().forEach(e=>{const dd=Math.abs(y2u(e.y)-u);if(dd<bd){bd=dd;best=e}});
 // 滑块分辨率有限(对数轴上过去几年内的事件挤在同一格),所以优先用“刚跳转到的那个事件”
 if(TARGET&&TARGET.t&&Math.abs(y2u(TARGET.y)-u)<.004){best=TARGET;bd=Math.abs(y2u(TARGET.y)-u)}
 cur=best;
 $('when').textContent=fy(y)+(best&&bd<.004?'':'(附近最近事件如下)');clk(y,best,bd);
 if(best){$('where').textContent='📍 '+PN[best.p]+' · '+best.l+'  |  '+fy(best.y);
 $('what').innerHTML='';const b=document.createElement('b');b.textContent=best.t+(best.plan?'(我的计划)':'');
 $('what').append(b,document.createElement('br'),best.d);setGlobe(best);renderInfo(best);if(best.course){const lk=document.createElement('button');lk.textContent='进入课程 →';lk.onclick=()=>openCourse(best.course);$('what').append(document.createElement('br'),lk)}}}
sl.oninput=()=>{TARGET=null;stop();show()};
function renderTicks(){$('track').innerHTML='';$('chips').innerHTML='';const a=all();
 a.forEach(e=>{const t=document.createElement('div');t.className='tk'+(e.plan?' plan':'')+(e.course?' crs':'');t.style.left=((y2u(e.y)+1)/2*100)+'%';$('track').append(t);
 const c=document.createElement('button');c.className='chip'+(e.plan?' plan-c':'')+(e.course?' crs':'');c.textContent=e.t;c.onclick=()=>{stop();go(e)};$('chips').append(c)});
 $('ps').innerHTML='';plans.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p.date+' '+PN[p.p]+' '+p.t;$('ps').append(o)})}
let tw=null;
let TARGET=null;   // 最近一次 go() 跳转的目标事件(手动拖动滑块时清空)
function go(e,cb){TARGET=e;LIVE=false;clearInterval(tw);const from=+sl.value,to=Math.round(y2u(e.y)*1000),s=performance.now(),dur=1400;
 tw=setInterval(()=>{const k=Math.min(1,(performance.now()-s)/dur),q=k*k*(3-2*k);sl.value=from+(to-from)*q;show();if(k>=1){clearInterval(tw);cb&&cb()}},30)}
let auto=false,at=null;
function stop(){auto=false;clearTimeout(at);$('play').textContent='▶ 电影模式'}
function step(d){const a=all();let i=a.indexOf(cur);i=(i+d+a.length)%a.length;go(a[i])}
$('prev').onclick=()=>{stop();step(-1)};$('next').onclick=()=>{stop();step(1)};
$('now').onclick=()=>{stop();go({y:YNOW()},()=>{LIVE=true;liveTick()})};
$('play').onclick=()=>{if(auto){stop();return}auto=true;$('play').textContent='⏸ 暂停';const a=all();let i=0;
 const run=()=>{if(!auto)return;if(i>=a.length)i=0;go(a[i],()=>{i++;at=setTimeout(run,4200)})};
 const near=a.findIndex(e=>e.y>=u2y(sl.value/1000));i=near<0?0:near;run()};
