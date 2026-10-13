// A controllable mock clock. Time only moves when the mock controls advance it,
// so time-based behavior is deterministic. The current mock time is saved in
// localStorage, so reopening the app continues from the last mock time.
type Listener = (now: number) => void;

const STORAGE_KEY = "mock-clock";
export const DEFAULT_START = Date.parse("2026-10-13T09:00:00Z");
const listeners = new Set<Listener>();
let current: number | null = null;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function load(): number {
  if (current !== null) return current;
  const saved = Number(storage()?.getItem(STORAGE_KEY));
  current = Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_START;
  return current;
}

function save(value: number) {
  current = value;
  storage()?.setItem(STORAGE_KEY, String(value));
  listeners.forEach((listener) => listener(value));
}

export const clock = {
  now(): number {
    return load();
  },
  date(): Date {
    return new Date(load());
  },
  set(value: Date | number) {
    save(typeof value === "number" ? value : value.getTime());
  },
  advance(ms: number) {
    save(load() + ms);
  },
  reset(start: number = DEFAULT_START) {
    save(start);
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
