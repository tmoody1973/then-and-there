// The agent's game clock (spec 15.3): before launch it walks the built demo days so the nightly
// job has real work; from Nov 14, 2026 it prepares tomorrow's dispatch.
import { date1889ForDay, liveDayOn } from "../game/schedule";

const LAST_DAY = 73; // Jan 25, 1890: Bly's arrival and the finale
const DAY_MS = 86_400_000;

export function gameClockDate(today: string, publishedDays: number[]): string {
  const live = liveDayOn(today);
  if (live > 0) return date1889ForDay(Math.min(live + 1, LAST_DAY));
  if (!publishedDays.length) return date1889ForDay(1);
  const days = [...publishedDays].sort((a, b) => a - b);
  const n = Math.floor(Date.parse(`${today}T00:00:00Z`) / DAY_MS);
  return date1889ForDay(days[n % days.length]);
}
