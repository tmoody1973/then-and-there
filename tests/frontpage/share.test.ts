import { expect, test } from "vitest";
import { shareText } from "../../lib/frontpage/share";

test("the share card shows clues used, how close, and points, never the answer", () => {
  const text = shareText({ no: 3, revealed: 2, total: 6, points: 646, yearsOff: 10, regionRight: true });
  expect(text).toBe("Then & There · Front Page No. 3\n■■□□□□ 2 of 6 clues\nYear: 10 off · Region: ✓\n646 points");
  expect(shareText({ no: 1, revealed: 6, total: 6, points: 0, yearsOff: 0, regionRight: false })).toContain("Year: exact · Region: ✗");
});
