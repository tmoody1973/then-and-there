// "Meanwhile, back home": for a game date, the strongest human story printed in each Midwest
// state that day (or up to 3 days earlier), plus a Midwest-wide pick. Deterministic: no model calls.
import type { Clip } from "./draftDay";

export const MIDWEST_STATES = [
  "illinois", "indiana", "iowa", "kansas", "michigan", "minnesota",
  "missouri", "nebraska", "north dakota", "ohio", "south dakota", "wisconsin",
];
const STORY_TYPES = new Set(["person", "business", "event"]);
const MAX_DAYS_BACK = 3;
const DAY_MS = 86_400_000;

export type MeanwhileCandidate = Clip & {
  state: string;
  type?: string;
  humanStoryScore?: number;
  hardHistory?: boolean;
  status: string;
};

const minusDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10);

function best(cands: MeanwhileCandidate[], date1889: string): MeanwhileCandidate | undefined {
  for (let back = 0; back <= MAX_DAYS_BACK; back += 1) {
    const day = minusDays(date1889, back);
    const onDay = cands.filter((c) => c.date === day);
    if (onDay.length) return onDay.reduce((a, b) => ((b.humanStoryScore ?? 0) > (a.humanStoryScore ?? 0) ? b : a));
  }
  return undefined;
}

export function pickMeanwhile(cands: MeanwhileCandidate[], date1889: string) {
  const eligible = cands.filter(
    (c) => c.status === "classified" && c.hardHistory !== true && STORY_TYPES.has(c.type ?? "") && MIDWEST_STATES.includes(c.state),
  );
  const toRow = (scope: string, c: MeanwhileCandidate) => ({
    scope,
    clip: { clippingId: c.clippingId, pageId: c.pageId, iiifBase: c.iiifBase, box: c.box, paper: c.paper, date: c.date, citationMla: c.citationMla, excerpt: c.text.slice(0, 300) },
    humanStoryScore: c.humanStoryScore ?? 0,
  });
  const rows = MIDWEST_STATES.flatMap((state) => {
    const pick = best(eligible.filter((c) => c.state === state), date1889);
    return pick ? [toRow(state, pick)] : [];
  });
  const midwest = best(eligible, date1889);
  return midwest ? [...rows, toRow("midwest", midwest)] : rows;
}
