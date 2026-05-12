// 配额履约
import { api } from '../core/api.js';
import { fmtNumber, escapeHtml } from '../core/utils.js';
import { modal } from '../core/modal.js';
import { toast } from '../core/toast.js';

export async function render(host) {
  host.innerHTML = `
    <div class="iecsp-page-title"><h2>排放配额 <small>登记年度配额，查看累计使用情况</small></h2></div>

    <section class="grid grid-3" id="q-kpis"></section>

    <iecsp-card class="mt-16">
      <div class="iecsp-toolbar">
        <select class="iecsp-select" id="q-period" style="max-width:160px"></select>
        <div class="spacer"></div>
        <button class="iecsp-btn" id="q-settle">触发结算</button>
        <button class="iecsp-btn is-primary" id="q-add">新增/调整配额</button>
      </div>
      <table class="iecsp-table">
        <thead><tr><th>履约年度</th><th>组织</th><th>来源</th><th>分配 (tCO₂e)</th><th>已用 (tCO₂e)</th><th>使用率</th><th>状态</th></tr></thead>
        <tbody id="q-rows"></tbody>
      </table>
    </iecsp-card>
  `;

  const $ = (id) => document.getElementById(id);
  const periodSel = $('q-period');
  const cur = new Date().getUTCFullYear();
  for (let y = cur + 1; y >= cur - 3; y--) {
    const o = document.createElement('option'); o.value = String(y); o.textContent = `${y} 履约年度`;
    if (y === cur) o.selected = true;
    periodSel.appendChild(o);
  }

  let orgs = [];
  async function loadOrgs() { orgs = (await api('/account/orgs')).data; }

  async function load() {
    const r = await api('/quota/overview?period=' + periodSel.value);
    const d = r.data;
    $('q-kpis').innerHTML = [
      { label: '配额分配', value: fmtNumber(d.totalAllocated, 0), unit: 'tCO₂e' },
      { label: '已使用',   value: fmtNumber(d.totalUsed, 2), unit: 'tCO₂e' },
      { label: '使用率',   value: (d.ratio * 100).toFixed(1), unit: '%', tone: d.ratio > 0.85 ? 'warning' : 'primary' }
    ].map(it => `<iecsp-card>
      <div class="iecsp-kpi">
        <div class="iecsp-kpi__label">${it.label}</div>
        <div class="iecsp-kpi__value" style="${it.tone==='warning'?'color:var(--warning)':''}">${it.value}<span class="unit">${it.unit}</span></div>
        ${it.label==='使用率'?'<div class="iecsp-bar '+(d.ratio>0.85?'is-warning':'')+'"><span style="width:'+Math.min(100,d.ratio*100).toFixed(1)+'%"></span></div>':''}
      </div>
    </iecsp-card>`).join('');

    const rows = (await api('/quota?period=' + periodSel.value)).data;
    if (!rows.length) { $('q-rows').innerHTML = '<tr><td colspan="7" class="empty">暂无配额记录</td></tr>'; return; }
    $('q-rows').innerHTML = rows.map(q => {
      const ratio = q.allocated > 0 ? q.used / q.allocated : 0;
      const tone = ratio > 1 ? 'is-danger' : ratio > 0.85 ? 'is-warning' : 'is-primary';
      return `<tr>
        <td>${q.period}</td>
        <td>${escapeHtml(q.org?.name || '—')}</td>
        <td><span class="iecsp-tag is-default">${escapeHtml(q.source)}</span></td>
        <td>${fmtNumber(q.allocated, 0)}</td>
        <td>${fmtNumber(q.used, 2)}</td>
        <td><div class="iecsp-bar ${ratio>0.85?'is-warning':''}" style="max-width:140px"><span style="width:${Math.min(100,ratio*100).toFixed(1)}%"></span></div><div class="txt-muted" style="font-size:11px;margin-top:4px">${(ratio*100).toFixed(1)}%</div></td>
        <td><span class="iecsp-tag ${tone}">${q.status}</span></td>
      </tr>`;
    }).join('');
  }

  periodSel.addEventListener('change', load);
  $('q-settle').addEventListener('click', async () => {
    try {
      await api('/quota/settle', { method: 'POST', body: { period: periodSel.value } });
      toast('结算完成', 'success'); load();
    } catch (e) { toast(e.message, 'danger'); }
  });
  $('q-add').addEventListener('click', () => {
    const form = document.createElement('div');
    const orgOpts = orgs.map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join('');
    form.innerHTML = `
      <div class="iecsp-form-grid">
        <div class="iecsp-form-row"><label>履约年度</label><input class="iecsp-input" id="qf-period" value="${periodSel.value}" pattern="\\d{4}"/></div>
        <div class="iecsp-form-row"><label>组织</label><select class="iecsp-select" id="qf-org">${orgOpts}</select></div>
        <div class="iecsp-form-row"><label>分配额 (tCO₂e)</label><input class="iecsp-input" id="qf-alloc" type="number" step="1"/></div>
        <div class="iecsp-form-row"><label>来源</label><select class="iecsp-select" id="qf-src"><option value="government">政府无偿分配</option><option value="market">市场购买</option><option value="offset">CCER 抵消</option></select></div>
        <div class="iecsp-form-row" style="grid-column:1/-1"><label>备注</label><input class="iecsp-input" id="qf-remark"/></div>
      </div>`;
    modal({
      title: '配额登记',
      body: form,
      onConfirm: async () => {
        const body = {
          period: form.querySelector('#qf-period').value,
          orgId: +form.querySelector('#qf-org').value,
          allocated: parseFloat(form.querySelector('#qf-alloc').value),
          source: form.querySelector('#qf-src').value,
          remark: form.querySelector('#qf-remark').value.trim() || undefined
        };
        try {
          await api('/quota', { method: 'POST', body });
          toast('已保存', 'success'); load();
        } catch (e) { toast(e.message, 'danger'); return false; }
      }
    });
  });

  await loadOrgs();
  await load();
  return {};
}
