import { describe, expect, test } from "vitest";
import { gameClockDate } from "../../lib/agent/clock";
import { date1889ForDay } from "../../lib/game/schedule";

describe("gameClockDate", () => {
  test("gameClockDate before launch cycles through published demo days; after launch it is tomorrow's dispatch", () => {
    const days = [71, 16, 30, 73];
    const before = ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"].map((d) => gameClockDate(d, days));
    expect(new Set(before.slice(0, 4))).toEqual(new Set([16, 30, 71, 73].map(date1889ForDay)));
    expect(before[4]).toBe(before[0]);
    expect(gameClockDate("2026-11-14", days)).toBe(date1889ForDay(2));
    expect(gameClockDate("2026-12-01", days)).toBe(date1889ForDay(19));
  });

  test("after the race ends the clock stays on the last day", () => {
    expect(gameClockDate("2027-06-01", [16])).toBe(date1889ForDay(73));
  });

  test("with no published days before launch it uses launch eve's date", () => {
    expect(gameClockDate("2026-10-29", [])).toBe(date1889ForDay(1));
  });
});
