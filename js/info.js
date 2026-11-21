/**
 * info.js — 事件信息区
 * 显示事件说明与媒体:img 图片、video 视频、pdf、link 链接、slides 幻灯片翻页(并提供 PPT 下载)。
 * 依赖(需先加载):course.js (el, bt)
 * 提供(全局):renderInfo, mview
 */
function mview(m){const w=el('div','',m.t?el('div','mut',m.t):'');const bad=(n,x)=>n.replaceWith(el('div','mut','未找到:'+x+'(需与 media 文件夹一起部署)'));
 if(m.type==='img'){const i=el('img');i.src=m.src;i.style.cssText='max-width:100%;border-radius:8px;margin-top:6px';i.onerror=()=>bad(i,m.src);w.append(i)}
 else if(m.type==='video'){const v=el('video');v.src=m.src;v.controls=true;v.style.cssText='max-width:100%;border-radius:8px;margin-top:6px';v.onerror=()=>bad(v,m.src);w.append(v)}
 else if(m.type==='pdf'){const f=el('iframe');f.src=m.src;f.style.cssText='width:100%;height:380px;border:0;border-radius:8px;margin-top:6px';w.append(f)}
 else if(m.type==='link'){const a=el('a','',m.src);a.href=m.src;a.target='_blank';a.rel='noopener';w.append(a)}
 else if(m.type==='slides'){const im=el('img'),ct=el('span','mut');let k=m.k0||0;const n=m.files.length,ss=()=>{im.src=m.files[k];ct.textContent=(k+1)+' / '+n};
  im.style.cssText='width:100%;border-radius:8px;margin-top:6px;border:1px solid var(--bd)';im.onerror=()=>{ct.textContent='幻灯片图片未找到(需与 media 文件夹一起部署)'};
  w.append(im,el('div','row',bt('◀',()=>{k=(k+n-1)%n;ss()}),ct,bt('▶',()=>{k=(k+1)%n;ss()}),bt('⛶ 全屏',()=>{if(im.requestFullscreen)im.requestFullscreen()})));ss()}
 if(m.dl){const a=el('a','','⬇ 下载 PPT 原文件');a.href=m.dl;a.setAttribute('download','');w.append(el('div','row',a))}return w}
function renderInfo(e){if(e===lastInfo)return;lastInfo=e;const n=$('info');n.innerHTML='';
 n.append(el('div','',el('b','',e.t),el('span','mut','  '+(PN[e.p]||e.p)+' · '+e.l)),el('div','',e.d||''));
 (e.media||[]).forEach(m=>n.append(mview(m)));if(!(e.media||[]).length)n.append(el('div','mut','暂无图片/视频,可在该事件的 media 中添加。'))}
