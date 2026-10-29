"use client";

// A whole page shown as a scan carries the same calm note as a single item when anything on it
// was flagged as hard history (decision 006, extended to whole pages).
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { HARD_HISTORY_PAGE_NOTE } from "./ExploreCard";

export function PageNote({ pageId }: { pageId: string }) {
  const flagged = useQuery(api.clippings.pageFlagged, { pageId });
  return flagged ? <p className="content-note">{HARD_HISTORY_PAGE_NOTE}</p> : null;
}
