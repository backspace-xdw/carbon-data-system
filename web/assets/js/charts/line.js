import { BaseChart, FG, FG_MUTED, GRID, PALETTE } from './base.js';

/**
 * LineChart — Canvas 自绘多系列折线
 * data: { xLabels: string[], series: [{ name, values: number[], color? }], yUnit? }
 */
export class LineChart extends BaseChart {
  constructor(host, opts) {
    super(host, opts);
    this.data = { xLabels: [], series: [], yUnit: '' };
  }
  onHover(m) {
    if (!this.data || !this.data.xLabels.length) return;
    const idx = this._xIndex(m.x);
    if (idx < 0 || idx === this._hover) return;
    this._hover = idx;
    const html = [`<strong>${this.data.xLabels[idx] || ''}</strong>`];
    for (const s of this.data.series) {
      const v = s.values[idx];
      html.push(`<div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color};margin-right:6px"></span>${s.name}:<strong style="margin-left:6px">${v == null ? '—' : formatNum(v) + (this.data.yUnit || '')}</strong></div>`);
    }
    this.showTip(html.join(''), m.x, m.y);
    this.render();
  }
  _xIndex(x) {
    const a = this._area; if (!a) return -1;
    if (x < a.x || x > a.x + a.w) return -1;
    const n = this.data.xLabels.length;
    if (n < 2) return 0;
    const step = a.w / (n - 1);
    return Math.max(0, Math.min(n - 1, Math.round((x - a.x) / step)));
  }
  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.w, this.h);
    const padL = 44, padR = 16, padT = 12, padB = 30;
    const area = { x: padL, y: padT, w: this.w - padL - padR, h: this.h - padT - padB };
    this._area = area;
    const { xLabels = [], series = [], yUnit = '' } = this.data || {};

    // 计算 Y 范围
    let min = Infinity, max = -Infinity;
    for (const s of series) for (const v of s.values || []) {
      if (typeof v !== 'number' || !isFinite(v)) continue;
      if (v < min) min = v; if (v > max) max = v;
    }
    if (!isFinite(min)) { min = 0; max = 1; }
    if (min === max) { max = min + 1; }
    const span = max - min;
    min = Math.max(0, min - span * 0.05);
    max = max + span * 0.1;

    // 网格 + Y 轴
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.fillStyle = FG_MUTED;
    ctx.font = '11px ui-sans-serif, system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const rows = 5;
    for (let i = 0; i <= rows; i++) {
      const y = area.y + (area.h * i) / rows;
      ctx.beginPath(); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.w, y); ctx.stroke();
      const v = max - ((max - min) * i) / rows;
      ctx.fillText(formatAxis(v), area.x - 6, y);
    }

    // X 轴标签
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const n = xLabels.length;
    const stride = Math.max(1, Math.ceil(n / Math.floor(area.w / 70)));
    for (let i = 0; i < n; i += stride) {
      const x = area.x + (n > 1 ? (area.w * i) / (n - 1) : area.w / 2);
      ctx.fillText(xLabels[i], x, area.y + area.h + 6);
    }

    // hover guideline
    if (this._hover != null && n > 1) {
      const hx = area.x + (area.w * this._hover) / (n - 1);
      ctx.strokeStyle = 'rgba(148,163,184,.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(hx, area.y); ctx.lineTo(hx, area.y + area.h); ctx.stroke();
      ctx.setLineDash([]);
    }

    // 系列
    series.forEach((s, idx) => {
      const color = s.color || PALETTE[idx % PALETTE.length];
      const vals = s.values || [];
      // 区域填充
      ctx.beginPath();
      vals.forEach((v, i) => {
        if (typeof v !== 'number' || !isFinite(v)) return;
        const x = area.x + (n > 1 ? (area.w * i) / (n - 1) : area.w / 2);
        const y = area.y + area.h - ((v - min) / (max - min)) * area.h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.lineTo(area.x + area.w, area.y + area.h);
      ctx.lineTo(area.x, area.y + area.h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, area.y, 0, area.y + area.h);
      grad.addColorStop(0, hexAlpha(color, 0.35));
      grad.addColorStop(1, hexAlpha(color, 0));
      ctx.fillStyle = grad;
      ctx.fill();
      // 折线
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      vals.forEach((v, i) => {
        if (typeof v !== 'number' || !isFinite(v)) return;
        const x = area.x + (n > 1 ? (area.w * i) / (n - 1) : area.w / 2);
        const y = area.y + area.h - ((v - min) / (max - min)) * area.h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      // hover 点
      if (this._hover != null) {
        const v = vals[this._hover];
        if (typeof v === 'number' && isFinite(v)) {
          const x = area.x + (n > 1 ? (area.w * this._hover) / (n - 1) : area.w / 2);
          const y = area.y + area.h - ((v - min) / (max - min)) * area.h;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0b1220';
          ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      }
    });

    // 图例
    let lx = area.x;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '12px ui-sans-serif, system-ui';
    series.forEach((s, idx) => {
      const color = s.color || PALETTE[idx % PALETTE.length];
      ctx.fillStyle = color;
      ctx.fillRect(lx, padT - 8, 10, 3);
      ctx.fillStyle = FG;
      ctx.fillText(s.name, lx + 14, padT - 6);
      lx += ctx.measureText(s.name).width + 36;
    });
  }
}

function formatAxis(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return v.toFixed(a < 10 ? 2 : 0);
}
function formatNum(v) {
  return Math.abs(v) >= 1000 ? v.toFixed(0).replace(/\B(?=(\d{3})+$)/g, ',') : v.toFixed(2);
}
function hexAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
