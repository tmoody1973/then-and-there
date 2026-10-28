// Player progress lives in the browser (no sign-in). Every read and write tolerates
// private browsing and corrupt data: the game must still play.
import { anniversaryForDay } from "./schedule";
import type { DayResult, Progress } from "./types";

export const PROGRESS_KEY = "tt.progress.v1";
const EMPTY: Progress = { days: {} };

export function loadProgress(store: Pick<Storage, "getItem">): Progress {
  try {
    const raw = store.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Progress;
    return parsed && typeof parsed.days === "object" ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveProgress(store: Pick<Storage, "setItem">, p: Progress): void {
  try {
    store.setItem(PROGRESS_KEY, JSON.stringify(p));
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
