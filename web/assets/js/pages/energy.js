// 能源数据接入 — 选计量点查看历史曲线 + 手工补录
import { api, qs } from '../core/api.js';
import { ENERGY_LABEL, ENERGY_UNIT, fmtTime, escapeHtml } from '../core/utils.js';
import { toast } from '../core/toast.js';
import { modal } from '../core/modal.js';

export async function render(host) {
  host.innerHTML = `
    <div class="iecsp-page-title"><h2>能源数据接入 <small>历史曲线 · 实时推送 · 手工补录</small></h2></div>

    <iecsp-card>
      <div class="iecsp-toolbar">
        <select class="iecsp-select" id="en-meter" style="max-width:280px"></select>
        <select class="iecsp-select" id="en-range" style="max-width:140px">
          <option value="-6h">近 6 小时</option>
          <option value="-24h" selected>近 24 小时</option>
          <option value="-7d">近 7 天</option>
          <option value="-30d">近 30 天</option>
        </select>
        <select class="iecsp-select" id="en-every" style="max-width:140px">
          <option value="5m">5 分钟</option>
          <option value="15m" selected>15 分钟</option>
          <option value="1h">1 小时</option>
          <option value="1d">1 天</option>
        </select>
        <div class="spacer"></div>
        <button class="iecsp-btn" id="en-refresh">刷新</button>
        <button class="iecsp-btn is-primary" id="en-ingest">手工补录</button>
      </div>
      <iecsp-chart id="en-chart" type="line" height="320px"></iecsp-chart>
      <div class="txt-muted mt-12" id="en-stat" style="font-size:12px"></div>
    </iecsp-card>

    <iecsp-card class="mt-16" title="实时推送" hint="WebSocket /ws · 仅显示最近 20 条">
      <table class="iecsp-table">
        <thead><tr><th>时间</th><th>计量点</th><th>读数</th></tr></thead>
        <tbody id="en-live"><tr><td colspan="3" class="empty">尚无消息</td></tr></tbody>
      </table>
    </iecsp-card>
  `;

  const $ = (id) => document.getElementById(id);
  const meterSel = $('en-meter'), rangeSel = $('en-range'), everySel = $('en-every');
  let meters = [];

  async function loadMeters() {
    const res = await api('/meters');
    meters = res.data;
    meterSel.innerHTML = meters.map(m =>
      `<option value="${m.code}">${escapeHtml(m.name)} · ${ENERGY_LABEL[m.energyType] || ''} (${m.code})</option>`
    ).join('');
  }

  async function loadCurve() {
    if (!meterSel.value) return;
    const meter = meters.find(m => m.code === meterSel.value);
    const params = qs({ meterCode: meterSel.value, start: rangeSel.value, stop: 'now()', every: everySel.value });
    const res = await api('/energy/readings' + params);
    const xLabels = res.data.map(r => fmtTime(r.time).slice(5));
    const values = res.data.map(r => +Number(r.value).toFixed(3));
    $('en-chart').data = {
      xLabels,
      series: [{ name: meter ? meter.name : meterSel.value, values, color: '#3b82f6' }],
      yUnit: ' ' + (meter ? meter.unit : '')
    };
    const sum = values.reduce((a, b) => a + b, 0);
    $('en-stat').textContent = `${res.data.length} 条数据点 · 区间累计 ${sum.toFixed(2)} ${meter ? meter.unit : ''}`;
  }

  await loadMeters();
  await loadCurve();

  $('en-refresh').addEventListener('click', loadCurve);
  meterSel.addEventListener('change', loadCurve);
  rangeSel.addEventListener('change', loadCurve);
  everySel.addEventListener('change', loadCurve);

  $('en-ingest').addEventListener('click', async () => {
    const meter = meters.find(m => m.code === meterSel.value);
    if (!meter) return;
    const form = document.createElement('div');
    form.innerHTML = `
      <div class="iecsp-form-grid">
        <div class="iecsp-form-row"><label>计量点</label><input class="iecsp-input" readonly value="${escapeHtml(meter.code + ' / ' + meter.name)}"/></div>
        <div class="iecsp-form-row"><label>能源类型</label><input class="iecsp-input" readonly value="${ENERGY_LABEL[meter.energyType] || meter.energyType}"/></div>
        <div class="iecsp-form-row"><label>数值 (${meter.unit})</label><input class="iecsp-input" id="in-val" type="number" step="0.01" required/></div>
        <div class="iecsp-form-row"><label>时间(留空=当前)</label><input class="iecsp-input" id="in-ts" type="datetime-local"/></div>
      </div>`;
    const ok = await modal({
      title: '手工补录读数',
      body: form,
      confirmText: '提交',
      onConfirm: async () => {
        const v = parseFloat(form.querySelector('#in-val').value);
        if (!Number.isFinite(v)) { toast('请输入合法数值', 'warning'); return false; }
        const tsv = form.querySelector('#in-ts').value;
        const ts = tsv ? new Date(tsv).getTime() : undefined;
        try {
          await api('/energy/ingest', { method: 'POST', body: { meterCode: meter.code, value: v, ts } });
          toast('补录成功', 'success');
          loadCurve();
        } catch (e) { toast(e.message || '补录失败', 'danger'); return false; }
      }
    });
  });

  const live = $('en-live');
  const rows = [];
  const handler = (ev) => {
    const p = ev.detail;
    rows.unshift(p);
    if (rows.length > 20) rows.pop();
    if (rows.length === 0) {
      live.innerHTML = '<tr><td colspan="3" class="empty">尚无消息</td></tr>';
    } else {
      live.innerHTML = rows.map(r => `<tr>
        <td>${fmtTime(r.ts, true)}</td>
        <td>${escapeHtml(r.meter)}</td>
        <td><strong>${Number(r.value).toFixed(2)}</strong></td>
      </tr>`).join('');
    }
  };
  window.addEventListener('iecsp:ws:meter', handler);

  return { dispose() { window.removeEventListener('iecsp:ws:meter', handler); } };
}
