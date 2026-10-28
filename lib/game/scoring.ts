// Scoring (Claude's call; spec 4.4 leaves numbers to the builder): Phileas Fogg's 80 days,
// minus 3 per wrong call and 1 per hint. More than 8 left (80 - 72) beats Nellie Bly.
import type { Progress, Question } from "./types";

export const START_DAYS = 80;
export const WRONG_COST = 3;
export const HINT_COST = 1;
export const BEAT_NELLIE_ABOVE = 8;

export function isCorrect(q: Question, answer: number): boolean {
  return q.kind === "choice" ? answer === q.answerIndex : Math.abs(answer - q.answerDays) <= q.tolerance;
}

export function daysLeft(p: Progress): number {
  return Object.values(p.days).reduce(
    (left, r) => left - r.hintsUsed * HINT_COST - (r.correct ? 0 : WRONG_COST),
    START_DAYS,
  );
}

export const beatNellie = (p: Progress) => daysLeft(p) > BEAT_NELLIE_ABOVE;
