// A case's progress lives in the browser, like the race's: where you are on the trail, each
// stop's call, and which stops you asked the City Editor about. Answers can't be changed.
import { loadProgress } from "../game/progress";
import { daysLeft } from "../game/scoring";
import type { DayResult } from "../game/types";

export type CaseState = { at: number; results: Record<number, DayResult>; asked: Record<number, true> };

export const CASE_KEY = "tt.case01.v1";
export const FRESH: CaseState = { at: 0, results: {}, asked: {} };

export const left = (s: CaseState) => daysLeft({ days: s.results });

export function askEditor(s: CaseState, n: number): CaseState {
  return s.results[n] || s.asked[n] ? s : { ...s, asked: { ...s.asked, [n]: true } };
}

export function answer(s: CaseState, n: number, correct: boolean, today: string): CaseState {
  if (s.results[n]) return s;
  return { ...s, results: { ...s.results, [n]: { correct, hintsUsed: s.asked[n] ? 1 : 0, answeredOn: today } } };
}

// `at` counts built stops; answers are keyed by route number `n` (stops can be missing from the
// case), so the check takes the current stop's n. total = built stops; the last is the finish.
export const advance = (s: CaseState, total: number, n: number): CaseState => (s.results[n] && s.at < total - 1 ? { ...s, at: s.at + 1 } : s);

export function parseCase(raw: string | null): CaseState {
  try {
    const p: unknown = JSON.parse(raw ?? "");
    if (typeof p !== "object" || p === null) return FRESH;
    const { at, results, asked } = p as Record<string, unknown>;
    if (!Number.isInteger(at) || (at as number) < 0) return FRESH;
    // The race's loader already drops malformed results; reuse it.
    const days = loadProgress({ getItem: () => JSON.stringify({ days: results }) }).days;
    const ok = typeof asked === "object" && asked !== null ? Object.fromEntries(Object.keys(asked).map((k) => [Number(k), true as const])) : {};
    return { at: at as number, results: days, asked: ok };
  } catch {
    return FRESH;
  }
}
