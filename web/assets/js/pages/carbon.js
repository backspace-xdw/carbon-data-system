// 碳足迹核算
import { api } from '../core/api.js';
import { ENERGY_LABEL, ENERGY_COLOR, fmtNumber, fmtTime, escapeHtml } from '../core/utils.js';
import { modal } from '../core/modal.js';
import { toast } from '../core/toast.js';

export async function render(host) {
  host.innerHTML = `
    <div class="iecsp-page-title"><h2>碳排放核算 <small>排放因子和区间核算结果</small></h2></div>

    <section class="grid grid-2-1">
      <iecsp-card title="按时段核算" hint="按能源类型分解 CO₂e">
        <div class="iecsp-toolbar">
          <select class="iecsp-select" id="c-range" style="max-width:180px">
            <option value="-30d" selected>近 30 天</option>
            <option value="-7d">近 7 天</option>
            <option value="-90d">近 90 天</option>
            <option value="-365d">近 1 年</option>
          </select>
          <div class="spacer"></div>
          <span class="txt-muted" id="c-total">—</span>
        </div>
        <iecsp-chart id="c-bar" type="bar" height="240px"></iecsp-chart>
        <table class="iecsp-table mt-12">
          <thead><tr><th>能源</th><th>能耗</th><th>因子</th><th>CO₂e (kg)</th><th>CO₂e (t)</th></tr></thead>
          <tbody id="c-tbody"></tbody>
        </table>
      </iecsp-card>

      <iecsp-card title="排放因子" hint="按生效日期管理多个版本">
        <div class="iecsp-toolbar">
          <div class="spacer"></div>
          <button class="iecsp-btn is-primary sm" id="c-add">新增因子</button>
        </div>
        <table class="iecsp-table">
          <thead><tr><th>能源</th><th>因子 (kgCO₂e/单位)</th><th>生效</th><th>来源</th></tr></thead>
          <tbody id="c-factors"></tbody>
        </table>
      </iecsp-card>
    </section>
  `;

  const $ = (id) => document.getElementById(id);

  async function loadFootprint() {
    const r = await api('/carbon/footprint?start=' + $('c-range').value + '&stop=now()');
    const d = r.data;
    $('c-total').textContent = `区间合计 ${fmtNumber(d.totalT, 3)} tCO₂e`;
    const labels = d.breakdown.map(b => ENERGY_LABEL[b.energyType] || b.energyType);
    const values = d.breakdown.map(b => +b.co2eT.toFixed(3));
    $('c-bar').data = {
      labels,
      series: [{ name: 'CO₂e', values, color: '#22c55e' }],
      yUnit: ' t'
    };
    $('c-tbody').innerHTML = d.breakdown.map(b => `<tr>
      <td><span class="iecsp-tag" style="background:${ENERGY_COLOR[b.energyType]}33;color:${ENERGY_COLOR[b.energyType]}">${ENERGY_LABEL[b.energyType] || b.energyType}</span></td>
      <td>${fmtNumber(b.energy, 2)} ${escapeHtml(b.unit)}</td>
      <td>${b.factor}</td>
      <td>${fmtNumber(b.co2eKg, 0)}</td>
      <td><strong>${fmtNumber(b.co2eT, 3)}</strong></td>
    </tr>`).join('');
  }

  async function loadFactors() {
    const r = await api('/carbon/factors');
    $('c-factors').innerHTML = r.data.map(f => `<tr>
      <td>${ENERGY_LABEL[f.energyType] || f.energyType}</td>
      <td><strong>${f.factor}</strong> <span class="txt-muted">/ ${escapeHtml(f.unit)}</span></td>
      <td class="txt-muted">${fmtTime(f.effectiveFrom).slice(0,10)}</td>
      <td class="txt-muted">${escapeHtml(f.source)}</td>
    </tr>`).join('');
  }

  $('c-range').addEventListener('change', loadFootprint);
  $('c-add').addEventListener('click', () => {
    const form = document.createElement('div');
    const opts = ['electricity','gas','water','steam','heat','coal']
      .map(t => `<option value="${t}">${ENERGY_LABEL[t]}</option>`).join('');
    form.innerHTML = `
      <div class="iecsp-form-grid">
        <div class="iecsp-form-row"><label>能源类型</label><select class="iecsp-select" id="ff-et">${opts}</select></div>
        <div class="iecsp-form-row"><label>因子值</label><input class="iecsp-input" id="ff-val" type="number" step="0.0001"/></div>
        <div class="iecsp-form-row"><label>单位</label><input class="iecsp-input" id="ff-unit" placeholder="如 kWh"/></div>
        <div class="iecsp-form-row"><label>生效起始</label><input class="iecsp-input" id="ff-from" type="datetime-local"/></div>
        <div class="iecsp-form-row" style="grid-column:1/-1"><label>来源说明</label><input class="iecsp-input" id="ff-src" placeholder="如:生态环境部 2024"/></div>
      </div>`;
    modal({
      title: '新增排放因子',
      body: form,
      onConfirm: async () => {
        const body = {
          energyType: form.querySelector('#ff-et').value,
          factor: parseFloat(form.querySelector('#ff-val').value),
          unit: form.querySelector('#ff-unit').value.trim(),
          effectiveFrom: form.querySelector('#ff-from').value ? new Date(form.querySelector('#ff-from').value).toISOString() : new Date().toISOString(),
          source: form.querySelector('#ff-src').value.trim() || '自定义'
        };
        try {
          await api('/carbon/factors', { method: 'POST', body });
          toast('已保存', 'success');
          loadFactors(); loadFootprint();
        } catch (ex) { toast(ex.message, 'danger'); return false; }
      }
    });
  });

  await Promise.all([loadFootprint(), loadFactors()]);
  return {};
}
