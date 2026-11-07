/**
 * tour.js — 新手导览
 * 7 步高亮导览,首次访问自动开始。
 * 依赖(需先加载):course.js (el, bt)
 * 提供(全局):tour
 */
const TS=[['#cv','欢迎来到时空漫游','太阳系俯视图,高亮圈标出当前事件所在的天体。'],['#sl','拖动时间轴','对数刻度:左侧至 2.5 亿年前,右侧至 1 万年后。绿色刻度是课程,橙色是你的计划。'],['#g3','3D 天体','事件落在具体经纬度,可拖动旋转球体。'],['#play','电影模式','点击后自动依次播放所有事件。'],['#pd','添加计划并推演','填写日期和地点,生成准备节点并检查可行性。'],['#cc','课程中心','大纲、内容、测试、评估建议、直播回放与学员反馈。'],['#fbb','需求反馈','你的想法会让游戏更好,欢迎文字或语音提交。']];
const tr=el('div','card');tr.style.cssText='display:none;position:fixed;left:10px;right:10px;bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:70;max-width:520px;margin:0 auto;border:1px solid var(--acc)';document.body.append(tr);
function tour(i){document.querySelectorAll('.tg').forEach(e=>e.classList.remove('tg'));if(i>=TS.length){tr.style.display='none';try{localStorage.setItem('tsdemo','1')}catch(e){}return}
 const s=TS[i],t=document.querySelector(s[0]);t.classList.add('tg');t.scrollIntoView({block:'center',behavior:'smooth'});tr.style.display='block';tr.innerHTML='';
 tr.append(el('b','',(i+1)+'/'+TS.length+' '+s[1]),el('div','',s[2]),el('div','row',bt('跳过',()=>tour(99)),i?bt('上一步',()=>tour(i-1)):'',bt(i<TS.length-1?'下一步':'完成',()=>tour(i+1),'on')))}
try{if(!localStorage.getItem('tsdemo'))setTimeout(()=>tour(0),900)}catch(e){}
