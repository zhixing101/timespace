/**
 * feedback.js — 需求反馈面板
 * 文字/语音反馈、功能投票、复制/邮件导出,数据存 localStorage。
 * 依赖(需先加载):course.js (el, bt, speech)
 * 提供(全局):openFb, FB
 */
const FB=(()=>{try{return JSON.parse(localStorage.getItem('tsfb')||'null')}catch(e){return null}})()||{items:[],votes:[],mail:''};
const svf=()=>{try{localStorage.setItem('tsfb',JSON.stringify(FB))}catch(e){}};
const fp=document.createElement('div');fp.style.cssText='display:none;position:fixed;inset:0;z-index:60;background:var(--bg);overflow:auto;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)';document.body.append(fp);
const fbb=el('button','','💡 需求反馈');fbb.id='fbb';fbb.style.cssText='position:fixed;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:40;background:var(--acc);color:#04101f;font-weight:600';fbb.onclick=()=>openFb();document.body.append(fbb);
const IDEAS=['真实地球贴图','古大陆位置还原','更多历史事件','多人直播课堂','手机体验优化','英文界面'];
function openFb(){fp.style.display='block';fp.innerHTML='';const w=el('div','cw');fp.append(w);w.append(el('div','row',bt('✕ 关闭',()=>{fp.style.display='none'}),el('b','','💡 需求与反馈')));
 const ty=el('select');['新功能需求','体验问题','内容错误','课程建议','其他'].forEach(x=>ty.append(el('option','',x)));const ta=el('textarea'),ct=el('input'),st=el('div','mut');ct.placeholder='联系方式(选填)';ct.style.cssText='width:100%;margin-top:6px';ta.placeholder='你希望游戏增加或改进什么?';
 w.append(el('div','card',ty,ta,ct,el('div','row',bt('🎤 语音转文字',()=>speech(ta,st)),bt('提交',()=>{if(!ta.value.trim()){alert('请先写下内容');return}FB.items.push({t:ty.value,x:ta.value.trim(),c:ct.value.trim(),d:new Date().toLocaleString()});svf();openFb()},'on')),st));
 w.append(el('div','card',el('b','','我最想要的功能(点击投票)'),el('div','row',IDEAS.map(x=>{const on=FB.votes.includes(x);return bt((on?'👍 ':'')+x,()=>{FB.votes=on?FB.votes.filter(v=>v!==x):FB.votes.concat(x);svf();openFb()},on?'on':'')}))));
 const L=el('div','card',el('b','','已提交('+FB.items.length+')'));FB.items.slice().reverse().forEach(f=>L.append(el('div','mut',f.d+' · '+f.t+':'+f.x)));
 const dump=()=>'【时空漫游反馈】\n'+FB.items.map(f=>f.t+' | '+f.x+' | '+f.c+' | '+f.d).join('\n')+'\n想要:'+FB.votes.join('、');
 L.append(el('div','row',bt('📋 复制全部反馈',()=>{try{navigator.clipboard.writeText(dump()).then(()=>alert('已复制,可发给开发者'),()=>prompt('请复制',dump()))}catch(e){prompt('请复制',dump())}}),bt('✉ 邮件发送',()=>{const m=FB.mail||prompt('开发者邮箱:');if(!m)return;FB.mail=m;svf();location.href='mailto:'+m+'?subject='+encodeURIComponent('时空漫游反馈')+'&body='+encodeURIComponent(dump())})));w.append(L)}
