// 组织账户 + 审计
import { api } from '../core/api.js';
import { fmtTime, ROLE_LABEL, escapeHtml } from '../core/utils.js';
import { modal } from '../core/modal.js';
import { toast } from '../core/toast.js';

const ROLE_OPTS = ['platform_admin','park_admin','data_steward','observer'];

export async function render(host) {
  host.innerHTML = `
    <div class="iecsp-page-title"><h2>组织账户 <small>组织树 · 账户 · 审计</small></h2></div>

    <section class="grid grid-2">
      <iecsp-card title="组织树">
        <div class="iecsp-toolbar"><div class="spacer"></div><button class="iecsp-btn is-primary sm" id="ac-add-org">新增组织</button></div>
        <table class="iecsp-table">
          <thead><tr><th>编号</th><th>名称</th><th>类型</th><th>上级</th><th>备注</th></tr></thead>
          <tbody id="ac-orgs"></tbody>
        </table>
      </iecsp-card>

      <iecsp-card title="账户">
        <div class="iecsp-toolbar"><div class="spacer"></div><button class="iecsp-btn is-primary sm" id="ac-add-user">新增账户</button></div>
        <table class="iecsp-table">
          <thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>组织</th><th>状态</th><th>最近登录</th><th class="action-col">操作</th></tr></thead>
          <tbody id="ac-users"></tbody>
        </table>
      </iecsp-card>
    </section>

    <iecsp-card class="mt-16" title="审计日志" hint="最近 200 条">
      <table class="iecsp-table">
        <thead><tr><th>时间</th><th>账号</th><th>动作</th><th>对象</th><th>详情</th><th>IP</th></tr></thead>
        <tbody id="ac-audits"></tbody>
      </table>
    </iecsp-card>
  `;

  const $ = (id) => document.getElementById(id);

  async function load() {
    const [orgs, users, audits] = await Promise.all([
      api('/account/orgs'), api('/account/accounts'), api('/account/audits?limit=200')
    ]);
    paintOrgs(orgs.data);
    paintUsers(users.data, orgs.data);
    paintAudits(audits.data);
  }

  function paintOrgs(rows) {
    const map = new Map(rows.map(r => [r.id, r]));
    $('ac-orgs').innerHTML = rows.length ? rows.map(o => `<tr>
      <td><code style="font-size:12px">${escapeHtml(o.code)}</code></td>
      <td>${escapeHtml(o.name)}</td>
      <td><span class="iecsp-tag is-default">${escapeHtml(o.kind)}</span></td>
      <td>${o.parentId && map.get(o.parentId) ? escapeHtml(map.get(o.parentId).name) : '<span class="txt-dim">—</span>'}</td>
      <td class="txt-muted">${escapeHtml(o.remark || '')}</td>
    </tr>`).join('') : '<tr><td colspan="5" class="empty">暂无</td></tr>';
  }

  function paintUsers(rows, orgs) {
    const orgMap = new Map(orgs.map(o => [o.id, o]));
    $('ac-users').innerHTML = rows.length ? rows.map(u => `<tr>
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td>${escapeHtml(u.displayName)}</td>
      <td><span class="iecsp-tag is-accent">${ROLE_LABEL[u.role] || u.role}</span></td>
      <td>${u.orgId && orgMap.get(u.orgId) ? escapeHtml(orgMap.get(u.orgId).name) : '—'}</td>
      <td><span class="iecsp-tag ${u.status==='active'?'is-primary':'is-default'}">${u.status}</span></td>
      <td class="txt-muted">${u.lastLoginAt ? fmtTime(u.lastLoginAt) : '从未登录'}</td>
      <td class="action-col">
        <button class="iecsp-btn sm" data-act="edit" data-id="${u.id}">编辑</button>
        <button class="iecsp-btn sm" data-act="reset" data-id="${u.id}">重置密码</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="7" class="empty">暂无</td></tr>';
  }

  function paintAudits(rows) {
    $('ac-audits').innerHTML = rows.length ? rows.map(a => `<tr>
      <td class="txt-muted">${fmtTime(a.createdAt, true)}</td>
      <td>${a.account ? escapeHtml(a.account.username) : '<span class="txt-dim">—</span>'}</td>
      <td><code style="font-size:12px">${escapeHtml(a.action)}</code></td>
      <td>${escapeHtml(a.target || '')}</td>
      <td class="txt-muted">${escapeHtml(a.detail || '')}</td>
      <td class="txt-dim" style="font-size:11px">${escapeHtml(a.ip || '')}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">暂无</td></tr>';
  }

  $('ac-orgs').addEventListener('click', () => {});

  $('ac-add-org').addEventListener('click', async () => {
    const orgs = (await api('/account/orgs')).data;
    const form = document.createElement('div');
    const parent = '<option value="">无</option>' + orgs.map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join('');
    form.innerHTML = `
      <div class="iecsp-form-grid">
        <div class="iecsp-form-row"><label>编号</label><input class="iecsp-input" id="o-code"/></div>
        <div class="iecsp-form-row"><label>名称</label><input class="iecsp-input" id="o-name"/></div>
        <div class="iecsp-form-row"><label>类型</label><select class="iecsp-select" id="o-kind"><option value="park">园区</option><option value="enterprise" selected>企业</option><option value="workshop">车间</option></select></div>
        <div class="iecsp-form-row"><label>上级</label><select class="iecsp-select" id="o-parent">${parent}</select></div>
        <div class="iecsp-form-row" style="grid-column:1/-1"><label>备注</label><input class="iecsp-input" id="o-remark"/></div>
      </div>`;
    modal({
      title: '新增组织', body: form,
      onConfirm: async () => {
        const body = {
          code: form.querySelector('#o-code').value.trim(),
          name: form.querySelector('#o-name').value.trim(),
          kind: form.querySelector('#o-kind').value,
          parentId: form.querySelector('#o-parent').value ? +form.querySelector('#o-parent').value : undefined,
          remark: form.querySelector('#o-remark').value.trim() || undefined
        };
        try { await api('/account/orgs', { method: 'POST', body }); toast('已保存', 'success'); load(); }
        catch (e) { toast(e.message, 'danger'); return false; }
      }
    });
  });

  $('ac-add-user').addEventListener('click', async () => {
    const orgs = (await api('/account/orgs')).data;
    const form = document.createElement('div');
    const orgOpts = '<option value="">无</option>' + orgs.map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join('');
    const roleOpts = ROLE_OPTS.map(r => `<option value="${r}">${ROLE_LABEL[r]}</option>`).join('');
    form.innerHTML = `
      <div class="iecsp-form-grid">
        <div class="iecsp-form-row"><label>账号</label><input class="iecsp-input" id="u-username"/></div>
        <div class="iecsp-form-row"><label>姓名</label><input class="iecsp-input" id="u-name"/></div>
        <div class="iecsp-form-row"><label>初始密码</label><input class="iecsp-input" id="u-pwd" type="password" placeholder="至少 8 位"/></div>
        <div class="iecsp-form-row"><label>角色</label><select class="iecsp-select" id="u-role">${roleOpts}</select></div>
        <div class="iecsp-form-row" style="grid-column:1/-1"><label>组织</label><select class="iecsp-select" id="u-org">${orgOpts}</select></div>
      </div>`;
    modal({
      title: '新增账户', body: form,
      onConfirm: async () => {
        const body = {
          username: form.querySelector('#u-username').value.trim(),
          displayName: form.querySelector('#u-name').value.trim(),
          password: form.querySelector('#u-pwd').value,
          role: form.querySelector('#u-role').value,
          orgId: form.querySelector('#u-org').value ? +form.querySelector('#u-org').value : undefined
        };
        try { await api('/account/accounts', { method: 'POST', body }); toast('已创建', 'success'); load(); }
        catch (e) { toast(e.message, 'danger'); return false; }
      }
    });
  });

  $('ac-users').addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const id = +t.getAttribute('data-id');
    const act = t.getAttribute('data-act');
    if (act === 'reset') {
      const pwd = prompt('请输入新密码(至少 8 位):'); if (!pwd) return;
      try { await api(`/account/accounts/${id}/reset`, { method: 'POST', body: { newPassword: pwd } }); toast('已重置', 'success'); }
      catch (ex) { toast(ex.message, 'danger'); }
    } else if (act === 'edit') {
      const users = (await api('/account/accounts')).data;
      const orgs = (await api('/account/orgs')).data;
      const u = users.find(x => x.id === id); if (!u) return;
      const form = document.createElement('div');
      const orgOpts = '<option value="">无</option>' + orgs.map(o => `<option value="${o.id}" ${u.orgId===o.id?'selected':''}>${escapeHtml(o.name)}</option>`).join('');
      const roleOpts = ROLE_OPTS.map(r => `<option value="${r}" ${u.role===r?'selected':''}>${ROLE_LABEL[r]}</option>`).join('');
      form.innerHTML = `
        <div class="iecsp-form-grid">
          <div class="iecsp-form-row"><label>姓名</label><input class="iecsp-input" id="u-name" value="${escapeHtml(u.displayName)}"/></div>
          <div class="iecsp-form-row"><label>角色</label><select class="iecsp-select" id="u-role">${roleOpts}</select></div>
          <div class="iecsp-form-row"><label>状态</label><select class="iecsp-select" id="u-status"><option value="active" ${u.status==='active'?'selected':''}>启用</option><option value="disabled" ${u.status==='disabled'?'selected':''}>停用</option></select></div>
          <div class="iecsp-form-row"><label>组织</label><select class="iecsp-select" id="u-org">${orgOpts}</select></div>
        </div>`;
      modal({
        title: `编辑账户 ${u.username}`, body: form,
        onConfirm: async () => {
          const body = {
            displayName: form.querySelector('#u-name').value.trim(),
            role: form.querySelector('#u-role').value,
            status: form.querySelector('#u-status').value,
            orgId: form.querySelector('#u-org').value ? +form.querySelector('#u-org').value : undefined
          };
          try { await api(`/account/accounts/${id}`, { method: 'PUT', body }); toast('已保存', 'success'); load(); }
          catch (ex) { toast(ex.message, 'danger'); return false; }
        }
      });
    }
  });

  await load();
  return {};
}
