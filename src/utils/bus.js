/**
 * Tiny typed-ish event bus. One instance shared by vision, HUD, voice, tools.
 */
export function createBus() {
  const map = new Map();
  return {
    on(ev, fn) {
      let set = map.get(ev);
      if (!set) {
        set = new Set();
        map.set(ev, set);
      }
      set.add(fn);
      return () => set.delete(fn);
    },
    emit(ev, payload) {
      const set = map.get(ev);
      if (!set) return;
      for (const fn of set) fn(payload);
    },
  };
}

export const bus = createBus();
