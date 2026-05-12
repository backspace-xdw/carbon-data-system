// WebSocket 实时通道 — 自动重连,广播自定义事件

let socket = null;
let retryTimer = null;
let retryDelay = 1500;

export function connect() {
  const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  try { socket = new WebSocket(url); } catch { schedule(); return; }
  socket.addEventListener('open', () => {
    retryDelay = 1500;
    window.dispatchEvent(new CustomEvent('iecsp:ws', { detail: { ready: true } }));
  });
  socket.addEventListener('close', () => {
    window.dispatchEvent(new CustomEvent('iecsp:ws', { detail: { ready: false } }));
    schedule();
  });
  socket.addEventListener('error', () => {
    try { socket.close(); } catch {}
  });
  socket.addEventListener('message', (ev) => {
    try {
      const m = JSON.parse(ev.data);
      window.dispatchEvent(new CustomEvent('iecsp:ws:' + m.type, { detail: m.payload }));
    } catch (e) { /* ignore non-json */ }
  });
}

function schedule() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    retryDelay = Math.min(retryDelay * 1.5, 15000);
    connect();
  }, retryDelay);
}

export function disconnect() {
  if (socket) { try { socket.close(); } catch {} socket = null; }
}
