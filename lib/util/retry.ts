// Retries a call with linear backoff (1 s, 2 s, ...). Throws the last error after the final try.
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { tries?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const tries = opts.tries ?? 3;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last: unknown;
  for (let i = 1; i <= tries; i += 1) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < tries) await sleep(1000 * i);
    }
  }
  throw last;
}
