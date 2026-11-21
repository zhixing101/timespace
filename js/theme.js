/**
 * theme.js — 白天 / 夜晚配色(两套配色 + 自动识别 + 切换按钮)
 * 自动:当地时间 6:00–18:00 为白天(浅色),其余为夜晚(深色);每分钟检查一次。
 * 按钮循环:自动 → 白天 → 夜晚 → 自动。选择保存在 localStorage(读写失败时仍可用)。
 * 依赖:无(应在 <head> 里最先加载,避免闪烁)
 * 提供(全局):无(只设置 <html data-theme="light|dark">)
 */
(function () {
  const KEY = 'ts-theme', MODES = ['auto', 'light', 'dark'];
  let mode = 'auto', btn = null;
  try { mode = localStorage.getItem(KEY) || 'auto'; } catch (e) {}
  if (!MODES.includes(mode)) mode = 'auto';
  const isDay = () => { const h = new Date().getHours(); return h >= 6 && h < 18; };
  function apply() {
    const t = mode === 'auto' ? (isDay() ? 'light' : 'dark') : mode;
    document.documentElement.dataset.theme = t;
    if (btn) btn.textContent = (t === 'light' ? '🌞 ' : '🌙 ') + (mode === 'auto' ? '自动·' : '') + (t === 'light' ? '白天' : '夜晚');
    if (btn) btn.title = '点击切换:自动 → 白天 → 夜晚(当前时间 ' + new Date().toLocaleTimeString() + ')';
  }
  apply();
  setInterval(() => { if (mode === 'auto') apply(); }, 60000);
  addEventListener('DOMContentLoaded', () => {
    btn = document.createElement('button'); btn.id = 'themebtn';
    btn.onclick = () => { mode = MODES[(MODES.indexOf(mode) + 1) % 3]; try { localStorage.setItem(KEY, mode); } catch (e) {} apply(); };
    const slot = document.querySelector('[data-theme-slot]');
    if (slot) { btn.style.position = 'static'; slot.append(btn); } else document.body.append(btn);
    apply();
  });
  addEventListener('storage', e => { if (e.key === KEY) { mode = e.newValue || 'auto'; apply(); } });   // 另一个页面改了,同步
})();
