// One night's summary line, written to every reader's activity log (spec 6.2.5). Counts only.
const n = (count: number, one: string, many: string) => `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

export function activityLine(s: { batches: number; pages: number; follows: number; candidates: number; capped: number; confirmed: number; notes: number; replay: boolean }): string {
  const line =
    `Checked ${n(s.batches, "new batch", "new batches")} (${n(s.pages, "page", "pages")}). ` +
    `Searched ${n(s.follows, "follow", "follows")}. ${n(s.candidates, "candidate", "candidates")}${s.capped ? ` (${s.capped.toLocaleString("en-US")} more set aside)` : ""}. ` +
    `Editor confirmed ${s.confirmed.toLocaleString("en-US")}. Sent ${n(s.notes, "note", "notes")}.`;
  return s.replay ? `Replay: ${line}` : line;
}
