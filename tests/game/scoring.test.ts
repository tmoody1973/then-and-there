import { describe, expect, test } from "vitest";
import { beatNellie, daysLeft, isCorrect } from "../../lib/game/scoring";

const r = (correct: boolean, hintsUsed: number) => ({ correct, hintsUsed, answeredOn: "2026-11-14" });

describe("scoring", () => {
  test("choice questions", () => {
    expect(isCorrect({ kind: "choice", prompt: "", options: ["a", "b"], answerIndex: 1 }, 1)).toBe(true);
    expect(isCorrect({ kind: "choice", prompt: "", options: ["a", "b"], answerIndex: 1 }, 0)).toBe(false);
  });
  test("day-count questions allow a tolerance", () => {
    const q = { kind: "days" as const, prompt: "", answerDays: 6, tolerance: 1 };
    expect(isCorrect(q, 7)).toBe(true);
    expect(isCorrect(q, 8)).toBe(false);
  });
  test("budget starts at 80 and spends 3 per miss, 1 per hint", () => {
    expect(daysLeft({ days: {} })).toBe(80);
    expect(daysLeft({ days: { 1: r(false, 2) } })).toBe(75);
    expect(daysLeft({ days: { 1: r(true, 1), 2: r(false, 0) } })).toBe(76);
  });
  test("beat Nellie means more than 8 days left", () => {
    const left = (n: number) => ({ days: Object.fromEntries(Array.from({ length: 80 - n }, (_, i) => [i + 1, r(true, 1)])) });
    expect(beatNellie(left(9))).toBe(true);
    expect(beatNellie(left(8))).toBe(false);
  });
});
