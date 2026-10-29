import { describe, expect, test } from "vitest";
import { withRetry } from "../../lib/util/retry";

describe("withRetry", () => {
  test("retries a failing call and returns the first success", async () => {
    let n = 0;
    const sleeps: number[] = [];
    const out = await withRetry(async () => { if (++n < 3) throw new Error("timed out"); return "ok"; }, { tries: 3, sleep: async (ms) => void sleeps.push(ms) });
    expect(out).toBe("ok");
    expect(sleeps).toEqual([1000, 2000]);
  });
  test("throws the last error after the final try", async () => {
    await expect(withRetry(async () => { throw new Error("still down"); }, { tries: 2, sleep: async () => {} })).rejects.toThrow("still down");
  });
});
