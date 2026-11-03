"use client";

// A whole page shown as a scan carries the same calm note as a single item when anything on it
// was flagged as hard history (decision 006, extended to whole pages).
import { api } from "../convex/_generated/api";
import { useSafeQuery } from "../lib/useSafeQuery";
import { HARD_HISTORY_PAGE_NOTE } from "./ExploreCard";

export function PageNote({ pageId, label }: { pageId: string; label?: string }) {
  // If the database can't answer, show the note anyway: a note is never hidden for want of a lookup.
  const { data: flagged, failed } = useSafeQuery(api.clippings.pageFlagged, { pageId });
  if (!flagged && !failed) return null;
  // A label names which page the note is about when several pages share one note area.
  return <p className="content-note">{label ? <><span className="content-note-label">{label}:</span> </> : null}{HARD_HISTORY_PAGE_NOTE}</p>;
}
