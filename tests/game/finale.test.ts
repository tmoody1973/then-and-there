import { describe, expect, test } from "vitest";
import { finaleResult, parseDuration } from "../../lib/game/finale";

describe("finale", () => {
  test("parses a printed duration", () => {
    expect(parseDuration("72 days, 6 hours, 11 minutes, 14 seconds")).toBe(72 * 86400 + 6 * 3600 + 11 * 60 + 14);
  });
  test("parses parts in any order and singular units", () => {
    expect(parseDuration("in 1 hour and 72 days")).toBe(72 * 86400 + 3600);
  });
  test("reads only the first duration phrase in a long column", () => {
    const text = "Miss Bly completed her trip. The exact time of the journey was 72 days, 6 hours and 10 minutes. Elsewhere: the jury was out 3 days; a voyage of 25 days; 40 hours of debate.";
    expect(parseDuration(text)).toBe(72 * 86400 + 6 * 3600 + 10 * 60);
  });

  test("throws when no duration is printed", () => {
    expect(() => parseDuration("nonsense")).toThrow(/duration/);
  });
  test("result labels", () => {
    expect(finaleResult(100, 100).offBySeconds).toBe(0);
    expect(finaleResult(0, 11520).label).toBe("off by 3 hours 12 minutes");
    expect(finaleResult(100, 100).label).toBe("exactly right");
  });
});
