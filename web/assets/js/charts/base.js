// 图表基类 — 处理高 DPI / resize / tooltip

export class BaseChart {
  constructor(host, options = {}) {
    this.host = host;
    this.options = options;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%';
    this.tip = document.createElement('div');
    this.tip.style.cssText = 'position:absolute;pointer-events:none;background:rgba(15,26,44,.95);border:1px solid rgba(148,163,184,.3);border-radius:6px;padding:8px 10px;color:#e2e8f0;font-size:12px;line-height:1.6;box-shadow:0 4px 16px rgba(0,0,0,.4);display:none;z-index:10;white-space:nowrap';
    host.style.position = host.style.position || 'relative';
    host.appendChild(this.canvas);
    host.appendChild(this.tip);
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(host);
    this.canvas.addEventListener('mousemove', (e) => this._onMove(e));
    this.canvas.addEventListener('mouseleave', () => { this.tip.style.display = 'none'; this._hover = null; this.render(); });
  }
  dispose() {
    try { this._ro.disconnect(); } catch {}
    this.canvas.remove();
    this.tip.remove();
  }
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.host.getBoundingClientRect();
    this.w = Math.max(120, r.width | 0);
    this.h = Math.max(80, r.height | 0);
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }
  setData(data) { this.data = data; this.render(); }
  showTip(html, x, y) {
    this.tip.innerHTML = html;
    this.tip.style.display = 'block';
    const r = this.host.getBoundingClientRect();
    const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
    let nx = x + 12, ny = y + 12;
    if (nx + tw > r.width)  nx = x - tw - 12;
    if (ny + th > r.height) ny = y - th - 12;
    this.tip.style.left = nx + 'px';
    this.tip.style.top  = ny + 'px';
  }
  _onMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this._mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.onHover && this.onHover(this._mouse);
  }
  render() { /* override */ }
}

export const FG = '#e2e8f0';
export const FG_MUTED = '#94a3b8';
export const FG_DIM = '#64748b';
export const GRID = 'rgba(148,163,184,.15)';
export const PALETTE = ['#22c55e', '#3b82f6', '#facc15', '#f97316', '#38bdf8', '#c084fc', '#f43f5e', '#06b6d4'];
