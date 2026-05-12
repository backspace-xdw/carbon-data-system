// 极薄 IndexedDB 封装 — 用于离线缓存最近一次驾驶舱与列表数据

const DB_NAME = 'iecsp-cache';
const VER = 1;
const STORES = ['kv', 'series'];

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

export const idb = {
  async set(key, value) { return tx('kv', 'readwrite', s => s.put(value, key)); },
  async get(key)        { return tx('kv', 'readonly', s => s.get(key)).then(v => v ?? null).catch(() => null); },
  async del(key)        { return tx('kv', 'readwrite', s => s.delete(key)); }
};
