import { BaseChart, FG, FG_MUTED, GRID, PALETTE } from './base.js';

/**
 * BarChart — Canvas 自绘柱状图(单系列或分组)
 * data: { labels: string[], series: [{ name, values, color? }], yUnit? }
 */
export class BarChart extends BaseChart {
  constructor(host, opts) {
    super(host, opts);
    this.data = { labels: [], series: [] };
  }
  onHover(m) {
    if (!this._slots) return;
    const idx = this._slots.findIndex(s => m.x >= s.x && m.x <= s.x + s.w);
    if (idx === this._hover) return;
    this._hover = idx;
    if (idx < 0) { this.tip.style.display = 'none'; this.render(); return; }
    const label = this.data.labels[idx];
    const lines = [`<strong>${label}</strong>`];
    this.data.series.forEach((s, i) => {
      const color = s.color || PALETTE[i % PALETTE.length];
      const v = s.values[idx];
      lines.push(`<div><span style="display:inline-block;width:8px;height:8px;background:${color};margin-right:6px;border-radius:2px"></span>${s.name}:<strong style="margin-left:6px">${v == null ? '—' : formatNum(v) + (this.data.yUnit || '')}</strong></div>`);
    });
    this.showTip(lines.join(''), m.x, m.y);
    this.render();
  }
  render() {
    const ctx = this.ctx; if (!ctx) return;
    ctx.clearRect(0, 0, this.w, this.h);
    const padL = 44, padR = 16, padT = 14, padB = 30;
    const area = { x: padL, y: padT, w: this.w - padL - padR, h: this.h - padT - padB };
    const { labels = [], series = [] } = this.data || {};
    const n = labels.length, k = series.length;
    if (!n || !k) return;

    let max = 0;
    for (const s of series) for (const v of s.values || []) {
      if (typeof v === 'number' && v > max) max = v;
    }
    if (max <= 0) max = 1;
    max = max * 1.1;

    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    ctx.fillStyle = FG_MUTED; ctx.font = '11px ui-sans-serif, system-ui';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const rows = 4;
    for (let i = 0; i <= rows; i++) {
      const y = area.y + (area.h * i) / rows;
      ctx.beginPath(); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.w, y); ctx.stroke();
      ctx.fillText(formatAxis(max - (max * i) / rows), area.x - 6, y);
    }

    const slotW = area.w / n;
    const groupGap = slotW * 0.18;
    const barW = (slotW - groupGap) / k;
    const slots = [];

    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i < n; i++) {
      const sx = area.x + slotW * i + groupGap / 2;
      slots.push({ x: sx, w: slotW - groupGap });
      for (let j = 0; j < k; j++) {
        const v = series[j].values[i];
        if (typeof v !== 'number') continue;
        const color = series[j].color || PALETTE[j % PALETTE.length];
        const h = (v / max) * area.h;
        const x = sx + barW * j;
        const y = area.y + area.h - h;
        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, color);
        grad.addColorStop(1, hexAlpha(color, 0.45));
        ctx.fillStyle = grad;
        roundRect(ctx, x + 1, y, barW - 2, h, 3);
        ctx.fill();
      }
      ctx.fillStyle = FG_MUTED;
      ctx.fillText(labels[i], sx + (slotW - groupGap) / 2, area.y + area.h + 6);
    }
    this._slots = slots;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  if (h <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function formatAxis(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return v.toFixed(a < 10 ? 1 : 0);
}
function formatNum(v) { return Math.abs(v) >= 1000 ? v.toFixed(0).replace(/\B(?=(\d{3})+$)/g, ',') : v.toFixed(2); }
function hexAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
