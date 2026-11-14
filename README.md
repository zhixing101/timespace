# 时空漫游 · 站点包

纯静态网站(HTML + CSS + 普通 JS),**无需安装、无需构建**。

## 本地运行
- 双击 `index.html`,或在本目录执行 `python -m http.server 8000` 后访问 http://localhost:8000
- 3D 区域需要联网加载 three.js(CDN);离线时该区域只显示提示,其余功能正常。

## 目录结构
```
timespace-site/
├─ index.html            页面骨架(按 ①–⑥ 区块加注释,脚本加载顺序也在这里)
├─ css/
│  ├─ base.css           颜色变量、重置、卡片/按钮/输入框
│  ├─ timeline.css       时间轴刻度、事件按钮
│  ├─ panels.css         事件信息区、时钟、推演结果
│  ├─ course.css         课程中心与反馈面板
│  └─ tour.css           新手导览高亮
├─ js/                   (按功能分文件,每个文件头部注释写明“依赖/提供”)
│  ├─ config.js          全局常量
│  ├─ timeline.js        对数时间轴、滑块、事件切换、电影模式
│  ├─ plans.js           我的计划与推演
│  ├─ solar.js           太阳系 2D 动画
│  ├─ globe.js           3D 地球/月球/火星(three.js);双击取点
│  ├─ map.js             双击地球 → 腾讯地图(中国境内)/谷歌地图;弹窗里有赛车入口
│  ├─ clock.js           年月日时分秒显示
│  ├─ info.js            事件信息区(图片/视频/PDF/链接/课件翻页)
│  ├─ course.js          课程中心(大纲/内容/测试/评估/直播/反馈)
│  ├─ feedback.js        需求反馈面板
│  ├─ tour.js            新手导览
│  └─ main.js            启动(最后加载)
├─ data/
│  ├─ events.js          内置历史/航天事件
│  ├─ courses.js         站内 4 门小课
│  └─ lessons.js         蒋老师编程课各周(带课件与图片)
├─ race/                 星际赛车:index.html、data.js(车型+9个地点环境)、js/engine.js、js/ui.js、css/race.css
├─ media/                deck/ poem/ struct/ first/ 课件幻灯片图片,news/ 新闻示意图,*.pptx 原文件
└─ tools/build-single.py 生成单文件版本
```

## 脚本加载顺序(重要,后者依赖前者的全局变量)
config → data/events → data/courses → timeline → plans → solar → globe → clock → data/lessons → course → feedback → tour → info → main

## 双击地球打开地图
- 在 3D 地球上**双击**一点:弹出坐标和地图按钮。估计在中国境内时优先推荐**腾讯地图**,否则推荐**谷歌地图**(两个都能点,边境附近判断可能有偏差)。
- 腾讯地图需要自己的 key:到 https://lbs.qq.com 申请,填到 `js/config.js` 的 `TENCENT_KEY`(留空也会打开,但腾讯可能提示缺 key)。谷歌地图在中国大陆可能打不开。
- 月球、火星暂无地图跳转,只显示坐标和“在此天体赛车”。

## 星际赛车(race/)
- 入口:主页面“🏎 赛车游戏”按钮,或地球弹窗里的“在此天体赛车”;会预选当前天体。
- 选择 4 种车和 9 个地点(8 颗行星 + 月球)。环境差异:大气阻力、抓地(重力)、动力(高温/低温)、风、沙尘/闪电/风线特效。木星到海王星没有固体表面,赛道是漂浮在云顶的平台。
- 参数在 `race/data.js`,可直接改;键盘方向键/WASD,手机有屏幕按钮。环境数值为近似值,偏游戏化。

## 常见修改
- **加一个事件**:在 `data/events.js` 的 `E` 数组末尾追加 `{y:年份, p:'earth', l:'地点', la:纬度, lo:经度, t:'标题', d:'说明'}`;有精确时刻再加 `dt:'1969-07-20T20:17:40Z'`(见 `data/lessons.js` 里的 `ex(...)`)。
- **给事件加图片/视频/课件**:加 `media:[{type:'img',src:'media/x.jpg'}, {type:'video',src:'…'}, {type:'pdf',src:'…'}, {type:'link',src:'https://…'}, {type:'slides',files:SL('struct',2,6),dl:'media/struct.pptx'}]`。
- **新增一周课程**:把 PPT 转成图片放到 `media/<文件夹>/`(命名 `前缀-01.jpg`),在 `data/lessons.js` 的 `PFX` 加前缀,复制一项 `E.push(...)`。PPT 转图:`soffice --headless --convert-to pdf x.pptx` 再 `pdftoppm -jpeg -r 80 x.pdf 前缀`。
- **课程内容/测验题**:改 `data/courses.js`。

## 说明
- 新闻插图均为手绘示意图,不是新闻照片。
- 1907-11-09 当天的中国大事未查到,课件里写的是这一年前后的背景;2027 年事件为预计,以官方发布为准。
- 学习记录、反馈、计划只保存在各人浏览器中(localStorage)。
