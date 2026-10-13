// Fault injection shared by the mock APIs: latency, one-shot failures, and
// "lost response" (the write succeeds but the caller sees an error).
type Fault = "fail" | "lose-response";

const pending = new Map<string, Fault>();
let latency = 350;

export const network = {
  get latency() {
    return latency;
  },
  setLatency(ms: number) {
    latency = Math.max(0, ms);
  },
  /** Make the next call to `operation` reject before it changes anything. */
  failNext(operation: string) {
    pending.set(operation, "fail");
  },
  /** Make the next call to `operation` apply its change, then reject. */
  loseNextResponse(operation: string) {
    pending.set(operation, "lose-response");
  },
  isArmed(operation: string) {
    return pending.has(operation);
  },
  reset() {
    pending.clear();
    latency = 350;
  },
};

export function delay(ms: number = latency): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockNetworkError extends Error {
  constructor(
    message: string,
    readonly operation: string,
    readonly applied: boolean,
  ) {
    super(message);
    this.name = "MockNetworkError";
  }
}

/**
 * Runs a mock server operation after the configured latency, applying any
 * armed fault for `operation`.
 */
export async function simulate<T>(
  operation: string,
  run: () => T | Promise<T>,
): Promise<T> {
  await delay();
  const fault = pending.get(operation);
  pending.delete(operation);
  if (fault === "fail")
    throw new MockNetworkError(
      "The request failed. Please try again.",
      operation,
      false,
    );
  const result = await run();
  if (fault === "lose-response")
    throw new MockNetworkError(
      "The request timed out. The server may have applied it.",
      operation,
      true,
    );
  return result;
}
