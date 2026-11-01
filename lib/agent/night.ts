// One night's summary line, written to every reader's activity log (spec 6.2.5). Counts only.
const n = (count: number, one: string, many: string) => `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

export function activityLine(s: { batches: number; pages: number; follows: number; candidates: number; capped: number; confirmed: number; notes: number; replay: boolean }): string {
  // A quiet night reads as a sentence; a row of zeros reads as a failure.
  const quiet = !s.batches
    ? "No new pages from the Library of Congress last night. Nothing to search."
    : !s.candidates
      ? `Read ${n(s.batches, "new batch", "new batches")} (${n(s.pages, "page", "pages")}). Nothing matched what you follow.`
      : null;
  const line = quiet ??
    `Checked ${n(s.batches, "new batch", "new batches")} (${n(s.pages, "page", "pages")}). ` +
    `Searched ${n(s.follows, "follow", "follows")}. ${n(s.candidates, "candidate", "candidates")}${s.capped ? ` (${s.capped.toLocaleString("en-US")} more set aside)` : ""}. ` +
    `Editor confirmed ${s.confirmed.toLocaleString("en-US")}. Sent ${n(s.notes, "note", "notes")}.`;
  return s.replay ? `Replay: ${line}` : line;
}
