// Hash 路由 — /#/cockpit 形式
// 每条路由:{ path, title, loader: () => Promise<{render(host, ctx), dispose?}> }

const routes = [];
let current = null;

export function defineRoute(def) { routes.push(def); }

export function getRoutes() { return [...routes]; }

export function start(hostSelector) {
  const host = document.querySelector(hostSelector);
  const dispatch = async () => {
    const hash = location.hash || '#/cockpit';
    const path = hash.startsWith('#') ? hash.slice(1) : hash;
    const route = routes.find(r => r.path === path) || routes[0];
    if (current && current.dispose) {
      try { current.dispose(); } catch (e) { console.warn('dispose error', e); }
    }
    document.title = (route.title || 'IECSP') + ' · 工业能碳协同管控平台';
    host.innerHTML = '<div style="padding:48px 0;text-align:center;color:var(--fg-dim)"><span class="iecsp-loading"></span>&nbsp;&nbsp;载入中…</div>';
    try {
      const mod = await route.loader();
      current = await mod.render(host, { route });
      window.dispatchEvent(new CustomEvent('iecsp:route', { detail: { path: route.path, title: route.title } }));
    } catch (e) {
      console.error(e);
      host.innerHTML = `<div class="iecsp-card"><h3 style="color:var(--danger)">页面载入失败</h3><pre style="white-space:pre-wrap;color:var(--fg-muted);margin-top:12px">${(e && e.message) || e}</pre></div>`;
    }
  };
  window.addEventListener('hashchange', dispatch);
  dispatch();
}

export function go(path) {
  if (!path.startsWith('/')) path = '/' + path;
  location.hash = '#' + path;
}
