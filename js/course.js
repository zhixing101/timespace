/**
 * course.js — 课程中心
 * 课程列表、大纲/内容/测试/评估建议/直播回放/学员反馈六个标签;含语音转文字与录音工具。
 * 依赖(需先加载):data/courses.js, timeline.js
 * 提供(全局):el, bt(DOM 小工具), openCourse, speech, record
 */
let CS={res:{},fb:[],lk:{}};try{CS=Object.assign(CS,JSON.parse(localStorage.getItem('tscs')||'{}'))}catch(e){}
const sv=()=>{try{localStorage.setItem('tscs',JSON.stringify(CS))}catch(e){alert('存储空间不足,录音可能未保存')}};
const cm=document.createElement('div');cm.id='cm';document.body.append(cm);
const el=(t,c,...k)=>{const e=document.createElement(t);if(c)e.className=c;k.flat().forEach(x=>e.append(x));return e};
const bt=(t,f,c)=>{const b=el('button',c||'',t);b.onclick=f;return b};
let cs0=0,cid=null,tb='out',rec=null,chunks=[],aurl='';
const best=id=>(CS.res[id]||[]).slice(-1)[0];
function openCourse(id){cid=id||null;tb='out';cs0=0;cm.style.display='block';rc()}
function adv(c,r){const a=[],p=r.p,hs=CS.res[c.id];a.push(p>=85?['ok','✅ 掌握良好。进阶:'+c.next]:p>=60?['w','🟡 基本理解,请巩固下列错题,隔天重测。']:['bad','🔴 理解不足,建议重读内容再测。']);r.wrong.forEach(i=>a.push(['bad','• '+c.qs[i].q+' → '+c.qs[i].tip]));if(hs.length>1){const d=p-hs[hs.length-2].p;a.push(['mut',d>0?'📈 较上次 +'+d:d<0?'📉 较上次 '+d:'与上次持平'])}return a}
function rc(){cm.innerHTML='';cm.scrollTop=0;const w=el('div','cw');cm.append(w);const c=COURSES.find(x=>x.id===cid);
 w.append(el('div','row',bt('✕ 返回时空漫游',()=>{cm.style.display='none'}),cid?bt('课程列表',()=>{cid=null;rc()}):'',el('b','',c?c.t:'📚 课程中心')));
 if(!c){let lg='';COURSES.forEach(k=>{if(k.grp&&k.grp!==lg){lg=k.grp;w.append(el('h3','',lg))}const b=best(k.id);w.append(el('div','card',el('b','',k.t),el('div','mut',k.sum),el('div','row',el('span','mut',b?'最近 '+b.p+'%':'未测验'),bt('进入课程 →',()=>{cid=k.id;tb='out';rc()}),bt('📍 在时空中定位',()=>{cm.style.display='none';stop();go(all().find(e=>e.course===k.id))}))))});return}
 const T=[['out','大纲'],['body','内容'],['test','测试'],['eval','评估建议'],['live','直播·回放·总结'],['fb','学员反馈']];
 w.append(el('div','row',T.map(t=>bt(t[1],()=>{tb=t[0];rc()},tb===t[0]?'on':''))));const p=el('div','card');w.append(p);({out:vo,body:vb,test:vt,eval:ve,live:vl,fb:vf}[tb])(c,p)}
const vo=(c,p)=>p.append(el('h3','',c.sum),el('ol','',c.out.map(x=>{if(typeof x==='string')return el('li','',x);const a=el('a','',x.t);a.href='#';a.onclick=e=>{e.preventDefault();cs0=x.s;tb='body';rc()};return el('li','',a,el('span','mut','  → 看课件第 '+(x.s+1)+' 页'))})),el('div','mut',c.slides?'点击大纲条目,直接跳到对应课件页':''),el('div','mut','关键点 '+c.key.length+' 条 · 测验 '+c.qs.length+' 题'));
const vb=(c,p)=>{if(c.slides){p.append(mview({type:'slides',t:'课件(◀ ▶ 翻页,可全屏)',files:c.slides,k0:cs0,dl:c.pptx}));cs0=0}c.body.forEach(x=>p.append(el('p','',x)));p.append(el('b','','关键点'),el('ul','',c.key.map(x=>el('li','',x))),bt('📝 去测试',()=>{tb='test';rc()},'on'))};
function vt(c,p){const ans={},out=el('div');c.qs.forEach((q,i)=>{const b=el('div','',el('p','',el('b','',(i+1)+'. '+q.q)));q.o.forEach((o,j)=>{const lb=el('label','o'),r=el('input');r.type='radio';r.name='q'+i;r.onchange=()=>ans[i]=j;lb.append(r,' '+o);b.append(lb)});p.append(b)});
 p.append(bt('提交答案',()=>{if(Object.keys(ans).length<c.qs.length){alert('还有题目未作答');return}const wrong=[];p.querySelectorAll('input').forEach(x=>x.disabled=true);
 c.qs.forEach((q,i)=>{if(ans[i]!==q.a)wrong.push(i);p.querySelectorAll('input[name=q'+i+']').forEach((x,j)=>{if(j===q.a)x.parentElement.classList.add('right');else if(j===ans[i])x.parentElement.classList.add('wrong')})});
 const n=c.qs.length,s=n-wrong.length,r={p:Math.round(s/n*100),s,n,wrong,d:new Date().toISOString().slice(0,10)};(CS.res[c.id]=CS.res[c.id]||[]).push(r);sv();out.append(el('h3','',s+' / '+n+'('+r.p+'%)'));adv(c,r).forEach(x=>out.append(el('div',x[0],x[1])));out.append(bt('查看评估',()=>{tb='eval';rc()},'on'))},'on'),out)}
