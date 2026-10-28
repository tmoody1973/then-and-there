import { describe, expect, test } from "vitest";
import { anniversaryForDay, date1889ForDay, dayNumberFor1889, isUnlocked, liveDayOn } from "../../lib/game/schedule";

describe("schedule", () => {
  test("1889 dates map to day numbers", () => {
    expect(dayNumberFor1889("1889-11-14")).toBe(1);
    expect(dayNumberFor1889("1889-11-29")).toBe(16);
    expect(date1889ForDay(73)).toBe("1890-01-25");
  });
  test("anniversaries are 137 years later", () => {
    expect(anniversaryForDay(1)).toBe("2026-11-14");
    expect(anniversaryForDay(16)).toBe("2026-11-29");
  });
  test("live day counts from the launch", () => {
    expect(liveDayOn("2026-11-13")).toBe(0);
    expect(liveDayOn("2026-11-14")).toBe(1);
    expect(liveDayOn("2027-01-25")).toBe(73);
  });
  test("days unlock on their anniversary or in demo mode", () => {
    expect(isUnlocked(16, "2026-10-30", false)).toBe(false);
    expect(isUnlocked(16, "2026-10-30", true)).toBe(true);
    expect(isUnlocked(16, "2026-11-29", false)).toBe(true);
  });
});
