// 综合总览
import { api } from '../core/api.js';
import { fmtNumber, ENERGY_LABEL, ENERGY_COLOR } from '../core/utils.js';

export async function render(host) {
  host.innerHTML = `
    <div class="iecsp-page-title">
      <h2>综合总览 <small>关键指标和趋势</small></h2>
      <button class="iecsp-btn sm" id="ck-refresh"><span class="iecsp-loading" style="display:none" id="ck-spin"></span> 刷新</button>
    </div>

    <section class="grid grid-4" id="ck-kpis"></section>

    <section class="grid grid-2-1 mt-16">
      <iecsp-card title="本年逐月碳排放" hint="按月聚合 (tCO₂e)">
        <iecsp-chart id="ck-trend" type="line" height="280px"></iecsp-chart>
      </iecsp-card>
      <iecsp-card title="本年能源结构" hint="按能源类型 占比">
        <iecsp-chart id="ck-mix" type="donut" height="280px"></iecsp-chart>
      </iecsp-card>
    </section>

    <section class="grid grid-2-1 mt-16">
      <iecsp-card title="本月碳排放构成" hint="单位:tCO₂e">
        <iecsp-chart id="ck-month-bar" type="bar" height="260px"></iecsp-chart>
      </iecsp-card>
      <iecsp-card title="碳配额使用率" hint="当前履约年度">
        <iecsp-chart id="ck-gauge" type="gauge" height="260px"></iecsp-chart>
      </iecsp-card>
    </section>
  `;

  const $ = (id) => document.getElementById(id);
  const spin = $('ck-spin');
  const setSpin = (on) => { spin.style.display = on ? 'inline-block' : 'none'; };

  async function load() {
    setSpin(true);
    try {
      const [s, t] = await Promise.all([
        api('/cockpit/summary'),
        api('/cockpit/trend?year=' + new Date().getUTCFullYear())
      ]);
      paintKpis(s.data);
      paintTrend(t.data);
      paintMix(s.data);
      paintMonthBar(s.data);
      paintGauge(s.data);
    } catch (e) {
      console.error(e);
    } finally { setSpin(false); }
  }

  function paintKpis(d) {
    const k = d.kpis;
    const items = [
      { label: '本年累计碳排放', value: fmtNumber(k.yearTotalCO2eT, 2), unit: 'tCO₂e', hint: `${d.year} 年累计` },
      { label: '本月碳排放',     value: fmtNumber(k.monthTotalCO2eT, 2), unit: 'tCO₂e', hint: '当月聚合' },
      { label: '在线计量点',     value: `${k.metersActive}/${k.metersTotal}`, unit: '个', hint: '在线/总数' },
      { label: '未处置风险',     value: k.openRisks, unit: '起', hint: `严重 ${k.criticalRisks} 起`, tone: k.openRisks > 0 ? 'warning' : 'primary' }
    ];
    $('ck-kpis').innerHTML = items.map(it => `
      <iecsp-card>
        <div class="iecsp-kpi">
          <div class="iecsp-kpi__label">${it.label}</div>
          <div class="iecsp-kpi__value" style="${it.tone === 'warning' ? 'color:var(--warning)' : ''}">${it.value}<span class="unit">${it.unit}</span></div>
          <div class="iecsp-kpi__hint">${it.hint}</div>
        </div>
      </iecsp-card>`).join('');
  }

  function paintTrend(rows) {
    const xLabels = rows.map(r => r.month + '月');
    const values = rows.map(r => +r.co2eT.toFixed(3));
    $('ck-trend').data = {
      xLabels,
      series: [{ name: 'CO₂e', values, color: '#22c55e' }],
      yUnit: ' t'
    };
  }

  function paintMix(d) {
    const items = (d.yearBreakdown || []).filter(b => b.energy > 0).map(b => ({
      label: ENERGY_LABEL[b.energyType] || b.energyType,
      value: +b.co2eT.toFixed(3),
      color: ENERGY_COLOR[b.energyType]
    }));
    $('ck-mix').data = { items, unit: 'tCO₂e', centerLabel: '本年 CO₂e' };
  }

  function paintMonthBar(d) {
    const labels = d.monthBreakdown.map(b => ENERGY_LABEL[b.energyType] || b.energyType);
    const values = d.monthBreakdown.map(b => +b.co2eT.toFixed(3));
    const colors = d.monthBreakdown.map(b => ENERGY_COLOR[b.energyType]);
    $('ck-month-bar').data = {
      labels,
      series: [{ name: 'CO₂e', values, color: '#3b82f6' }],
      yUnit: ' t',
      barColors: colors
    };
  }

  function paintGauge(d) {
    const k = d.kpis;
    const pct = Math.round((k.quotaRatio || 0) * 100);
    $('ck-gauge').data = {
      value: pct, min: 0, max: 100, label: `已用 ${fmtNumber(k.quotaUsed, 1)} / ${fmtNumber(k.quotaAllocated, 0)} tCO₂e`, unit: '%'
    };
  }

  $('ck-refresh').addEventListener('click', load);
  let timer = setInterval(load, 60_000);
  load();

  return { dispose() { clearInterval(timer); } };
}