function ve(c,p){const hs=CS.res[c.id];if(!hs){p.append('请先完成测试。');return}p.append(el('h3','','学习评估'));hs.forEach((r,i)=>p.append(el('div','mut','第 '+(i+1)+' 次 · '+r.d+' · '+r.s+'/'+r.n+'('+r.p+'%)')));p.append(el('h3','','学习建议'));adv(c,hs[hs.length-1]).forEach(x=>p.append(el('div',x[0],x[1])));
 const t=COURSES.filter(k=>best(k.id));p.append(el('div','mut','全部课程已测 '+t.length+'/'+COURSES.length+',平均 '+Math.round(t.reduce((s,k)=>s+best(k.id).p,0)/t.length)+'%'))}
function vl(c,p){const L=CS.lk[c.id]=CS.lk[c.id]||{},F=[['live','🔴 直播链接'],['replay','🎞 回放链接'],['sum','📄 课程总结链接']];
 F.forEach(f=>{const v=L[f[0]];const a=el('div','',f[1]+':');if(/^https?:\/\//.test(v||'')){const k=el('a','',v);k.href=v;k.target='_blank';k.rel='noopener';a.append(k)}else a.append(el('span','mut','讲师暂未设置'));p.append(a)});
 p.append(el('h3','','课程总结'),el('ul','',c.key.map(x=>el('li','',x))));const d=el('details','',el('summary','mut','讲师设置链接'));const ins={};F.forEach(f=>{const i=el('input');i.placeholder='https://…';i.value=L[f[0]]||'';i.style.cssText='width:100%;margin-top:6px';ins[f[0]]=i;d.append(f[1],i)});
 d.append(bt('保存',()=>{F.forEach(f=>L[f[0]]=ins[f[0]].value.trim());sv();rc()}));p.append(d)}
function vf(c,p){const ta=el('textarea'),st=el('div','mut'),au=el('audio');au.controls=true;au.style.display='none';aurl='';ta.placeholder='写下学习感受和建议…';const rt=el('select');[5,4,3,2,1].forEach(n=>{const o=el('option','','★'.repeat(n));o.value=n;rt.append(o)});
 const rb=bt('⏺ 录音',()=>record(rb,st,au)),sb=bt('🎤 语音转文字',()=>speech(ta,st));
 p.append(el('h3','','学员反馈'),'评分 ',rt,ta,el('div','row',sb,rb,bt('提交反馈',()=>{if(!ta.value.trim()&&!aurl){alert('请输入文字或录音');return}CS.fb.push({c:c.id,r:+rt.value,t:ta.value.trim(),a:aurl,d:new Date().toLocaleString()});sv();rc()},'on')),st,au,el('h3','','已提交的反馈'));
 const m=CS.fb.filter(f=>f.c===c.id);if(!m.length)p.append(el('div','mut','暂无。'));m.slice().reverse().forEach(f=>{const b=el('div','card',el('div','mut',f.d+' · '+'★'.repeat(f.r)),f.t||'(仅语音)');if(f.a){const a=el('audio');a.controls=true;a.src=f.a;b.append(a)}p.append(b)});p.append(el('div','mut','反馈仅保存在你的浏览器中,尚未同步给讲师。'))}
function speech(ta,st){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){st.textContent='此浏览器不支持语音转文字,请用录音';return}const r=new R();r.lang='zh-CN';r.onresult=e=>{ta.value+=e.results[0][0].transcript};r.onerror=e=>st.textContent='识别失败:'+e.error;r.onend=()=>{if(st.textContent.startsWith('🎤'))st.textContent=''};r.start();st.textContent='🎤 请说话…'}
async function record(b,st,au){if(rec&&rec.state==='recording'){rec.stop();return}try{const s=await navigator.mediaDevices.getUserMedia({audio:true});rec=new MediaRecorder(s,{audioBitsPerSecond:16000});chunks=[];rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>{s.getTracks().forEach(t=>t.stop());const f=new FileReader();f.onload=()=>{aurl=f.result;au.src=aurl;au.style.display='block'};f.readAsDataURL(new Blob(chunks,{type:rec.mimeType}));b.textContent='⏺ 重新录音';st.textContent='录音完成'};rec.start();b.textContent='⏹ 停止';st.textContent='录音中(最长 60 秒)';setTimeout(()=>{if(rec.state==='recording')rec.stop()},60000)}catch(e){st.textContent='无法使用麦克风:'+(e.name||e)}}
$('cc').onclick=()=>openCourse();
