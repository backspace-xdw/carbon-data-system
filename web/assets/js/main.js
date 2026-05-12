// 应用入口

import { api, clearToken, getToken } from './core/api.js';
import { defineRoute, start, getRoutes } from './core/router.js';
import { connect as wsConnect } from './core/realtime.js';
import { store } from './core/store.js';
import { toast } from './core/toast.js';
import { SEVERITY_LABEL } from './core/utils.js';

import './components/iecsp-card.js';
import './components/iecsp-chart.js';

// ===== 路由表 =====
const NAV = [
  { group: '数据看板', items: [
    { path: '/cockpit', title: '综合总览', icon: 'cockpit', minRole: 'observer' }
  ]},
  { group: '数据采集', items: [
    { path: '/energy',  title: '实时数据',  icon: 'energy', minRole: 'observer' },
    { path: '/meters',  title: '计量点管理', icon: 'meter', minRole: 'observer' }
  ]},
  { group: '碳排放管理', items: [
    { path: '/carbon',  title: '碳排放核算', icon: 'leaf',  minRole: 'observer' },
    { path: '/quota',   title: '排放配额',   icon: 'quota', minRole: 'observer' }
  ]},
  { group: '报警与报送', items: [
    { path: '/risk',    title: '报警管理',  icon: 'risk',   minRole: 'observer' },
    { path: '/report',  title: '数据报送',  icon: 'report', minRole: 'observer' }
  ]},
  { group: '系统管理', items: [
    { path: '/account', title: '用户与组织', icon: 'org',   minRole: 'park_admin' }
  ]}
];

const ICON = {
  cockpit: 'M3 12 L12 4 L21 12 V20 H14 V14 H10 V20 H3 Z',
  energy:  'M13 2 L4 14 H11 L9 22 L20 10 H13 Z',
  meter:   'M4 4 H20 V20 H4 Z M4 9 H20 M9 9 V20 M15 9 V20',
  leaf:    'M5 19 C5 11 11 5 19 5 C19 13 13 19 5 19 Z M5 19 L12 12',
  quota:   'M4 20 V12 H8 V20 Z M10 20 V8 H14 V20 Z M16 20 V14 H20 V20 Z',
  risk:    'M12 3 L22 21 H2 Z M12 10 V14 M12 17 V18',
  report:  'M6 3 H16 L20 7 V21 H6 Z M14 3 V8 H20',
  org:     'M12 3 V9 M6 21 V13 M18 21 V13 M12 9 H6 V13 H18 V9 H12'
};

defineRoute({ path: '/cockpit', title: '综合总览',   loader: () => import('./pages/cockpit.js') });
defineRoute({ path: '/energy',  title: '实时数据',   loader: () => import('./pages/energy.js') });
defineRoute({ path: '/meters',  title: '计量点管理', loader: () => import('./pages/meters.js') });
defineRoute({ path: '/carbon',  title: '碳排放核算', loader: () => import('./pages/carbon.js') });
defineRoute({ path: '/quota',   title: '排放配额',   loader: () => import('./pages/quota.js') });
defineRoute({ path: '/risk',    title: '报警管理',   loader: () => import('./pages/risk.js') });
defineRoute({ path: '/report',  title: '数据报送',   loader: () => import('./pages/report.js') });
defineRoute({ path: '/account', title: '用户与组织', loader: () => import('./pages/account.js') });

// ===== Boot =====
(async function boot() {
  if (!getToken()) { location.replace('/login.html'); return; }
  try {
    const res = await api('/auth/me');
    store.set({ profile: res.data });
    renderProfile(res.data);
    renderNav(res.data);
  } catch (e) {
    location.replace('/login.html');
    return;
  }
  start('#view-host');
  wsConnect();
  bindHeaderEvents();
  bindWsEvents();
})();

function renderProfile(p) {
  document.getElementById('profile-name').textContent = `${p.displayName}`;
  document.getElementById('profile-name').classList.remove('txt-muted');
  document.getElementById('avatar').textContent = (p.displayName || '·').charAt(0);
}

function renderNav(profile) {
  const root = document.getElementById('nav-root');
  const ROLE_RANK = { platform_admin: 100, park_admin: 70, data_steward: 40, observer: 10 };
  const my = ROLE_RANK[profile.role] || 0;
  const html = NAV.map(g => {
    const items = g.items.filter(it => my >= (ROLE_RANK[it.minRole] || 0));
    if (!items.length) return '';
    return `<div class="iecsp-nav__group">
      <div class="iecsp-nav__title">${g.group}</div>
      ${items.map(it => `<a class="iecsp-nav__item" data-path="${it.path}" href="#${it.path}">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[it.icon] || ''}"/></svg>
        <span>${it.title}</span>
      </a>`).join('')}
    </div>`;
  }).join('');
  root.innerHTML = html;
  syncNavActive();
  window.addEventListener('iecsp:route', syncNavActive);
}

function syncNavActive() {
  const path = (location.hash || '#/cockpit').slice(1);
  document.querySelectorAll('.iecsp-nav__item').forEach(el => {
    el.classList.toggle('is-active', el.getAttribute('data-path') === path);
  });
  const route = getRoutes().find(r => r.path === path);
  const crumb = document.getElementById('crumb');
  if (route) crumb.innerHTML = `<span class="txt-muted">首页 /</span> <strong>${route.title}</strong>`;
}

function bindHeaderEvents() {
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    clearToken();
    location.replace('/login.html');
  });
}

function bindWsEvents() {
  const dot = document.getElementById('ws-dot');
  const apply = (ok) => { dot.style.background = ok ? 'var(--primary)' : 'var(--fg-dim)'; };
  apply(false);
  window.addEventListener('iecsp:ws', (e) => apply(e.detail.ready));
  window.addEventListener('iecsp:ws:risk', (e) => {
    const ev = e.detail || {};
    toast(`【${SEVERITY_LABEL[ev.severity] || ''}】${ev.message || '新的风险事件'}`, ev.severity === 'critical' ? 'danger' : 'warning', 5000);
  });
}
