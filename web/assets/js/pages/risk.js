// 风险预警
import { api } from '../core/api.js';
import { fmtTime, ago, escapeHtml, SEVERITY_LABEL, SEVERITY_TAG, STATUS_LABEL } from '../core/utils.js';
import { modal } from '../core/modal.js';
import { toast } from '../core/toast.js';

export async function render(host) {
  host.innerHTML = `
    <div class="iecsp-page-title"><h2>报警管理 <small>触发规则、处理记录</small></h2></div>

    <iecsp-card class="mt-0">
      <div class="iecsp-toolbar">
        <select class="iecsp-select" id="r-status" style="max-width:160px">
          <option value="">全部状态</option>
          <option value="open" selected>未处置</option>
          <option value="acknowledged">处置中</option>
          <option value="closed">已闭环</option>
        </select>
        <select class="iecsp-select" id="r-sev" style="max-width:160px">
          <option value="">全部严重度</option>
          <option value="critical">严重</option>
          <option value="warning">警告</option>
          <option value="info">提示</option>
        </select>
        <div class="spacer"></div>
        <button class="iecsp-btn" id="r-refresh">刷新</button>
      </div>
      <table class="iecsp-table">
        <thead><tr><th>发生时间</th><th>严重度</th><th>计量点</th><th>规则</th><th>读数</th><th>消息</th><th>状态</th><th class="action-col">操作</th></tr></thead>
        <tbody id="r-rows"></tbody>
      </table>
    </iecsp-card>

    <iecsp-card class="mt-16" title="报警规则" hint="规则触发后生成事件，有冷却时间">
      <div class="iecsp-toolbar"><div class="spacer"></div><button class="iecsp-btn is-primary sm" id="r-add-rule">新增规则</button></div>
      <table class="iecsp-table">
        <thead><tr><th>编号</th><th>名称</th><th>范围</th><th>指标</th><th>条件</th><th>严重度</th><th>启用</th></tr></thead>
        <tbody id="r-rules"></tbody>
      </table>
    </iecsp-card>
  `;

  const $ = (id) => document.getElementById(id);

  async function load() {
    const params = new URLSearchParams();
    if ($('r-status').value) params.set('status', $('r-status').value);
    if ($('r-sev').value) params.set('severity', $('r-sev').value);
    const evs = await api('/risk/events' + (params.toString() ? '?' + params.toString() : ''));
    const rows = evs.data;
    if (!rows.length) { $('r-rows').innerHTML = '<tr><td colspan="8" class="empty">暂无事件</td></tr>'; }
    else $('r-rows').innerHTML = rows.map(e => `<tr>
      <td>${fmtTime(e.occurredAt, true)}<div class="txt-dim" style="font-size:11px">${ago(e.occurredAt)}</div></td>
      <td><span class="iecsp-tag ${SEVERITY_TAG[e.severity] || 'is-default'}">${SEVERITY_LABEL[e.severity] || e.severity}</span></td>
      <td>${e.meter ? escapeHtml(e.meter.name) + '<div class="txt-dim" style="font-size:11px">'+escapeHtml(e.meter.code)+'</div>' : '<span class="txt-dim">—</span>'}</td>
      <td>${escapeHtml(e.rule?.name || '')}<div class="txt-dim" style="font-size:11px">${escapeHtml(e.rule?.code || '')}</div></td>
      <td><strong>${e.value ?? '—'}</strong></td>
      <td>${escapeHtml(e.message)}</td>
      <td><span class="iecsp-tag ${e.status==='closed'?'is-default':e.status==='acknowledged'?'is-accent':'is-warning'}">${STATUS_LABEL[e.status] || e.status}</span></td>
      <td class="action-col">
        ${e.status==='open' ? `<button class="iecsp-btn sm" data-act="ack" data-id="${e.id}">认领处置</button>`:''}
        ${e.status!=='closed' ? `<button class="iecsp-btn sm" data-act="close" data-id="${e.id}">闭环</button>`:''}
      </td>
    </tr>`).join('');

    const rules = (await api('/risk/rules')).data;
    if (!rules.length) { $('r-rules').innerHTML = '<tr><td colspan="7" class="empty">暂无规则</td></tr>'; }
    else $('r-rules').innerHTML = rules.map(r => `<tr>
      <td><code style="font-size:12px">${escapeHtml(r.code)}</code></td>
      <td>${escapeHtml(r.name)}</td>
      <td><span class="iecsp-tag is-default">${r.scope}</span></td>
      <td>${escapeHtml(r.metric)}</td>
      <td>${escapeHtml(r.operator)} ${escapeHtml(r.threshold)}</td>
      <td><span class="iecsp-tag ${SEVERITY_TAG[r.severity] || 'is-default'}">${SEVERITY_LABEL[r.severity] || r.severity}</span></td>
      <td>${r.enabled ? '<span class="iecsp-tag is-primary">是</span>' : '<span class="iecsp-tag is-default">否</span>'}</td>
    </tr>`).join('');
  }

  $('r-status').addEventListener('change', load);
  $('r-sev').addEventListener('change', load);
  $('r-refresh').addEventListener('click', load);

  $('r-rows').addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const id = +t.getAttribute('data-id');
    const act = t.getAttribute('data-act');
    try {
      if (act === 'ack') await api('/risk/events/' + id + '/ack', { method: 'POST' });
      else {
        const note = prompt('闭环说明(可选):') || '';
        await api('/risk/events/' + id + '/close', { method: 'POST', body: { note } });
      }
      toast('已更新', 'success'); load();
    } catch (ex) { toast(ex.message, 'danger'); }
  });

  $('r-add-rule').addEventListener('click', () => {
    const form = document.createElement('div');
    form.innerHTML = `
      <div class="iecsp-form-grid">
        <div class="iecsp-form-row"><label>编号</label><input class="iecsp-input" id="rr-code"/></div>
        <div class="iecsp-form-row"><label>名称</label><input class="iecsp-input" id="rr-name"/></div>
        <div class="iecsp-form-row"><label>范围</label><select class="iecsp-select" id="rr-scope"><option value="meter">计量点</option><option value="org">组织</option><option value="global">全局</option></select></div>
        <div class="iecsp-form-row"><label>指标</label><select class="iecsp-select" id="rr-metric"><option value="value">瞬时值</option><option value="quota_ratio">配额使用率</option></select></div>
        <div class="iecsp-form-row"><label>操作符</label><select class="iecsp-select" id="rr-op"><option value="gt">大于</option><option value="gte">≥</option><option value="lt">小于</option><option value="lte">≤</option></select></div>
        <div class="iecsp-form-row"><label>阈值</label><input class="iecsp-input" id="rr-th" placeholder="如 5000"/></div>
        <div class="iecsp-form-row"><label>严重度</label><select class="iecsp-select" id="rr-sev"><option value="info">提示</option><option value="warning" selected>警告</option><option value="critical">严重</option></select></div>
        <div class="iecsp-form-row"><label>冷却(秒)</label><input class="iecsp-input" id="rr-cd" type="number" value="300"/></div>
      </div>`;
    modal({
      title: '新增风险规则',
      body: form,
      onConfirm: async () => {
        const body = {
          code: form.querySelector('#rr-code').value.trim(),
          name: form.querySelector('#rr-name').value.trim(),
          scope: form.querySelector('#rr-scope').value,
          metric: form.querySelector('#rr-metric').value,
          operator: form.querySelector('#rr-op').value,
          threshold: form.querySelector('#rr-th').value.trim(),
          severity: form.querySelector('#rr-sev').value,
          cooldownSec: +form.querySelector('#rr-cd').value
        };
        try { await api('/risk/rules', { method: 'POST', body }); toast('已保存', 'success'); load(); }
        catch (ex) { toast(ex.message, 'danger'); return false; }
      }
    });
  });

  await load();
  const onWs = () => load();
  window.addEventListener('iecsp:ws:risk', onWs);
  return { dispose() { window.removeEventListener('iecsp:ws:risk', onWs); } };
}
