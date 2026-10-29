import { describe, expect, test } from "vitest";
import { frontPageNo, regionOf, scoreGuess, cluePool, REGIONS } from "../../lib/frontpage/rules";

describe("front page rules", () => {
  test("states sort into the four Census regions, case-insensitively", () => {
    expect(regionOf("new york")).toBe("Northeast");
    expect(regionOf("Wisconsin")).toBe("Midwest");
    expect(regionOf("texas")).toBe("South");
    expect(regionOf("district of columbia")).toBe("South");
    expect(regionOf("new mexico")).toBe("West");
    expect(regionOf("atlantis")).toBeNull();
    expect(REGIONS).toEqual(["Northeast", "South", "Midwest", "West"]);
  });

  test("the clue pool starts at 1,000 with one clue showing and drops 150 per extra clue", () => {
    expect(cluePool(1)).toBe(1000);
    expect(cluePool(2)).toBe(850);
    expect(cluePool(6)).toBe(250);
  });

  test("a guess scores 60% on the year (zero at 25 years off) and 40% on the region", () => {
    const answer = { year: 1902, region: "Midwest" as const };
    expect(scoreGuess({ revealed: 1, year: 1902, region: "Midwest" }, answer)).toEqual({ points: 1000, yearsOff: 0, regionRight: true });
    expect(scoreGuess({ revealed: 1, year: 1912, region: "Midwest" }, answer).points).toBe(760);
    expect(scoreGuess({ revealed: 3, year: 1950, region: "South" }, answer)).toEqual({ points: 0, yearsOff: 48, regionRight: false });
    expect(scoreGuess({ revealed: 2, year: 1902, region: "West" }, answer).points).toBe(510);
  });

  test("today's page number counts Central-time days from launch, cycling through the pool", () => {
    const launch = "2026-10-29";
    // 04:59 UTC Oct 30 is still Oct 29 in Chicago.
    expect(frontPageNo(new Date("2026-10-30T04:59:00Z"), launch, 10)).toBe(1);
    expect(frontPageNo(new Date("2026-10-30T05:01:00Z"), launch, 10)).toBe(2);
    expect(frontPageNo(new Date("2026-11-08T12:00:00Z"), launch, 10)).toBe(1);
    expect(frontPageNo(new Date("2026-10-01T12:00:00Z"), launch, 10)).toBe(1);
  });
});
