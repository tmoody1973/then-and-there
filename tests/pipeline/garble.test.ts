import { describe, expect, test } from "vitest";
import { nonDictionaryRate } from "../../lib/pipeline/garble";

describe("nonDictionaryRate", () => {
  test("clean English is zero", () => expect(nonDictionaryRate("the quick brown fox")).toBe(0));
  test("garbled tokens count", () => expect(nonDictionaryRate("1bshol 4joidin the")).toBeCloseTo(2 / 3, 3));
  test("inflections are accepted", () => expect(nonDictionaryRate("walked jumping cats")).toBe(0));
  test("empty text is zero", () => expect(nonDictionaryRate("")).toBe(0));
});
