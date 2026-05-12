// <iecsp-chart type="line|bar|donut|gauge"></iecsp-chart>
// 通过 .data = {...} 设置数据,自动渲染

import { LineChart } from '../charts/line.js';
import { BarChart } from '../charts/bar.js';
import { DonutChart } from '../charts/donut.js';
import { GaugeChart } from '../charts/gauge.js';

const KIND = { line: LineChart, bar: BarChart, donut: DonutChart, gauge: GaugeChart };

class IecspChart extends HTMLElement {
  static get observedAttributes() { return ['type', 'height']; }
  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;
    const type = this.getAttribute('type') || 'line';
    const height = this.getAttribute('height') || '260px';
    this.style.display = 'block';
    this.style.position = 'relative';
    this.style.width = '100%';
    this.style.height = height;
    const Klass = KIND[type] || LineChart;
    this.chart = new Klass(this);
    if (this._pendingData) { this.chart.setData(this._pendingData); this._pendingData = null; }
  }
  disconnectedCallback() {
    if (this.chart) { try { this.chart.dispose(); } catch {} this.chart = null; }
    this._mounted = false;
  }
  set data(v) {
    if (this.chart) this.chart.setData(v);
    else this._pendingData = v;
  }
}

customElements.define('iecsp-chart', IecspChart);
