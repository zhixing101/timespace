/**
 * config.js — 全局常量
 * 当前年份,时间轴以“现在”为中心。
 * 依赖(需先加载):无
 * 提供(全局):NOW
 */
const NOW=new Date().getFullYear();

// ---- 外部服务配置 ----
// 腾讯地图 URI API 需要开发者 key(https://lbs.qq.com 免费申请);留空时仍会打开,但腾讯可能提示缺少 key。
const TENCENT_KEY = '';
// 赛车页面地址(相对路径;发布成单文件时可替换为完整网址)
const RACE_URL = 'race/index.html';
// 星际旅行页面地址
const SPACE_URL = 'space/index.html';
