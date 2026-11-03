import { describe, expect, test } from "vitest";
import { activityLine } from "../../lib/agent/night";

const base = { batches: 2, pages: 7907, follows: 3, candidates: 1, capped: 0, confirmed: 1, notes: 1, replay: false };

describe("activityLine", () => {
  test('activityLine pluralizes, and prefixes "Replay: "', () => {
    expect(activityLine(base)).toBe(
      "Read 7,907 pages the Library of Congress just added, looking for the names and towns readers watch. 1 possible match; the Editor confirmed 1 against the scan. Sent 1 note.",
    );
  });

  test("says how many matches were past tonight's limit, and says so in words when no note went out", () => {
    expect(activityLine({ ...base, candidates: 5, capped: 970, notes: 0 })).toBe(
      "Read 7,907 pages the Library of Congress just added, looking for the names and towns readers watch. 5 possible matches (970 more past tonight's limit); the Editor confirmed 1 against the scan. No new notes.",
    );
  });

  test("a quiet night says so in words, not a row of zeros", () => {
    expect(activityLine({ ...base, batches: 0, pages: 0, candidates: 0, confirmed: 0, notes: 0 })).toBe(
      "No new pages from the Library of Congress last night. Nothing to search.",
    );
    expect(activityLine({ ...base, batches: 1, pages: 1706, follows: 1, candidates: 0, confirmed: 0, notes: 0, replay: true })).toBe(
      "Replay: Read 1,706 pages the Library of Congress just added. None mentioned a name or town readers watch.",
    );
  });
});
