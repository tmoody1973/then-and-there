import { describe, expect, test } from "vitest";
import { loadProgress, PROGRESS_KEY, recordAnswer, saveProgress, streak } from "../../lib/game/progress";
import { anniversaryForDay } from "../../lib/game/schedule";

const r = (day: number, onTime = true) => ({ correct: true, hintsUsed: 0, answeredOn: onTime ? anniversaryForDay(day) : "2027-03-01" });

describe("progress", () => {
  test("recordAnswer returns a new object and leaves the input alone", () => {
    const p = { days: {} };
    const next = recordAnswer(p, 3, r(3));
    expect(next).not.toBe(p);
    expect(p.days).toEqual({});
    expect(next.days[3]).toEqual(r(3));
  });
  test("a day can only be answered once", () => {
    const first = recordAnswer({ days: {} }, 3, { correct: false, hintsUsed: 0, answeredOn: "2026-11-16" });
    const again = recordAnswer(first, 3, { correct: true, hintsUsed: 0, answeredOn: "2026-11-16" });
    expect(again.days[3].correct).toBe(false);
  });
  test("loadProgress survives a throwing store", () => {
    expect(loadProgress({ getItem: () => { throw new Error("SecurityError"); } })).toEqual({ days: {} });
  });
  test("loadProgress survives corrupt JSON", () => {
    expect(loadProgress({ getItem: () => "{not json" })).toEqual({ days: {} });
  });
  test("loadProgress round-trips through saveProgress", () => {
    const store = new Map<string, string>();
    const p = recordAnswer({ days: {} }, 1, r(1));
    saveProgress({ setItem: (k, v) => void store.set(k, v) }, p);
    expect(loadProgress({ getItem: (k) => store.get(k) ?? null })).toEqual(p);
    expect(store.has(PROGRESS_KEY)).toBe(true);
  });
  test("saveProgress swallows storage errors", () => {
    expect(() => saveProgress({ setItem: () => { throw new Error("QuotaExceeded"); } }, { days: {} })).not.toThrow();
  });
  test("streak counts consecutive on-time days ending today", () => {
    const p = { days: { 1: r(1), 2: r(2), 3: r(3) } };
    expect(streak(p, anniversaryForDay(3))).toBe(3);
    expect(streak({ days: { 1: r(1), 2: r(2, false), 3: r(3) } }, anniversaryForDay(3))).toBe(1);
  });
});
