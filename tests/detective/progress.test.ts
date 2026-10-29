import { describe, expect, test } from "vitest";
import { advance, answer, askEditor, FRESH, left, parseCase } from "../../lib/detective/progress";

const DAY = "2026-10-29";

describe("case progress", () => {
  test("a fresh case starts at the first stop with 80 days", () => {
    expect(FRESH.at).toBe(0);
    expect(left(FRESH)).toBe(80);
  });

  test("a wrong call costs 3 days; a hint asked first costs 1 more", () => {
    const s = answer(askEditor(FRESH, 0), 0, false, DAY);
    expect(s.results[0]).toEqual({ correct: false, hintsUsed: 1, answeredOn: DAY });
    expect(left(s)).toBe(76);
  });

  test("an answer can't be changed once filed", () => {
    const s = answer(FRESH, 0, true, DAY);
    expect(answer(s, 0, false, DAY)).toBe(s);
    expect(askEditor(s, 0)).toBe(s);
  });

  test("you move on only after answering, and never past the last stop", () => {
    expect(advance(FRESH, 3, 0)).toBe(FRESH);
    const s = advance(answer(FRESH, 0, true, DAY), 3, 0);
    expect(s.at).toBe(1);
    const end = { ...FRESH, at: 2 };
    expect(advance(answer(end, 2, true, DAY), 3, 2).at).toBe(2);
  });

  test("bad saved data starts the case fresh", () => {
    expect(parseCase("not json")).toEqual(FRESH);
    expect(parseCase(JSON.stringify({ at: "x" }))).toEqual(FRESH);
    expect(parseCase(null)).toEqual(FRESH);
    const saved = answer(FRESH, 0, true, DAY);
    expect(parseCase(JSON.stringify(saved))).toEqual(saved);
  });
});

test("the real Case 01 can be walked from New York to the last leg, gaps and all", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stops = (require("../../data/detective/case01.json") as { stops: Array<{ n: number }> }).stops;
  let s = FRESH;
  for (let k = 0; k < stops.length - 1; k += 1) {
    const n = stops[s.at].n;
    s = advance(answer(s, n, true, DAY), stops.length, n);
  }
  expect(s.at).toBe(stops.length - 1);
});
