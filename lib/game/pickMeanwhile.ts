// "Meanwhile, back home": for a game date, the strongest human story printed in each Midwest
// state that day (or up to 3 days earlier), plus a Midwest-wide pick. Deterministic: no model calls.
import type { Clip } from "./draftDay";
import { tidy } from "./text";

export const MIDWEST_STATES = [
  "illinois", "indiana", "iowa", "kansas", "michigan", "minnesota",
  "missouri", "nebraska", "north dakota", "ohio", "south dakota", "wisconsin",
];
const STORY_TYPES = new Set(["person", "business", "event"]);
const MAX_DAYS_BACK = 3;
const DAY_MS = 86_400_000;

export type MeanwhileCandidate = Clip & {
  state: string;
  city?: string;
  type?: string;
  humanStoryScore?: number;
  hardHistory?: boolean;
  status: string;
};

const minusDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10);

const PER_SCOPE = 3; // so a reader who has seen the top story gets the next one
const ANCHOR_CITIES = ["milwaukee", "chicago", "detroit"];

// The strongest stories from the closest date that has any (that day, or up to 3 days earlier).
function top(cands: MeanwhileCandidate[], date1889: string): MeanwhileCandidate[] {
  for (let back = 0; back <= MAX_DAYS_BACK; back += 1) {
    const day = minusDays(date1889, back);
    const onDay = cands.filter((c) => c.date === day);
    if (onDay.length) return [...onDay].sort((a, b) => (b.humanStoryScore ?? 0) - (a.humanStoryScore ?? 0)).slice(0, PER_SCOPE);
  }
  return [];
}

export function pickMeanwhile(cands: MeanwhileCandidate[], date1889: string) {
  const stories = cands.filter((c) => c.status === "classified" && c.hardHistory !== true && STORY_TYPES.has(c.type ?? ""));
  const eligible = stories.filter((c) => MIDWEST_STATES.includes(c.state));
  const toRow = (scope: string, c: MeanwhileCandidate) => ({
    scope,
    clip: {
      clippingId: c.clippingId, pageId: c.pageId, iiifBase: c.iiifBase, box: c.box, paper: c.paper, date: c.date, citationMla: c.citationMla,
      // Foreign-language stories show the pipeline's English translation, labeled.
      excerpt: tidy((c.translation ?? c.text).slice(0, 300)),
      ...(c.translation && c.language && c.language !== "english" ? { translatedFrom: c.language } : {}),
    },
    humanStoryScore: c.humanStoryScore ?? 0,
  });
  // Fallback order for a reader (spec 6.2): city → state → Midwest → national.
  const scoped = (scope: string, pool: MeanwhileCandidate[]) => top(pool, date1889).map((c) => toRow(scope, c));
  return [
    ...ANCHOR_CITIES.flatMap((city) => scoped(city, eligible.filter((c) => c.city === city))),
    ...MIDWEST_STATES.flatMap((state) => scoped(state, eligible.filter((c) => c.state === state))),
    ...scoped("midwest", eligible),
    ...scoped("national", stories),
  ];
}
