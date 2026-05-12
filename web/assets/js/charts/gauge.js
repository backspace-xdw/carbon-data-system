import { BaseChart, FG, FG_MUTED } from './base.js';

/** GaugeChart — 半圆仪表盘 */
export class GaugeChart extends BaseChart {
  constructor(host, opts) {
    super(host, opts);
    this.data = { value: 0, min: 0, max: 100, label: '', unit: '%', segments: null };
  }
  render() {
    const ctx = this.ctx; if (!ctx) return;
    ctx.clearRect(0, 0, this.w, this.h);
    const { value = 0, min = 0, max = 100, label = '', unit = '', segments } = this.data || {};
    const cx = this.w / 2, cy = this.h - 24;
    const r = Math.min(this.w / 2 - 16, this.h - 32);
    const thick = Math.max(10, r * 0.18);
    const startA = Math.PI, endA = 2 * Math.PI;
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));

    // 背景轨道(分段着色)
    const ranges = segments || [
      { stop: 0.6, color: '#22c55e' },
      { stop: 0.85, color: '#f59e0b' },
      { stop: 1.0,  color: '#ef4444' }
    ];
    let prev = 0;
    for (const sg of ranges) {
      ctx.beginPath();
      ctx.lineWidth = thick;
      ctx.strokeStyle = sg.color;
      ctx.lineCap = 'butt';
      ctx.arc(cx, cy, r - thick / 2, startA + prev * Math.PI, startA + sg.stop * Math.PI);
      ctx.stroke();
      prev = sg.stop;
    }

    // 灰色覆盖未到达部分
    ctx.beginPath();
    ctx.lineWidth = thick;
    ctx.strokeStyle = 'rgba(15,26,44,0.85)';
    ctx.arc(cx, cy, r - thick / 2, startA + ratio * Math.PI, endA);
    ctx.stroke();

    // 指针
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startA + ratio * Math.PI);
    ctx.fillStyle = FG;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(0, -(r - thick - 4));
    ctx.lineTo(3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 文本
    ctx.fillStyle = FG;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 24px ui-sans-serif, system-ui';
    ctx.fillText(formatNum(value) + (unit || ''), cx, cy - r * 0.2);
    ctx.fillStyle = FG_MUTED;
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText(label, cx, cy - r * 0.45);
    ctx.font = '11px ui-sans-serif, system-ui';
    ctx.fillText(formatNum(min), cx - r + thick / 2, cy + 14);
    ctx.fillText(formatNum(max), cx + r - thick / 2, cy + 14);
  }
}

function formatNum(v) { return Math.abs(v) >= 1000 ? v.toFixed(0).replace(/\B(?=(\d{3})+$)/g, ',') : (v % 1 === 0 ? String(v) : v.toFixed(1)); }
