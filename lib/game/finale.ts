// The finale: players guess Bly's exact time, as readers did in The World's 1889 contest.
import type { Progress } from "./types";

// Day 73 (Jan 25) and the ballot unlock together; Day 73's reveal prints her exact time.
export const FINALE_DAY = 73;
export const revealWaitsForBallot = (day: number, p: Progress): boolean => day === FINALE_DAY && !p.finale;

const UNITS: Record<string, number> = { day: 86400, hour: 3600, minute: 60, second: 1 };

// Reads the FIRST duration phrase only ("72 days, 6 hours and 10 minutes"): parts joined by
// commas, spaces or "and". A long column mentions many other durations; never add those in.
export function parseDuration(text: string): number {
  const parts = [...text.matchAll(/(\d+)\s*(day|hour|minute|second)s?\b/gi)];
  if (!parts.length) throw new Error(`no duration found in text: ${text.slice(0, 80)}`);
  let total = Number(parts[0][1]) * UNITS[parts[0][2].toLowerCase()];
  for (let i = 1; i < parts.length; i += 1) {
    const prev = parts[i - 1];
    const gap = text.slice((prev.index ?? 0) + prev[0].length, parts[i].index);
    if (!/^[\s,]*(and\s+)?$/i.test(gap)) break;
    total += Number(parts[i][1]) * UNITS[parts[i][2].toLowerCase()];
  }
  return total;
}

export function finaleResult(guessSeconds: number, actualSeconds: number): { offBySeconds: number; label: string } {
  const off = Math.abs(guessSeconds - actualSeconds);
  if (off === 0) return { offBySeconds: 0, label: "exactly right" };
  const d = Math.floor(off / 86400);
  const h = Math.floor((off % 86400) / 3600);
  const m = Math.floor((off % 3600) / 60);
  const s = off % 60;
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const pieces = [d && plural(d, "day"), h && plural(h, "hour"), m && plural(m, "minute")].filter(Boolean) as string[];
  return { offBySeconds: off, label: `off by ${pieces.length ? pieces.join(" ") : plural(s, "second")}` };
}
