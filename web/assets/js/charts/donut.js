import { BaseChart, FG, FG_MUTED, PALETTE } from './base.js';

/** DonutChart — 环形图,中心可显示总值 */
export class DonutChart extends BaseChart {
  constructor(host, opts) {
    super(host, opts);
    this.data = { items: [], total: null, unit: '', centerLabel: '' };
  }
  onHover(m) {
    if (!this._segs) return;
    const c = this._center;
    const dx = m.x - c.x, dy = m.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < this._inner || d > this._outer) { this._hover = -1; this.tip.style.display = 'none'; this.render(); return; }
    let ang = Math.atan2(dy, dx);
    if (ang < -Math.PI / 2) ang += Math.PI * 2;
    const idx = this._segs.findIndex(s => ang >= s.start && ang < s.end);
    if (idx === this._hover) return;
    this._hover = idx;
    if (idx >= 0) {
      const it = this.data.items[idx];
      this.showTip(`<strong>${it.label}</strong><br/>${formatNum(it.value)} ${this.data.unit || ''} · ${(it.value / this._sum * 100).toFixed(1)}%`, m.x, m.y);
    }
    this.render();
  }
  render() {
    const ctx = this.ctx; if (!ctx) return;
    ctx.clearRect(0, 0, this.w, this.h);
    const { items = [], total, unit = '', centerLabel = '' } = this.data || {};
    const padR = 100;
    const cx = (this.w - padR) / 2;
    const cy = this.h / 2;
    const outer = Math.min(this.w - padR, this.h) / 2 - 8;
    const inner = outer * 0.62;
    this._center = { x: cx, y: cy };
    this._outer = outer; this._inner = inner;

    const sum = items.reduce((a, b) => a + (b.value || 0), 0) || 1;
    this._sum = sum;
    let cur = -Math.PI / 2;
    const segs = [];
    items.forEach((it, i) => {
      const color = it.color || PALETTE[i % PALETTE.length];
      const start = cur;
      const end = cur + (it.value / sum) * Math.PI * 2;
      segs.push({ start, end });
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outer, start, end, false);
      ctx.closePath();
      ctx.fillStyle = i === this._hover ? brighten(color) : color;
      ctx.fill();
      cur = end;
    });
    this._segs = segs;
    // 内圈
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // 中心数值
    ctx.fillStyle = FG_MUTED;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText(centerLabel, cx, cy - 16);
    ctx.fillStyle = FG;
    ctx.font = '600 22px ui-sans-serif, system-ui';
    const totVal = total != null ? total : sum;
    ctx.fillText(formatNum(totVal), cx, cy + 6);
    if (unit) {
      ctx.fillStyle = FG_MUTED;
      ctx.font = '11px ui-sans-serif, system-ui';
      ctx.fillText(unit, cx, cy + 24);
    }

    // 右侧图例
    let ly = 16;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '12px ui-sans-serif, system-ui';
    items.forEach((it, i) => {
      const color = it.color || PALETTE[i % PALETTE.length];
      ctx.fillStyle = color; ctx.fillRect(this.w - padR + 8, ly - 5, 10, 10);
      ctx.fillStyle = FG;
      ctx.fillText(it.label, this.w - padR + 24, ly);
      ctx.fillStyle = FG_MUTED;
      ctx.fillText(((it.value / sum) * 100).toFixed(1) + '%', this.w - padR + 24, ly + 14);
      ly += 36;
    });
  }
}

function brighten(hex) {
  const h = hex.replace('#', '');
  let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  r = Math.min(255, r + 28); g = Math.min(255, g + 28); b = Math.min(255, b + 28);
  return `rgb(${r},${g},${b})`;
}
function formatNum(v) { return Math.abs(v) >= 1000 ? v.toFixed(0).replace(/\B(?=(\d{3})+$)/g, ',') : v.toFixed(2); }
