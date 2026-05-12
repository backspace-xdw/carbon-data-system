// 计量点台账
import { api } from '../core/api.js';
import { ENERGY_LABEL, escapeHtml, fmtTime } from '../core/utils.js';
import { modal } from '../core/modal.js';
import { toast } from '../core/toast.js';

export async function render(host) {
  host.innerHTML = `
    <div class="iecsp-page-title"><h2>计量点管理 <small>登记表计、维护采集主题</small></h2></div>
    <iecsp-card>
      <div class="iecsp-toolbar">
        <select class="iecsp-select" id="m-type" style="max-width:180px">
          <option value="">全部能源类型</option>
        </select>
        <select class="iecsp-select" id="m-status" style="max-width:160px">
          <option value="">全部状态</option>
          <option value="active">运行中</option>
          <option value="paused">已暂停</option>
          <option value="scrapped">已报废</option>
        </select>
        <div class="spacer"></div>
        <button class="iecsp-btn is-primary" id="m-add">新增计量点</button>
      </div>
      <table class="iecsp-table">
        <thead><tr>
          <th>编号</th><th>名称</th><th>能源</th><th>所属组织</th><th>单位</th>
          <th>位置</th><th>MQTT 主题</th><th>状态</th><th>建档时间</th><th class="action-col">操作</th>
        </tr></thead>
        <tbody id="m-rows"></tbody>
      </table>
    </iecsp-card>
  `;

  const $ = (id) => document.getElementById(id);
  const typeSel = $('m-type'), statusSel = $('m-status');
  ['electricity','gas','water','steam','heat','coal'].forEach(t => {
    const o = document.createElement('option'); o.value = t; o.textContent = ENERGY_LABEL[t]; typeSel.appendChild(o);
  });

  let orgs = [];
  async function loadOrgs() {
    const r = await api('/account/orgs');
    orgs = r.data;
  }
  async function load() {
    const qs = new URLSearchParams();
    if (typeSel.value) qs.set('energyType', typeSel.value);
    if (statusSel.value) qs.set('status', statusSel.value);
    const r = await api('/meters' + (qs.toString() ? '?' + qs.toString() : ''));
    const rows = r.data;
    const tb = $('m-rows');
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="10" class="empty">暂无计量点</td></tr>'; return; }
    tb.innerHTML = rows.map(m => `<tr>
      <td><code style="font-size:12px">${escapeHtml(m.code)}</code></td>
      <td>${escapeHtml(m.name)}</td>
      <td><span class="iecsp-tag is-accent">${ENERGY_LABEL[m.energyType] || m.energyType}</span></td>
      <td>${escapeHtml(m.org?.name || '—')}</td>
      <td>${escapeHtml(m.unit)}</td>
      <td>${escapeHtml(m.location || '—')}</td>
      <td style="font-family:ui-monospace,Menlo,monospace;font-size:11px;color:var(--fg-muted)">${escapeHtml(m.mqttTopic || '—')}</td>
      <td>${tagStatus(m.status)}</td>
      <td class="txt-muted">${fmtTime(m.createdAt).slice(0,10)}</td>
      <td class="action-col">
        <button class="iecsp-btn sm" data-act="edit" data-id="${m.id}">编辑</button>
        <button class="iecsp-btn sm" data-act="toggle" data-id="${m.id}">${m.status === 'active' ? '暂停' : '启用'}</button>
      </td>
    </tr>`).join('');
  }

  function tagStatus(s) {
    if (s === 'active')   return '<span class="iecsp-tag is-primary">运行中</span>';
    if (s === 'paused')   return '<span class="iecsp-tag is-warning">已暂停</span>';
    if (s === 'scrapped') return '<span class="iecsp-tag is-default">已报废</span>';
    return `<span class="iecsp-tag is-default">${escapeHtml(s)}</span>`;
  }

  await loadOrgs();
  await load();
  typeSel.addEventListener('change', load);
  statusSel.addEventListener('change', load);

  $('m-add').addEventListener('click', () => openEditor(null));

  $('m-rows').addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const id = +t.getAttribute('data-id');
    const act = t.getAttribute('data-act');
    if (act === 'edit') {
      const r = await api('/meters/' + id);
      openEditor(r.data);
    } else if (act === 'toggle') {
      const r = await api('/meters/' + id);
      const next = r.data.status === 'active' ? 'paused' : 'active';
      try {
        await api('/meters/' + id, { method: 'PUT', body: { status: next } });
        toast('已更新', 'success');
        load();
      } catch (ex) { toast(ex.message, 'danger'); }
    }
  });

  function openEditor(m) {
    const isNew = !m;
    const form = document.createElement('div');
    const energyOpts = ['electricity','gas','water','steam','heat','coal']
      .map(t => `<option value="${t}" ${m && m.energyType === t ? 'selected' : ''}>${ENERGY_LABEL[t]}</option>`).join('');
    const orgOpts = orgs.map(o => `<option value="${o.id}" ${m && m.orgId === o.id ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
    form.innerHTML = `
      <div class="iecsp-form-grid">
        <div class="iecsp-form-row"><label>编号</label><input class="iecsp-input" id="f-code" ${isNew ? '' : 'readonly'} value="${escapeHtml(m?.code || '')}" placeholder="如 M-E-001"/></div>
        <div class="iecsp-form-row"><label>名称</label><input class="iecsp-input" id="f-name" value="${escapeHtml(m?.name || '')}"/></div>
        <div class="iecsp-form-row"><label>能源类型</label><select class="iecsp-select" id="f-et" ${isNew ? '' : 'disabled'}>${energyOpts}</select></div>
        <div class="iecsp-form-row"><label>所属组织</label><select class="iecsp-select" id="f-org">${orgOpts}</select></div>
        <div class="iecsp-form-row"><label>单位</label><input class="iecsp-input" id="f-unit" value="${escapeHtml(m?.unit || '')}"/></div>
        <div class="iecsp-form-row"><label>倍率</label><input class="iecsp-input" id="f-scale" type="number" step="0.001" value="${m?.scaleFactor ?? 1}"/></div>
        <div class="iecsp-form-row"><label>位置</label><input class="iecsp-input" id="f-loc" value="${escapeHtml(m?.location || '')}"/></div>
        <div class="iecsp-form-row"><label>MQTT 主题</label><input class="iecsp-input" id="f-mqtt" value="${escapeHtml(m?.mqttTopic || '')}" placeholder="iecsp/meter/M-E-001/reading"/></div>
      </div>`;
    modal({
      title: isNew ? '新增计量点' : '编辑计量点',
      body: form,
      confirmText: isNew ? '创建' : '保存',
      onConfirm: async () => {
        const body = {
          code: form.querySelector('#f-code').value.trim(),
          name: form.querySelector('#f-name').value.trim(),
          energyType: form.querySelector('#f-et').value,
          orgId: +form.querySelector('#f-org').value,
          unit: form.querySelector('#f-unit').value.trim(),
          scaleFactor: +form.querySelector('#f-scale').value,
          location: form.querySelector('#f-loc').value.trim(),
          mqttTopic: form.querySelector('#f-mqtt').value.trim() || undefined
        };
        try {
          if (isNew) await api('/meters', { method: 'POST', body });
          else {
            const patch = { name: body.name, location: body.location, scaleFactor: body.scaleFactor, mqttTopic: body.mqttTopic };
            await api('/meters/' + m.id, { method: 'PUT', body: patch });
          }
          toast('已保存', 'success');
          load();
        } catch (ex) { toast(ex.message, 'danger'); return false; }
      }
    });
  }

  return {};
}
