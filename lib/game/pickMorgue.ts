// The Morgue (decision 008): the newsroom's clippings library. For a game day, the earlier
// clippings that bear on the call — printed on or before that day, so no hindsight.
import type { MeanwhileCandidate } from "./pickMeanwhile";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function pickMorgue(
  clips: MeanwhileCandidate[],
  opts: { date1889: string; terms: string[]; excludeIds: string[]; cluePapers?: Array<{ paper: string; date: string }>; max?: number },
): MeanwhileCandidate[] {
  const max = opts.max ?? 3;
  const patterns = opts.terms.map((t) => new RegExp(`\\b${escape(t)}\\b`, "i"));
  const scored = clips
    .filter((c) => c.date <= opts.date1889 && c.status === "classified" && c.hardHistory !== true && !opts.excludeIds.includes(c.clippingId))
    .map((c) => ({ c, hits: patterns.filter((p) => p.test(c.text)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || b.c.date.localeCompare(a.c.date));
  // Editions repeat stories: one item per page and per paper-and-date, never the clue's own paper that day.
  const seen = new Set<string>((opts.cluePapers ?? []).map((p) => `${p.paper}|${p.date}`));
  const out: MeanwhileCandidate[] = [];
  for (const { c } of scored) {
    const key = `${c.paper}|${c.date}`;
    if (seen.has(key) || seen.has(c.pageId)) continue;
    seen.add(key);
    seen.add(c.pageId);
    out.push(c);
    if (out.length === max) break;
  }
  return out;
}
