// Spoiler-free share text: built only from the day number, correctness, hints and days left.
import { daysLeft } from "./scoring";
import type { DayResult, Progress } from "./types";

export function shareText(day: number, r: DayResult, p: Progress): string {
  const hints = `${r.hintsUsed} hint${r.hintsUsed === 1 ? "" : "s"}`;
  const call = r.correct ? "made the call" : "missed the call";
  return `Then & There · Racing Nellie Bly · Day ${day} · ${call} · ${hints} · ${daysLeft(p)} days left 🚢`;
}
