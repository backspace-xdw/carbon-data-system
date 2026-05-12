// 极简发布订阅状态容器(替代 Vuex/Redux)

export function createStore(initial = {}) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get state() { return state; },
    set(patch) {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      for (const fn of subs) fn(state);
    },
    subscribe(fn) {
      subs.add(fn);
      fn(state);
      return () => subs.delete(fn);
    }
  };
}

// 全局 store
export const store = createStore({
  profile: null,
  wsReady: false,
  toasts: []
});
