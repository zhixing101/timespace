/**
 * data/lessons.js — 蒋老师编程课事件(带课件/图片)
 * 把每节课作为时间轴事件:dt=课程日期,media=图片/幻灯片。新增一节课:复制一项 E.push 并改日期、标题、文件夹。
 * 依赖(需先加载):data/events.js, clock.js
 * 提供(全局):SL(幻灯片路径生成)
 */
const PFX={deck:'s',poem:'p',struct:'c'};   // 文件夹→文件名前缀
const SL=(d,a,b)=>{const r=[];for(let i=a;i<=b;i++)r.push('media/'+d+'/'+PFX[d]+'-'+P2(i)+'.jpg');return r};
const DK='media/deck.pptx';
const ex=(t,dt,pr)=>{const e=E.find(x=>x.t===t);if(e)e.dt=dt};
ex('阿波罗 11 号登月','1969-07-20T20:17:40Z');ex('海盗 1 号着陆火星','1976-07-20T11:53:06Z');
E.push({dt:'1906-11-03',p:'earth',l:'线上课堂 · 柏林(SOS 公约)',la:52.5,lo:13.4,t:'📖 蒋老师的编程课 2-10 复利 · 1Q061103',d:'过去:认识复利、编程和 AI 中的复利、回顾百种百物 HKHT(诗歌/人体/金句)、复利的身心分析。1906 年 11 月 3 日,柏林签订《国际无线电报公约》,SOS 成为国际求救信号。',media:[{type:'slides',t:'课件 · 过去(点 ◀ ▶ 翻页)',files:SL('deck',2,8),dl:DK},{type:'slides',t:'附件 · 百首诗背诵小册',files:SL('poem',1,12),dl:'media/poem.pptx'}]},
{dt:'2026-10-31',p:'earth',l:'线上课堂',la:0,lo:0,t:'📖 蒋老师的编程课 2-11 方法和工具 · Z0261031',d:'现在:复利公式、回顾 GitHub、介绍 Claude,分享最近的书、电影、音乐、人。',media:[{type:'slides',t:'课件 · 现在',files:SL('deck',9,12),dl:DK}]},
{dt:'2086-11-02',p:'mars',l:'未来课堂(想象)',la:18.4,lo:77.5,t:'📖 蒋老师的编程课 2-12 作品 · Z0861102',d:'未来:用复利理论完成作品、回顾时空漫游、讨论还能增加的需求;编程、语言、音乐学习的共通点;根据反馈持续改进。',media:[{type:'slides',t:'课件 · 未来与持续改进',files:SL('deck',13,18),dl:DK}]});
// ---- 第三周:2-13 / 2-14 / 2-15 结构化 What / Why / How(新闻以中国大事为主;图片为手绘示意)----
E.push(
{dt:'1907-11-09',p:'earth',l:'线上课堂 · 北京(清光绪三十三年)',la:39.9,lo:116.4,t:'📖 蒋老师的编程课 2-13 结构化 What · 1Q071109',d:'过去:结构化的定义(盖房子)、编程与语言中的结构化。1907 年前后的中国:预备立宪、铁路商办、徐锡麟与秋瑾事件;同一天世界:库里南钻石献给英王。(当天中国大事未查到,为这一年的背景。)',media:[{type:'img',t:'新闻示意图(手绘)',src:'media/news/news1907.jpg'},{type:'slides',t:'课件 · 过去:结构化是什么',files:SL('struct',2,6),dl:'media/struct.pptx'}]},
{dt:'2026-11-07',p:'earth',l:'线上课堂 · 上海(进博会)',la:31.19,lo:121.3,t:'📖 蒋老师的编程课 2-14 GitHub 的结构 Why · Z0261107',d:'现在:GitHub 时间线与结构、VS Code 桌面版与网页版、分享《爱丽丝梦游仙境》。今天:第九届进博会(11 月 5–10 日)在上海举行。',media:[{type:'img',t:'新闻示意图(手绘)',src:'media/news/news2026.jpg'},{type:'slides',t:'课件 · 现在:GitHub 为什么要结构化',files:SL('struct',7,11),dl:'media/struct.pptx'}]},
{dt:'2027-11-06',p:'earth',l:'线上课堂 · 西昌(天问二号发射地)',la:28.25,lo:102.03,t:'📖 蒋老师的编程课 2-15 结构化应用 How · Z0271106',d:'未来:用结构化完成网页游戏 HTML、计划与实际里程碑、用 VS Code 发布到 GitHub、学一个概念的三问。2027 年底:天问二号返回舱预计着陆地球(预计,以国家航天局发布为准)。',media:[{type:'img',t:'新闻示意图(手绘)',src:'media/news/news2027.jpg'},{type:'slides',t:'课件 · 未来:怎么做',files:SL('struct',12,16),dl:'media/struct.pptx'}]});
E.forEach(e=>{if(e.dt)e.y=d2y(new Date(e.dt))});
