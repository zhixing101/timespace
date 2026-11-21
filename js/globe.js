/**
 * globe.js — 3D 天体(three.js)
 * 用程序生成纹理的地球/月球/火星,按事件经纬度转动并标记;支持拖拽旋转。
 * 依赖(需先加载):three.min.js, timeline.js
 * 提供(全局):setGlobe, mkTex
 */
// three.js 未加载(离线)时,只显示提示,其余功能照常
if (typeof THREE !== 'undefined') {
const LAND=[[[-168,66],[-140,70],[-95,72],[-80,70],[-62,58],[-55,50],[-67,44],[-76,35],[-81,25],[-97,26],[-105,20],[-95,16],[-83,9],[-90,14],[-105,23],[-115,32],[-125,42],[-125,50],[-140,59],[-165,60]],[[-80,8],[-60,10],[-50,0],[-35,-6],[-40,-22],[-58,-38],[-66,-55],[-74,-50],[-72,-30],[-81,-5]],[[-10,36],[-9,43],[0,50],[10,55],[28,70],[60,70],[100,78],[140,72],[180,68],[170,60],[140,52],[130,40],[122,30],[110,20],[105,10],[98,8],[100,15],[90,22],[80,10],[72,20],[58,24],[48,30],[35,35],[28,41],[20,40],[12,38],[3,40],[-5,36]],[[35,30],[43,13],[55,17],[58,24],[48,30]],[[-17,21],[-10,35],[10,37],[32,31],[43,12],[51,12],[40,-5],[40,-15],[33,-26],[20,-35],[12,-18],[9,-1],[-8,5],[-17,14]],[[114,-22],[130,-12],[142,-11],[153,-27],[146,-39],[135,-34],[115,-34]],[[-55,60],[-20,70],[-20,82],[-60,82],[-70,76]],[[130,32],[135,34],[141,38],[142,45],[140,41],[131,34]]];
function mkTex(b){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d'),X=l=>(l+180)/360*1024,Y=l=>(90-l)/180*512,K=BODY[b]&&BODY[b].kind;
 if(K==='star'){const col=BODY[b].col;x.fillStyle=col;x.fillRect(0,0,1024,512);for(let i=0;i<1100;i++){x.fillStyle=Math.random()<.5?'rgba(255,255,255,.3)':'rgba(0,0,0,.18)';x.beginPath();x.arc(Math.random()*1024,Math.random()*512,3+Math.random()*13,0,7);x.fill()}}
 else if(K==='nebula'){x.fillStyle='#10081f';x.fillRect(0,0,1024,512);const cs=b==='m42'?['rgba(255,90,170,.35)','rgba(130,90,255,.3)','rgba(255,180,120,.25)']:['rgba(110,190,255,.33)','rgba(255,230,160,.22)','rgba(255,120,90,.27)'];for(let i=0;i<90;i++){const gx=Math.random()*1024,gy=Math.random()*512,r=40+Math.random()*120,q=x.createRadialGradient(gx,gy,0,gx,gy,r);q.addColorStop(0,cs[i%3]);q.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=q;x.fillRect(gx-r,gy-r,r*2,r*2)}for(let i=0;i<120;i++){x.fillStyle='rgba(255,255,255,.8)';x.fillRect(Math.random()*1024,Math.random()*512,2,2)}}
 else if(K==='galaxy'){x.fillStyle='#04060f';x.fillRect(0,0,1024,512);const cx=512,cy=256;for(let i=0;i<2600;i++){const arm=i%2,r=Math.pow(Math.random(),.7)*230,th=arm*Math.PI+r/230*5+(Math.random()-.5)*.6;x.fillStyle=Math.random()<.2?'#ffd9a0':'#a9c3ff';x.globalAlpha=.4+Math.random()*.5;x.fillRect(cx+Math.cos(th)*r*1.9,cy+Math.sin(th)*r,2,2)}x.globalAlpha=1;const q=x.createRadialGradient(cx,cy,0,cx,cy,70);q.addColorStop(0,'rgba(255,235,170,.95)');q.addColorStop(1,'rgba(255,200,100,0)');x.fillStyle=q;x.fillRect(cx-90,cy-90,180,180)}
 else if(b==='earth'){x.fillStyle='#14407a';x.fillRect(0,0,1024,512);x.fillStyle='#3f8f4a';LAND.forEach(p=>{x.beginPath();p.forEach((q,i)=>x[i?'lineTo':'moveTo'](X(q[0]),Y(q[1])));x.closePath();x.fill()});x.fillStyle='#eef';x.fillRect(0,455,1024,57);x.fillRect(0,0,1024,25)}
 else if(b==='moon'||b==='mars'){x.fillStyle=b==='moon'?'#8d8d8d':'#b4532e';x.fillRect(0,0,1024,512);for(let i=0;i<450;i++){x.fillStyle=Math.random()<.6?'rgba(0,0,0,.13)':'rgba(255,255,255,.08)';x.beginPath();x.arc(Math.random()*1024,Math.random()*512,2+Math.random()*14,0,7);x.fill()}if(b==='mars'){x.fillStyle='#fff';x.fillRect(0,0,1024,14);x.fillRect(0,498,1024,14)}}
 else if(b==='mercury'||b==='pluto'){x.fillStyle=b==='mercury'?'#8f8f93':'#c9b29c';x.fillRect(0,0,1024,512);for(let i=0;i<380;i++){x.fillStyle=Math.random()<.6?'rgba(0,0,0,.14)':'rgba(255,255,255,.09)';x.beginPath();x.arc(Math.random()*1024,Math.random()*512,2+Math.random()*(b==='mercury'?16:9),0,7);x.fill()}
  if(b==='pluto'){x.fillStyle='#8a5a3c';x.fillRect(0,180,1024,70);[14,1038].forEach(cx=>{x.fillStyle='#f2e6d6';x.beginPath();x.arc(cx-30,300,48,0,7);x.arc(cx+34,300,48,0,7);x.moveTo(cx-78,310);x.lineTo(cx,420);x.lineTo(cx+80,310);x.fill()})}}
 else if(b==='venus'){x.fillStyle='#e8c88a';x.fillRect(0,0,1024,512);for(let i=0;i<60;i++){x.fillStyle=Math.random()<.5?'rgba(255,240,200,.25)':'rgba(190,130,60,.22)';x.beginPath();x.ellipse(Math.random()*1024,Math.random()*512,40+Math.random()*120,6+Math.random()*14,0,0,7);x.fill()}}
 else if(b==='sun'){x.fillStyle='#ffb62e';x.fillRect(0,0,1024,512);for(let i=0;i<900;i++){x.fillStyle=Math.random()<.5?'rgba(255,230,120,.35)':'rgba(220,90,10,.28)';x.beginPath();x.arc(Math.random()*1024,Math.random()*512,3+Math.random()*12,0,7);x.fill()}}
 else if(b==='uranus'||b==='neptune'){const cs=b==='uranus'?['#9fe6ea','#8ad8de','#b6f0f2','#7ccbd2']:['#3f5fc8','#4d6fe0','#3652b5','#6d8cf0'];for(let i=0;i<12;i++){x.fillStyle=cs[i%4];x.fillRect(0,i*43,1024,43)}if(b==='neptune'){x.fillStyle='rgba(20,30,100,.55)';x.beginPath();x.ellipse(300,300,70,38,0,0,7);x.fill()}}
 else{const cs=b==='saturn'?['#e8d08a','#d6bf78','#f0dca0','#cdb36a']:['#d9a066','#c58a50','#e8c690','#b87a45'];for(let i=0;i<12;i++){x.fillStyle=cs[i%4];x.fillRect(0,i*43,1024,43)}if(b==='jupiter'){x.fillStyle='#c4492f';x.beginPath();x.ellipse(620,330,60,32,0,0,7);x.fill()}}
 x.strokeStyle='rgba(255,255,255,.16)';for(let l=-180;l<=180;l+=30){x.beginPath();x.moveTo(X(l),0);x.lineTo(X(l),512);x.stroke()}for(let l=-60;l<=60;l+=30){x.beginPath();x.moveTo(0,Y(l));x.lineTo(1024,Y(l));x.stroke()}
 return new THREE.CanvasTexture(c)}
const gd=$('g3'),RN=new THREE.WebGLRenderer({antialias:true,alpha:true});RN.setPixelRatio(Math.min(2,devicePixelRatio));gd.append(RN.domElement);
const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,.1,50);cam.position.z=3.6;
sc.add(new THREE.AmbientLight(0xffffff,.8));const dl=new THREE.DirectionalLight(0xffffff,.8);dl.position.set(3,2,4);sc.add(dl);
const grp=new THREE.Group(),gm=new THREE.MeshLambertMaterial(),mk=new THREE.Mesh(new THREE.SphereGeometry(.03,12,12),new THREE.MeshBasicMaterial({color:0xff4040})),ring=new THREE.Mesh(new THREE.RingGeometry(.05,.065,32),new THREE.MeshBasicMaterial({color:0xffb454,side:THREE.DoubleSide}));
const core=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),gm),SUNM=new THREE.MeshBasicMaterial(),satRing=new THREE.Mesh(new THREE.RingGeometry(1.35,2.2,64),new THREE.MeshBasicMaterial({color:0xe3cf9a,side:THREE.DoubleSide,transparent:true,opacity:.75}));
satRing.rotation.x=Math.PI/2-.45;satRing.visible=false;
grp.add(core,mk,ring,satRing);sc.add(grp);
const TX={},GN={earth:'🌍 地球',moon:'🌙 月球',mars:'🔴 火星'};
function applyBody(b){gb=b;const dk=BODY[b]&&BODY[b].kind,m=(b==='sun'||dk)?SUNM:gm;core.material=m;m.map=TX[b]||(TX[b]=mkTex(b));m.needsUpdate=true;satRing.visible=b==='saturn';cam.position.z=b==='saturn'?5.2:3.6}
// 左下角天体介绍(含 NASA 链接);focus=true 表示是用户在太阳系图上双击选的,不是当前事件
const gi=document.createElement('div');gi.id='gi';gi.className='gi';gd.append(gi);
function showIntro(b,focus){const d=BODY[b];if(!d){gi.style.display='none';return}gi.style.display='block';gi.innerHTML='';const h=document.createElement('b');h.textContent=d.e+' '+d.zh+' · '+d.en+' · '+d.ja;gi.append(h);const ul=document.createElement('ul');d.facts.forEach(f=>{const li=document.createElement('li');li.textContent=f;ul.append(li)});gi.append(ul);const a=document.createElement('a');const lk=d.nasa?{t:'NASA 介绍',u:d.nasa}:d.link;if(lk){a.href=lk.u;a.target='_blank';a.rel='noopener';a.textContent=lk.t+' ↗'}gi.append(a);if(focus&&typeof cur!=='undefined'&&cur){const r=document.createElement('button');r.className='mapbtn';r.textContent='↩ 回到当前事件';r.style.marginLeft='8px';r.onclick=()=>{lastInfo=null;setGlobe(cur)};gi.append(r)}}
// 双击太阳系图上的天体 → 3D 区域显示该天体(不改变时间轴)
function showBody(b){applyBody(b);mk.visible=false;ring.visible=false;tx=.25;ty=0;oX=0;oY=0;$('gl').textContent=(BODY[b]?BODY[b].e+' '+BODY[b].zh:b)+' · 可拖动旋转 · 双击弹出链接';showIntro(b,true)}let gb='',tx=0,ty=0,oX=0,oY=0;
function fit(){const w=gd.clientWidth,h=gd.clientHeight;RN.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()}addEventListener('resize',fit);fit();
function setGlobe(e){const b=e.p;applyBody(b);mk.visible=true;ring.visible=true;showIntro(b,false);
 const la=e.la||0,lo=e.lo||0,th=(90-la)*Math.PI/180,ph=(lo+180)*Math.PI/180,v=new THREE.Vector3(-Math.cos(ph)*Math.sin(th),Math.cos(th),Math.sin(ph)*Math.sin(th));
 mk.position.copy(v).multiplyScalar(1.01);ring.position.copy(v).multiplyScalar(1.012);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v);
 tx=la*Math.PI/180;ty=Math.atan2(-v.x,v.z);oX=0;oY=0;
 $('gl').textContent=(GN[b]||'🪐 '+(PN[b]||b))+' · '+e.l+' ('+la.toFixed(1)+', '+lo.toFixed(1)+')'+(b==='earth'&&e.y<-1e6?' · 古大陆已漂移,此处为今日对应坐标':'')+' · 可拖动旋转 · 双击打开地图'}
