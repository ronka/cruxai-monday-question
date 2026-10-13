// Tiny typed event emitter used by the mock APIs for live updates.
export function createEmitter<T>() {
  const listeners = new Set<(event: T) => void>();
  return {
    emit(event: T) {
      listeners.forEach((listener) => listener(event));
    },
    subscribe(listener: (event: T) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Stable random ID (crypto.randomUUID is available in browsers and Node 19+). */
export function newId(prefix = ""): string {
  return prefix + crypto.randomUUID().slice(0, 8);
}
