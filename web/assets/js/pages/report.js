// 监管报送
import { api } from '../core/api.js';
import { fmtTime, escapeHtml } from '../core/utils.js';
import { modal } from '../core/modal.js';
import { toast } from '../core/toast.js';

const CHANNEL = { gov_energy: '能耗政府上报', gov_carbon: '碳排放政府上报', mrv: 'MRV 第三方核查' };
const STATUS  = { pending: '待提交', submitted: '已提交', accepted: '已受理', rejected: '已驳回' };
const STATUS_TAG = { pending: 'is-default', submitted: 'is-accent', accepted: 'is-primary', rejected: 'is-danger' };

export async function render(host) {
  host.innerHTML = `
    <div class="iecsp-page-title"><h2>数据报送 <small>对外报送记录与回执</small></h2></div>
    <iecsp-card>
      <div class="iecsp-toolbar">
        <select class="iecsp-select" id="rp-channel" style="max-width:200px">
          <option value="">全部通道</option>
          <option value="gov_energy">能耗政府上报</option>
          <option value="gov_carbon">碳排放政府上报</option>
          <option value="mrv">MRV 核查</option>
        </select>
        <input class="iecsp-input" id="rp-period" placeholder="期次 YYYYMM 或 YYYY" style="max-width:200px"/>
        <div class="spacer"></div>
        <button class="iecsp-btn is-primary" id="rp-prepare">准备新报送</button>
      </div>
      <table class="iecsp-table">
        <thead><tr><th>期次</th><th>通道</th><th>组织</th><th>状态</th><th>创建时间</th><th>提交时间</th><th>受理时间</th><th class="action-col">操作</th></tr></thead>
        <tbody id="rp-rows"></tbody>
      </table>
    </iecsp-card>
  `;

  const $ = (id) => document.getElementById(id);
  let orgs = [];
  async function loadOrgs() { orgs = (await api('/account/orgs')).data; }

  async function load() {
    const q = new URLSearchParams();
    if ($('rp-channel').value) q.set('channel', $('rp-channel').value);
    if ($('rp-period').value)  q.set('period', $('rp-period').value);
    const r = await api('/report' + (q.toString() ? '?' + q.toString() : ''));
    if (!r.data.length) { $('rp-rows').innerHTML = '<tr><td colspan="8" class="empty">暂无报送记录</td></tr>'; return; }
    $('rp-rows').innerHTML = r.data.map(it => `<tr>
      <td>${escapeHtml(it.period)}</td>
      <td>${CHANNEL[it.channel] || it.channel}</td>
      <td>${escapeHtml(it.org?.name || '—')}</td>
      <td><span class="iecsp-tag ${STATUS_TAG[it.status]}">${STATUS[it.status] || it.status}</span></td>
      <td class="txt-muted">${fmtTime(it.createdAt)}</td>
      <td class="txt-muted">${it.submittedAt ? fmtTime(it.submittedAt) : '—'}</td>
      <td class="txt-muted">${it.acceptedAt ? fmtTime(it.acceptedAt) : '—'}</td>
      <td class="action-col">
        <button class="iecsp-btn sm" data-act="view" data-id="${it.id}">查看</button>
        ${it.status==='pending'  ? `<button class="iecsp-btn is-primary sm" data-act="submit" data-id="${it.id}">提交</button>`:''}
        ${it.status==='submitted'? `<button class="iecsp-btn sm" data-act="mark-ok" data-id="${it.id}">标记受理</button>`:''}
        ${it.status==='submitted'? `<button class="iecsp-btn sm" data-act="mark-no" data-id="${it.id}">标记驳回</button>`:''}
      </td>
    </tr>`).join('');
  }

  $('rp-channel').addEventListener('change', load);
  $('rp-period').addEventListener('change', load);

  $('rp-prepare').addEventListener('click', () => {
    const form = document.createElement('div');
    const orgOpts = orgs.map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join('');
    form.innerHTML = `
      <div class="iecsp-form-grid">
        <div class="iecsp-form-row"><label>期次</label><input class="iecsp-input" id="pp-period" placeholder="YYYYMM 或 YYYY"/></div>
        <div class="iecsp-form-row"><label>组织</label><select class="iecsp-select" id="pp-org">${orgOpts}</select></div>
        <div class="iecsp-form-row" style="grid-column:1/-1"><label>通道</label><select class="iecsp-select" id="pp-channel"><option value="gov_energy">能耗政府上报</option><option value="gov_carbon">碳排放政府上报</option><option value="mrv">MRV 核查</option></select></div>
      </div>`;
    modal({
      title: '准备报送',
      body: form,
      onConfirm: async () => {
        const body = {
          period: form.querySelector('#pp-period').value.trim(),
          orgId: +form.querySelector('#pp-org').value,
          channel: form.querySelector('#pp-channel').value
        };
        try { await api('/report/prepare', { method: 'POST', body }); toast('已生成快照', 'success'); load(); }
        catch (e) { toast(e.message, 'danger'); return false; }
      }
    });
  });

  $('rp-rows').addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const id = +t.getAttribute('data-id');
    const act = t.getAttribute('data-act');
    try {
      if (act === 'submit') { await api(`/report/${id}/submit`, { method: 'POST' }); toast('已提交', 'success'); }
      else if (act === 'mark-ok') { await api(`/report/${id}/mark`, { method: 'POST', body: { status: 'accepted' } }); toast('已标记受理', 'success'); }
      else if (act === 'mark-no') {
        const reason = prompt('驳回原因') || '';
        await api(`/report/${id}/mark`, { method: 'POST', body: { status: 'rejected', reason } });
        toast('已标记驳回', 'warning');
      } else if (act === 'view') {
        const all = (await api('/report')).data;
        const it = all.find(x => x.id === id);
        if (!it) return;
        const pre = document.createElement('pre');
        pre.style.cssText = 'background:var(--bg-2);padding:12px;border-radius:6px;overflow:auto;max-height:50vh;font-size:12px;color:var(--fg-muted)';
        try { pre.textContent = JSON.stringify(JSON.parse(it.payloadJson), null, 2); } catch { pre.textContent = it.payloadJson; }
        modal({ title: `报送快照 #${id}`, body: pre, confirmText: '关闭', cancelText: '' });
        return;
      }
      load();
    } catch (ex) { toast(ex.message, 'danger'); }
  });

  await loadOrgs();
  await load();
  return {};
}
