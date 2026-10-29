import { describe, expect, test } from "vitest";
import { activityLine } from "../../lib/agent/night";

const base = { batches: 2, pages: 7907, follows: 3, candidates: 1, capped: 0, confirmed: 1, notes: 1, replay: false };

describe("activityLine", () => {
  test('activityLine pluralizes, and prefixes "Replay: "', () => {
    expect(activityLine(base)).toBe("Checked 2 new batches (7,907 pages). Searched 3 follows. 1 candidate. Editor confirmed 1. Sent 1 note.");
    expect(activityLine({ ...base, batches: 1, pages: 1706, follows: 1, candidates: 0, confirmed: 0, notes: 0, replay: true })).toBe(
      "Replay: Checked 1 new batch (1,706 pages). Searched 1 follow. 0 candidates. Editor confirmed 0. Sent 0 notes.",
    );
  });
});
