// Player progress lives in the browser (no sign-in). Every read and write tolerates
// private browsing and corrupt data: the game must still play.
import { anniversaryForDay } from "./schedule";
import type { DayResult, Progress } from "./types";

export const PROGRESS_KEY = "tt.progress.v1";
// Demo play lives under its own keys, so trying days early never uses up the live race.
export const storageKeys = (demo: boolean) =>
  demo ? { progress: "tt.demo.progress.v1", hints: "tt.demo.hints.v1" } : { progress: PROGRESS_KEY, hints: "tt.hints.v1" };
const EMPTY: Progress = { days: {} };

export function loadProgress(store: Pick<Storage, "getItem">, key = PROGRESS_KEY): Progress {
  try {
    const raw = store.getItem(key);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.days)) return EMPTY;
    const days = Object.fromEntries(Object.entries(parsed.days).filter(([, r]) => isDayResult(r))) as Progress["days"];
    const f = parsed.finale;
    const finaleOk = isRecord(f) && typeof f.guessSeconds === "number" && typeof f.answeredOn === "string";
    return finaleOk ? { days, finale: f as Progress["finale"] } : { days };
  } catch {
    return EMPTY;
  }
}

// Hint counts per day; anything that isn't a map of non-negative numbers is dropped.
export function parseHints(raw: string | null): Record<number, number> {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    if (!isRecord(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, n]) => typeof n === "number" && n >= 0)) as Record<number, number>;
  } catch {
    return {};
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isDayResult = (v: unknown): v is DayResult =>
  isRecord(v) && typeof v.correct === "boolean" && typeof v.hintsUsed === "number" && typeof v.answeredOn === "string";

export function saveProgress(store: Pick<Storage, "setItem">, p: Progress, key = PROGRESS_KEY): void {
  try {
    store.setItem(key, JSON.stringify(p));
  } catch {
    // ponytail: storage unavailable (private mode/quota); progress just isn't kept.
  }
}

// First answer wins: refreshing or double-tapping can't improve a score.
export function recordAnswer(p: Progress, day: number, r: DayResult): Progress {
  if (p.days[day]) return p;
  return { ...p, days: { ...p.days, [day]: r } };
}

export function streak(p: Progress, today: string): number {
  const onTime = Object.entries(p.days)
    .filter(([day, r]) => r.answeredOn === anniversaryForDay(Number(day)))
    .map(([day]) => Number(day));
  const todayDay = onTime.find((d) => anniversaryForDay(d) === today);
  if (todayDay === undefined) return 0;
  let n = 0;
  while (onTime.includes(todayDay - n)) n += 1;
  return n;
}

// The finale guess, like a day's call, can only be made once.
export function recordFinale(p: Progress, guessSeconds: number, answeredOn: string): Progress {
  return p.finale ? p : { ...p, finale: { guessSeconds, answeredOn } };
}
