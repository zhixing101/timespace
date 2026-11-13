/**
 * globe.js — 3D 天体(three.js)
 * 用程序生成纹理的地球/月球/火星,按事件经纬度转动并标记;支持拖拽旋转。
 * 依赖(需先加载):three.min.js, timeline.js
 * 提供(全局):setGlobe, mkTex
 */
// three.js 未加载(离线)时,只显示提示,其余功能照常
if (typeof THREE !== 'undefined') {
const LAND=[[[-168,66],[-140,70],[-95,72],[-80,70],[-62,58],[-55,50],[-67,44],[-76,35],[-81,25],[-97,26],[-105,20],[-95,16],[-83,9],[-90,14],[-105,23],[-115,32],[-125,42],[-125,50],[-140,59],[-165,60]],[[-80,8],[-60,10],[-50,0],[-35,-6],[-40,-22],[-58,-38],[-66,-55],[-74,-50],[-72,-30],[-81,-5]],[[-10,36],[-9,43],[0,50],[10,55],[28,70],[60,70],[100,78],[140,72],[180,68],[170,60],[140,52],[130,40],[122,30],[110,20],[105,10],[98,8],[100,15],[90,22],[80,10],[72,20],[58,24],[48,30],[35,35],[28,41],[20,40],[12,38],[3,40],[-5,36]],[[35,30],[43,13],[55,17],[58,24],[48,30]],[[-17,21],[-10,35],[10,37],[32,31],[43,12],[51,12],[40,-5],[40,-15],[33,-26],[20,-35],[12,-18],[9,-1],[-8,5],[-17,14]],[[114,-22],[130,-12],[142,-11],[153,-27],[146,-39],[135,-34],[115,-34]],[[-55,60],[-20,70],[-20,82],[-60,82],[-70,76]],[[130,32],[135,34],[141,38],[142,45],[140,41],[131,34]]];
function mkTex(b){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d'),X=l=>(l+180)/360*1024,Y=l=>(90-l)/180*512;
 if(b==='earth'){x.fillStyle='#14407a';x.fillRect(0,0,1024,512);x.fillStyle='#3f8f4a';LAND.forEach(p=>{x.beginPath();p.forEach((q,i)=>x[i?'lineTo':'moveTo'](X(q[0]),Y(q[1])));x.closePath();x.fill()});x.fillStyle='#eef';x.fillRect(0,455,1024,57);x.fillRect(0,0,1024,25)}
 else if(b==='moon'||b==='mars'){x.fillStyle=b==='moon'?'#8d8d8d':'#b4532e';x.fillRect(0,0,1024,512);for(let i=0;i<450;i++){x.fillStyle=Math.random()<.6?'rgba(0,0,0,.13)':'rgba(255,255,255,.08)';x.beginPath();x.arc(Math.random()*1024,Math.random()*512,2+Math.random()*14,0,7);x.fill()}if(b==='mars'){x.fillStyle='#fff';x.fillRect(0,0,1024,14);x.fillRect(0,498,1024,14)}}
 else{const cs=['#d9a066','#c58a50','#e8c690','#b87a45'];for(let i=0;i<12;i++){x.fillStyle=cs[i%4];x.fillRect(0,i*43,1024,43)}}
 x.strokeStyle='rgba(255,255,255,.16)';for(let l=-180;l<=180;l+=30){x.beginPath();x.moveTo(X(l),0);x.lineTo(X(l),512);x.stroke()}for(let l=-60;l<=60;l+=30){x.beginPath();x.moveTo(0,Y(l));x.lineTo(1024,Y(l));x.stroke()}
 return new THREE.CanvasTexture(c)}
const gd=$('g3'),RN=new THREE.WebGLRenderer({antialias:true,alpha:true});RN.setPixelRatio(Math.min(2,devicePixelRatio));gd.append(RN.domElement);
const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,.1,50);cam.position.z=3.6;
sc.add(new THREE.AmbientLight(0xffffff,.8));const dl=new THREE.DirectionalLight(0xffffff,.8);dl.position.set(3,2,4);sc.add(dl);
const grp=new THREE.Group(),gm=new THREE.MeshLambertMaterial(),mk=new THREE.Mesh(new THREE.SphereGeometry(.03,12,12),new THREE.MeshBasicMaterial({color:0xff4040})),ring=new THREE.Mesh(new THREE.RingGeometry(.05,.065,32),new THREE.MeshBasicMaterial({color:0xffb454,side:THREE.DoubleSide}));
grp.add(new THREE.Mesh(new THREE.SphereGeometry(1,64,48),gm),mk,ring);sc.add(grp);
const TX={},GN={earth:'🌍 地球',moon:'🌙 月球',mars:'🔴 火星'};let gb='',tx=0,ty=0,oX=0,oY=0;
function fit(){const w=gd.clientWidth,h=gd.clientHeight;RN.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()}addEventListener('resize',fit);fit();
function setGlobe(e){const b=e.p;if(b!==gb){gb=b;gm.map=TX[b]||(TX[b]=mkTex(b));gm.needsUpdate=true}
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
  function setGlobe() { var g = document.getElementById('gl'); if (g) g.textContent = '3D 需要联网加载 three.js(离线时此区域不显示)'; }
}
