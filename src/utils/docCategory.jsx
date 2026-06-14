/**
 * 文档「栏目」配色 + 线性文档图标。
 * 设计来自「ASG 统一设计原型」：每条文档按所属栏目（subcategory）上色 ——
 * 左侧色条、线性图标、栏目标签共用同一种颜色，整页克制高级。
 *
 * 已知栏目用钦定配色；未知栏目走确定性哈希回落到同一套低饱和雅致色板，
 * 保证真实数据里出现新栏目时也能拿到稳定且彼此区分的颜色（不会全挤成一个灰）。
 */

// 低饱和雅致色板（陶土/雾蓝/鼠尾草/靛/赭/玫瓦/灰）
const PALETTE = ['#1a8a78', '#e0871c', '#4a9e3f', '#5b5bd6', '#2f6fc4', '#c0556e', '#5a6b82'];

const KNOWN = {
  安全规范: { color: '#1a8a78', badge: 'shield' },
  应急预案: { color: '#e0871c', badge: 'alert' },
  检查表模板: { color: '#4a9e3f', badge: 'check' },
  作业方案: { color: '#5b5bd6', badge: 'check' },
  培训课件: { color: '#2f6fc4', badge: 'check' },
  管理制度: { color: '#5a6b82', badge: 'check' },
  示范视频: { color: '#c0556e', badge: 'check' },
};

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/** 栏目（subcategory）→ { color, badge }。未知栏目确定性回落到色板。 */
export function catStyleFor(subcategory) {
  const key = (subcategory || '').trim();
  if (KNOWN[key]) return KNOWN[key];
  if (!key) return { color: '#5a6b82', badge: 'check' };
  return { color: PALETTE[hash(key) % PALETTE.length], badge: 'check' };
}

/** 线性文档图标：折角纸张 + 文本行 + 右下角栏目状态徽标（盾/感叹号/对勾）。颜色继承父级 color。 */
export function DocLineIcon({ badge = 'check', size = 34, color, style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ color, ...style }} aria-hidden="true">
      <path d="M6.6 3.4h6.1L17.1 7.8V18.2a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 18.2V5A1.6 1.6 0 0 1 6.6 3.4z" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
      <path d="M12.6 3.6v3.3a1.1 1.1 0 0 0 1.1 1.1h3.2" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M7.8 11h5.2M7.8 13.3h5.2" fill="none" stroke="currentColor" strokeWidth="1.05" strokeOpacity="0.45" strokeLinecap="round" />
      <circle cx="16.1" cy="16.5" r="4.1" fill="currentColor" />
      {badge === 'alert'
        ? <path d="M16.1 14.8v1.9M16.1 18.1h.01" stroke="#fff" strokeWidth="1.25" strokeLinecap="round" fill="none" />
        : badge === 'shield'
        ? <path d="M16.1 14.5l1.85.78v1.15c0 1.1-.78 1.85-1.85 2.18-1.07-.33-1.85-1.08-1.85-2.18v-1.15z" fill="#fff" />
        : <path d="M14.45 16.6l1.1 1.05 2.15-2.3" stroke="#fff" strokeWidth="1.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
