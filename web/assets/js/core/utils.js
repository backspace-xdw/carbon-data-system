// 实用工具

export function fmtNumber(n, decimals = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const v = Number(n);
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(decimals) + ' 万';
  return v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function fmtTime(s, withSec = false) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (x) => String(x).padStart(2, '0');
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withSec ? `${base}:${pad(d.getSeconds())}` : base;
}

export function ago(s) {
  if (!s) return '—';
  const t = new Date(s).getTime();
  const diff = Math.max(0, Date.now() - t);
  if (diff < 60_000)       return Math.floor(diff / 1000) + ' 秒前';
  if (diff < 3_600_000)    return Math.floor(diff / 60_000) + ' 分钟前';
  if (diff < 86_400_000)   return Math.floor(diff / 3_600_000) + ' 小时前';
  return Math.floor(diff / 86_400_000) + ' 天前';
}

export function debounce(fn, wait = 250) {
  let h;
  return (...args) => { clearTimeout(h); h = setTimeout(() => fn(...args), wait); };
}

export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export const ENERGY_LABEL = {
  electricity: '电力', gas: '天然气', water: '水', steam: '蒸汽', heat: '热力', coal: '原煤'
};
export const ENERGY_UNIT = {
  electricity: 'kWh', gas: 'm³', water: 't', steam: 't', heat: 'GJ', coal: 't'
};
export const ENERGY_COLOR = {
  electricity: '#facc15', gas: '#f97316', water: '#38bdf8',
  steam: '#c084fc', heat: '#f43f5e', coal: '#9ca3af'
};
export const ROLE_LABEL = {
  platform_admin: '系统管理员', park_admin: '单位管理员', data_steward: '数据员', observer: '查看人员'
};
export const SEVERITY_LABEL = { info: '提示', warning: '警告', critical: '严重' };
export const SEVERITY_TAG = { info: 'is-info', warning: 'is-warning', critical: 'is-danger' };
export const STATUS_LABEL = { open: '未处置', acknowledged: '处置中', closed: '已闭环' };
