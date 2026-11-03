// One night's summary line, written to every reader's activity log (spec 6.2.5). Counts only.
// Plain words for a newcomer: no "batches", "follows" or "candidates".
const n = (count: number, one: string, many: string) => `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
const READ = (pages: number) => `Read ${n(pages, "page", "pages")} the Library of Congress just added`;

export function activityLine(s: { batches: number; pages: number; follows: number; candidates: number; capped: number; confirmed: number; notes: number; replay: boolean; failed?: number }): string {
  // A quiet night reads as a sentence; a row of zeros reads as a failure. A failed download is not a quiet night.
  const blocked = s.replay
    ? "Couldn't download that batch from the Library of Congress. Nothing was searched."
    : "Couldn't download the new pages from the Library of Congress last night. Trying again tomorrow.";
  const quiet = !s.batches
    ? s.failed ? blocked : "No new pages from the Library of Congress last night. Nothing to search."
    : !s.candidates
      ? `${READ(s.pages)}. None mentioned a name or town readers watch.`
      : null;
  const line = quiet ??
    `${READ(s.pages)}, looking for the names and towns readers watch. ` +
    `${n(s.candidates, "possible match", "possible matches")}${s.capped ? ` (${s.capped.toLocaleString("en-US")} more past tonight's limit)` : ""}; ` +
    `the Editor confirmed ${s.confirmed.toLocaleString("en-US")} against the scan. ${s.notes ? `Sent ${n(s.notes, "note", "notes")}.` : "No new notes."}`;
  return s.replay ? `Replay: ${line}` : line;
}
