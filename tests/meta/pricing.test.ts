import { describe, expect, test } from "vitest";
import { costOf } from "../../lib/meta/pricing";

// Prices from https://dev.meta.ai/docs/pricing-rate-limits (fetched 2026-10-28).
describe("costOf", () => {
  test("standard Muse Spark: input + reasoning-heavy output", () => {
    const usd = costOf("muse-spark-1.3", { input: 1_000_000, cachedInput: 0, output: 1_000_000 });
    expect(usd).toBeCloseTo(1.25 + 4.25, 6);
  });
  test("contributor tier is far cheaper", () => {
    expect(costOf("muse-spark-1.3-contributor", { input: 1_000_000, cachedInput: 0, output: 1_000_000 })).toBeCloseTo(0.3, 6);
  });
  test("cached input is billed at the cached rate", () => {
    expect(costOf("muse-spark-1.3", { input: 1_000_000, cachedInput: 1_000_000, output: 0 })).toBeCloseTo(0.15, 6);
  });
  test("SAM is per image", () => {
    expect(costOf("sam-3.1", { images: 1000 })).toBeCloseTo(2.5, 6);
  });
  test("unknown model throws rather than reporting $0", () => {
    expect(() => costOf("mystery-model", { input: 1 })).toThrow(/price/);
  });
});
