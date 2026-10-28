import { describe, expect, test } from "vitest";
import { classifyClipping } from "../../lib/pipeline/classify";

const VALID = { type: "business", people: ["J. E. Ellmore"], places: ["Appleton"], humanStoryScore: 0.8, hardHistory: false };

function deps(...replies: string[]) {
  let calls = 0;
  const efforts: (string | undefined)[] = [];
  return {
    calls: () => calls,
    efforts,
    d: {
      complete: async (req: { effort?: string }) => {
        efforts.push(req.effort);
        return replies[Math.min(calls++, replies.length - 1)];
      },
    },
  };
}

describe("classifyClipping", () => {
  test("parses valid JSON", async () => {
    const out = await classifyClipping({ clippingId: "c1", text: "Mr. Ellmore has a beautiful shaving parlor" }, deps(JSON.stringify(VALID)).d);
    expect(out).toEqual({ ok: true, value: VALID });
  });

  test("asks for minimal reasoning", async () => {
    const { d, efforts } = deps(JSON.stringify(VALID));
    await classifyClipping({ clippingId: "c1", text: "x" }, d);
    expect(efforts).toEqual(["minimal"]);
  });

  test("accepts JSON wrapped in prose", async () => {
    const out = await classifyClipping({ clippingId: "c1", text: "x" }, deps(`Here: ${JSON.stringify(VALID)}`).d);
    expect(out.ok).toBe(true);
  });

  test("retries once on malformed JSON, then fails", async () => {
    const { d, calls } = deps("not json", "not json");
    const out = await classifyClipping({ clippingId: "c1", text: "x" }, d);
    expect(out.ok).toBe(false);
    expect(calls()).toBe(2);
  });

  test("recovers when the retry is valid", async () => {
    const out = await classifyClipping({ clippingId: "c1", text: "x" }, deps("oops", JSON.stringify(VALID)).d);
    expect(out.ok).toBe(true);
  });

  test("rejects an out-of-range score", async () => {
    const out = await classifyClipping({ clippingId: "c1", text: "x" }, deps(JSON.stringify({ ...VALID, humanStoryScore: 1.4 })).d);
    expect(out.ok).toBe(false);
  });
});
