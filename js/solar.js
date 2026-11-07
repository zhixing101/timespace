/**
 * solar.js — 太阳系 2D 动画
 * Canvas 绘制行星轨道,高亮当前事件所在天体。
 * 依赖(需先加载):timeline.js
 * 提供(全局):B(天体表), pos, draw
 */
const B=[['sun','太阳',0,0,'#ffcc44',9],['mercury','水星',28,4.1,'#aaa',2],['venus','金星',46,1.6,'#e9c28a',3.5],['earth','地球',66,1,'#4a9eff',4],['mars','火星',88,.53,'#e5603c',3.2],['jupiter','木星',118,.084,'#d9a066',7],['saturn','土星',142,.034,'#e8d08a',6],['uranus','天王星',164,.012,'#8ff',4.5],['neptune','海王星',184,.006,'#58f',4.5]];
const cv=$('cv'),g=cv.getContext('2d'),CX=360,CY=200,stars=Array.from({length:90},()=>[Math.random()*720,Math.random()*400,Math.random()*1.4]);
function pos(k,t){const i=B.findIndex(b=>b[0]===k);if(i<1)return[CX,CY];const a=t*B[i][3]*.0004+i*1.7;return[CX+Math.cos(a)*B[i][2]*1.55,CY+Math.sin(a)*B[i][2]*.98]}
function draw(t){g.clearRect(0,0,720,400);g.fillStyle='#fff';stars.forEach(s=>{g.globalAlpha=.4+.4*Math.sin(t*.002+s[0]);g.fillRect(s[0],s[1],s[2],s[2])});g.globalAlpha=1;
 B.forEach((b,i)=>{if(i){g.strokeStyle='#1c2748';g.beginPath();g.ellipse(CX,CY,b[2]*1.55,b[2]*.98,0,0,7);g.stroke()}});
 const hp=cur&&cur.p;
 B.forEach(b=>{const[x,y]=pos(b[0],t);g.fillStyle=b[4];g.beginPath();g.arc(x,y,b[5],0,7);g.fill();
 g.fillStyle='#8b97b8';g.font='11px sans-serif';g.fillText(b[1],x+b[5]+3,y+4)});
 const[ex,ey]=pos('earth',t),ma=t*.004,mx=ex+Math.cos(ma)*13,my=ey+Math.sin(ma)*9;g.fillStyle='#ddd';g.beginPath();g.arc(mx,my,1.8,0,7);g.fill();
 if(hp){let[x,y]=hp==='moon'?[mx,my]:pos(hp,t);const r=10+4*Math.sin(t*.006);g.strokeStyle='#ffb454';g.lineWidth=2;g.beginPath();g.arc(x,y,r,0,7);g.stroke();g.lineWidth=1}
 requestAnimationFrame(draw)}
