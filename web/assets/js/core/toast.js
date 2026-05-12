// 轻量通知

export function toast(message, type = 'info', ttl = 3200) {
  const host = document.getElementById('toasts') || document.body;
  const el = document.createElement('div');
  el.className = 'iecsp-toast is-' + type;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .2s, transform .2s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 200);
  }, ttl);
}
