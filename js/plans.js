/**
 * plans.js — 我的计划与推演
 * 添加计划(日期/地点/内容)并保存到 localStorage;按日期和旅行时长生成推演节点。
 * 依赖(需先加载):timeline.js
 * 提供(全局):TR(旅行天数表)
 */
$('add').onclick=()=>{const d=$('pd').value,x=$('px').value.trim();if(!d||!x){alert('请填写日期和内容');return}
 const dt=new Date(d);plans.push({y:dt.getFullYear()+dt.getMonth()/12,date:d,p:$('pp').value,l:$('pc').selectedOptions[0].text,la:+$('pc').value.split(',')[0],lo:+$('pc').value.split(',')[1],t:x,d:$('pt').value+'计划:'+x,plan:true,kind:$('pt').value});
 try{localStorage.setItem('tsplans',JSON.stringify(plans))}catch(e){}renderTicks();go(plans[plans.length-1])};
const TR={earth:1,moon:3,mars:210,venus:150,jupiter:600};
$('simbtn').onclick=()=>{const p=plans[$('ps').value],box=$('sim');box.innerHTML='';if(!p){box.textContent='请先添加并选择一个计划';return}
 stop();go(p);const t0=new Date(),t1=new Date(p.date),days=Math.round((t1-t0)/864e5),tr=TR[p.p]||1;const lines=[];
 if(days<=0)lines.push(['计划日期已过,无法向前推演。',1]);else{
 lines.push(['起点:今天 → 目标:'+p.date+',共 '+days+' 天',0]);
 if(p.p!=='earth'&&days<tr)lines.push(['⚠ 单程约需 '+tr+' 天,时间不足,建议推迟或改地点。',1]);
 const st=p.kind==='课程'?['选定教材与目标','前 25%:打基础','中期 50%:练习与小测','75%:模拟考核/复盘','完成:总结成果']:
 ['确定预算与路线','25%:订交通与住宿','50%:办证件/保险/装备','出发(提前 '+tr+' 天,含旅途)','抵达并记录:'+p.t];
 st.forEach((s,i)=>{const k=i/(st.length-1);let when=new Date(t0.getTime()+k*(t1-t0));
 if(p.kind!=='课程'&&i===3)when=new Date(t1.getTime()-tr*864e5);if(p.kind!=='课程'&&i===4)when=t1;
 lines.push([when.toISOString().slice(0,10)+'  '+s,0])});
 lines.push([days>=tr*2||p.kind==='课程'?'✅ 推演结果:时间充足,按节点推进即可。':'⚠ 推演结果:时间偏紧,需压缩准备期。',days>=tr*2||p.kind==='课程'?0:1])}
 lines.forEach((l,i)=>setTimeout(()=>{const d=document.createElement('div');d.textContent=l[0];if(l[1])d.className='w';box.append(d)},1500+i*600))};
// 太阳系