let dr=null;RN.domElement.onpointerdown=ev=>{dr=[ev.clientX,ev.clientY];gd.style.cursor='grabbing'};addEventListener('pointerup',()=>{dr=null;gd.style.cursor='grab'});
RN.domElement.onpointermove=ev=>{if(!dr)return;oY+=(ev.clientX-dr[0])*.008;oX+=(ev.clientY-dr[1])*.008;dr=[ev.clientX,ev.clientY]};
// 双击球面:取点 → 经纬度 → 地图弹窗(见 map.js);同时把红点移到被点的位置
const ray=new THREE.Raycaster(), m2=new THREE.Vector2();
RN.domElement.ondblclick=ev=>{
  const r=RN.domElement.getBoundingClientRect();
  m2.set(((ev.clientX-r.left)/r.width)*2-1, -((ev.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(m2,cam);
  const hit=ray.intersectObject(grp.children[0])[0]; if(!hit) return;
  const p=grp.worldToLocal(hit.point.clone()), v=p.clone().normalize();
  mk.position.copy(v).multiplyScalar(1.01); ring.position.copy(v).multiplyScalar(1.012);
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v);
  const ll=pickToLatLon(p.x,p.y,p.z); showMapPopup(ll[0],ll[1],gb);
};
const nm=d=>((d+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
function rl(t){grp.rotation.x+=(tx+oX-grp.rotation.x)*.08;grp.rotation.y+=nm(ty+oY-grp.rotation.y)*.08;ring.scale.setScalar(1+.35*Math.sin(t*.006));RN.render(sc,cam);requestAnimationFrame(rl)}
$('pp').onchange=()=>{const m={moon:6,mars:7};if(m[$('pp').value]!=null)$('pc').selectedIndex=m[$('pp').value]};
requestAnimationFrame(rl);
} else {
  function showBody() { var g = document.getElementById('gl'); if (g) g.textContent = '3D 需要联网加载 three.js(离线时此区域不显示)'; }
  function setGlobe() { var g = document.getElementById('gl'); if (g) g.textContent = '3D 需要联网加载 three.js(离线时此区域不显示)'; }
}
