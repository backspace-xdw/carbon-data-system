// API 客户端 — 原生 fetch 封装,统一错误处理,自动注入 Bearer Token
// 约定:接口返回 { ok: boolean, data?: T, message?: string, error?: string }

const TOKEN_KEY = 'iecsp.token';

export const apiBase = '/api/v1';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function clearToken() { setToken(null); }

export async function api(path, opts = {}) {
  const url = apiBase + path;
  const method = (opts.method || 'GET').toUpperCase();
  const headers = {
    'Accept': 'application/json',
    ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers || {})
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
      signal: opts.signal
    });
  } catch (e) {
    throw new ApiError('network_error', '网络异常,请稍后再试', 0);
  }
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }

  if (res.status === 401) {
    clearToken();
    if (location.pathname !== '/login.html') location.replace('/login.html');
    throw new ApiError('unauthorized', '会话已过期', 401);
  }

  if (!res.ok || json.ok === false) {
    throw new ApiError(json.error || 'error', json.message || `HTTP ${res.status}`, res.status);
  }
  return json;
}

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// 便捷 fetch 模板字符串
export function qs(params = {}) {
  const e = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!e.length) return '';
  return '?' + new URLSearchParams(e.map(([k, v]) => [k, String(v)])).toString();
}
