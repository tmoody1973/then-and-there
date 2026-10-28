// The Morgue (decision 008): the newsroom's clippings library. For a game day, the earlier
// clippings that bear on the call — printed on or before that day, so no hindsight.
import type { MeanwhileCandidate } from "./pickMeanwhile";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function pickMorgue(
  clips: MeanwhileCandidate[],
  opts: { date1889: string; terms: string[]; excludeIds: string[]; max?: number },
): MeanwhileCandidate[] {
  const max = opts.max ?? 3;
  const patterns = opts.terms.map((t) => new RegExp(`\\b${escape(t)}\\b`, "i"));
  const scored = clips
    .filter((c) => c.date <= opts.date1889 && c.status === "classified" && c.hardHistory !== true && !opts.excludeIds.includes(c.clippingId))
    .map((c) => ({ c, hits: patterns.filter((p) => p.test(c.text)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || b.c.date.localeCompare(a.c.date));
  const pages = new Set<string>();
  const out: MeanwhileCandidate[] = [];
  for (const { c } of scored) {
    if (pages.has(c.pageId)) continue;
    pages.add(c.pageId);
    out.push(c);
    if (out.length === max) break;
  }
  return out;
}
