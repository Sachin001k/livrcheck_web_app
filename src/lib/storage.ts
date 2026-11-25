/** localStorage that never throws (private windows, blocked storage). */
export const storage = {
  get(key: string): string | null {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
  },
  remove(key: string) {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  },
  getJson<T>(key: string): T | null {
    const raw = storage.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  },
  setJson(key: string, value: unknown) {
    storage.set(key, JSON.stringify(value));
  },
};
