import { describe, expect, test } from "vitest";
import { shareText } from "../../lib/game/share";

describe("shareText", () => {
  test("says the day and hints but never names a port", () => {
    const r = { correct: true, hintsUsed: 1, answeredOn: "2026-11-29" };
    const text = shareText(16, r, { days: { 16: r } });
    expect(text).toContain("Day 16");
    expect(text).toContain("1 hint");
    for (const port of ["Aden", "Colombo", "Bombay", "Zanzibar"]) expect(text).not.toContain(port);
  });
  test("pluralizes hints and shows days left", () => {
    const r = { correct: false, hintsUsed: 2, answeredOn: "2026-11-29" };
    const text = shareText(16, r, { days: { 16: r } });
    expect(text).toContain("2 hints");
    expect(text).toContain("75 days left");
  });
});
