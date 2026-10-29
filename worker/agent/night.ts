// The light agent's night (spec 6.2): prepare tomorrow's "meanwhile", check the Library's new
// batches against readers' follows, have the Editor confirm each find, send at most one note per
// reader, and write an honest activity log. Follows are matched here, in our code; the Editor sees
// only a clipping and a span printed in it. Printed output carries counts, never follows or keys.
import { gameClockDate } from "../../lib/agent/clock";
import { matchName, matchPage, pickCandidates, type Hit } from "../../lib/agent/match";
import { activityLine } from "../../lib/agent/night";
import type { BatchEntry, Follow } from "../../lib/agent/types";
import { labelClaim } from "../../lib/editor/labels";
import { pickMeanwhile, type MeanwhileCandidate } from "../../lib/game/pickMeanwhile";
import { cropUrl } from "../../lib/loc/paths";
import { newBatches } from "./batches";

export const MAX_BATCHES_PER_NIGHT = 3; // a 530 MB batch reads in ~8 min; the job has 60
const STORY_TYPES = new Set(["person", "event", "business"]);
const NO_CREDITS = /credit|quota|insufficient|billing|\b402\b/i;
const STATE_KEY = "batches";

export type FoundClip = {
  clippingId: string;
  text: string;
  type?: string;
  people?: string[];
  humanStoryScore?: number;
  hardHistory?: boolean;
  box: { x: number; y: number; w: number; h: number };
  iiifBase: string;
  pageId: string;
  paper: string;
  date: string;
  citationMla: string;
};
type BatchPage = { pageId: string; lccn: string; date: string; text: string; xmlMember: string };
type CandidatePage = { pageId: string; lccn: string; date: string; archive: string; xmlMember: string };
type Note = { owner: string; clippingId: string; clip: Record<string, unknown>; matched: string; replay: boolean; createdAt: number };
type Line = { owner?: string; runId: string; line: string; replay: boolean; createdAt: number };

export type NightDeps = {
  listBatches(): Promise<BatchEntry[]>;
  download(e: BatchEntry): Promise<string>;
  pages(archive: string): AsyncIterable<BatchPage>;
  placeOf(lccn: string): Promise<{ state: string; city: string }>;
  // A page processed before keeps its clippings (and their ids, badges and shelf places).
  existing(pageId: string): Promise<FoundClip[] | null>;
  processPage(page: CandidatePage): Promise<FoundClip[]>;
  verifyFind(input: { clippingId: string; text: string; claim: string; cropUrl: string }): Promise<{ pass: boolean; reason: string }>;
  store: {
    follows(): Promise<Follow[]>;
    publishedDays(): Promise<number[]>;
    meanwhileCandidates(date1889: string): Promise<MeanwhileCandidate[]>;
    replaceMeanwhile(date1889: string, rows: ReturnType<typeof pickMeanwhile>): Promise<void>;
    addNote(note: Note): Promise<boolean>;
    log(rows: Line[]): Promise<void>;
    getState(key: string): Promise<string | null>;
    setState(key: string, value: string): Promise<void>;
  };
  print(line: string): void;
  spent(): number;
};
export type NightSummary = { batches: number; pages: number; follows: number; candidates: number; capped: number; confirmed: number; notes: number; skipped: string[] };

// The Actions log is public: an uncaught error is reported by type only, never its text, which can
// echo stored values (a reader's key, a matched name).
export const safeErrorLine = (e: unknown) => `night failed: ${e instanceof Error ? e.name : "unknown error"} (details withheld from the public log)`;

const firstLine = (e: unknown) => (e instanceof Error ? e.message : String(e)).split("\n")[0].slice(0, 160);

// What in this clipping matches the follow, and the claim the Editor checks. Null if nothing usable.
function findIn(clips: FoundClip[], hit: Hit, follow: Follow): { clip: FoundClip; matched: string; claim: string } | null {
  const usable = clips.filter((c) => c.hardHistory !== true);
  if (follow.kind === "name") {
    for (const clip of usable) {
      const matched = matchName(clip.text, follow.value);
      if (matched) return { clip, matched, claim: `This clipping names a person called ${matched}` };
    }
    return null;
  }
  const best = usable
    .filter((c) => STORY_TYPES.has(c.type ?? ""))
    .sort((a, b) => (b.humanStoryScore ?? 0) - (a.humanStoryScore ?? 0))[0];
  return best ? { clip: best, matched: hit.matched, claim: labelClaim({ type: best.type ?? "other", people: best.people ?? [] }) } : null;
}

export async function runNight(deps: NightDeps, opts: { today: string; replay?: string; budget: number }): Promise<NightSummary> {
  const replay = Boolean(opts.replay);
  const runId = `${opts.today}${replay ? `-replay-${opts.replay}` : ""}`;
  const now = Date.now();
  const s: NightSummary = { batches: 0, pages: 0, follows: 0, candidates: 0, capped: 0, confirmed: 0, notes: 0, skipped: [] };
  const lines: Line[] = [];

  // 1. Tomorrow's "meanwhile, back home", precomputed per place, never per reader.
  try {
    const date = gameClockDate(opts.today, await deps.store.publishedDays());
    const cands = await deps.store.meanwhileCandidates(date);
    if (cands.length) await deps.store.replaceMeanwhile(date, pickMeanwhile(cands, date));
  } catch (e) {
    s.skipped.push(`meanwhile: ${firstLine(e)}`);
  }

  // 2. Which batches are new. The very first night only records where we start.
  const list = await deps.listBatches();
  const prevRaw = await deps.store.getState(STATE_KEY);
  if (prevRaw === null && !replay) {
    await deps.store.setState(STATE_KEY, JSON.stringify(list.map((b) => b.batch)));
    const line = `First night: recorded ${list.length.toLocaleString("en-US")} existing batches as the starting point. New batches are checked from tomorrow.`;
    await deps.store.log([{ runId, line, replay, createdAt: now }]);
    deps.print(line);
    return s;
  }
  const prev = prevRaw ? (JSON.parse(prevRaw) as string[]) : [];
  const todo = newBatches(prev, list, { replay: opts.replay }).slice(0, MAX_BATCHES_PER_NIGHT);
  const follows = await deps.store.follows();
  s.follows = follows.length;
  const followById = new Map(follows.map((f) => [f.id, f]));

  // 3. Scan each batch's pages for follows (no follows: nothing to download).
  const scanned: string[] = [];
  const hits: Hit[] = [];
  const pageInfo = new Map<string, CandidatePage>();
  const places = new Map<string, { state: string; city: string }>();
  for (const b of todo) {
    if (!follows.length) {
      scanned.push(b.batch);
      continue;
    }
    try {
      const archive = await deps.download(b);
      let pages = 0;
      for await (const p of deps.pages(archive)) {
        pages += 1;
        if (!places.has(p.lccn)) places.set(p.lccn, await deps.placeOf(p.lccn));
        const place = places.get(p.lccn)!;
        const found = matchPage({ ...p, ...place }, follows);
        if (found.length) {
          hits.push(...found);
          pageInfo.set(p.pageId, { pageId: p.pageId, lccn: p.lccn, date: p.date, archive, xmlMember: p.xmlMember });
        }
      }
      s.pages += pages;
      scanned.push(b.batch);
    } catch (e) {
      s.skipped.push(`batch ${b.batch}: ${firstLine(e)}`);
    }
  }
  s.batches = scanned.length;

  // 4–6. Process candidate pages, have the Editor confirm, one note per reader per night.
  const { pages: candidates, capped } = pickCandidates(hits);
  s.candidates = candidates.length;
  s.capped = capped;
  // An infrastructure stop leaves finds unjudged: keep tonight's batches unseen so tomorrow retries.
  let hold = false;
  const noted = new Set<string>();
  let stop = false;
  for (const cand of candidates) {
    if (stop) break;
    const waiting = cand.hits.filter((h) => !noted.has(h.owner));
    if (!waiting.length) continue;
    if (deps.spent() >= opts.budget) {
      s.skipped.push("budget");
      hold = true;
      break;
    }
    let clips: FoundClip[];
    try {
      clips = (await deps.existing(cand.pageId)) ?? (await deps.processPage(pageInfo.get(cand.pageId)!));
    } catch (e) {
      if (NO_CREDITS.test(firstLine(e))) {
        s.skipped.push("no credits");
        stop = true;
        hold = true;
      } else s.skipped.push(`page: ${firstLine(e)}`);
      continue;
    }
    for (const hit of waiting) {
      if (noted.has(hit.owner)) continue;
      const follow = followById.get(hit.followId);
      const find = follow ? findIn(clips, hit, follow) : null;
      if (!find) continue;
      let verdict: { pass: boolean; reason: string };
      try {
        verdict = await deps.verifyFind({ clippingId: find.clip.clippingId, text: find.clip.text, claim: find.claim, cropUrl: cropUrl(find.clip.iiifBase, find.clip.box) });
      } catch (e) {
        verdict = { pass: false, reason: NO_CREDITS.test(firstLine(e)) ? "no credits" : "editor-unavailable" };
      }
      // The Editor fails closed: an unreachable Editor is a skip, not a rejection.
      if (verdict.reason === "editor-unavailable" || verdict.reason === "no credits") {
        s.skipped.push(verdict.reason === "no credits" ? "no credits" : "editor unavailable");
        stop = true;
        hold = true;
        break;
      }
      if (!verdict.pass) continue;
      s.confirmed += 1;
      const { clip } = find;
      const sent = await deps.store.addNote({
        owner: hit.owner,
        clippingId: clip.clippingId,
        clip: { clippingId: clip.clippingId, pageId: clip.pageId, iiifBase: clip.iiifBase, box: clip.box, paper: clip.paper, date: clip.date, citationMla: clip.citationMla, excerpt: clip.text.slice(0, 300) },
        matched: find.matched,
        replay,
        createdAt: now,
      });
      if (!sent) continue; // already sent this clipping to this reader on an earlier night
      noted.add(hit.owner);
      s.notes += 1;
      lines.push({ owner: hit.owner, runId, line: `${replay ? "Replay: " : ""}Found "${find.matched}" in ${clip.paper}, ${clip.date}. The Editor confirmed it against the scan. Sent you a note.`, replay, createdAt: now });
    }
  }

  // 7–8. The log, then remember which batches are done (failed ones are retried tomorrow).
  const shared = activityLine({ batches: s.batches, pages: s.pages, follows: s.follows, candidates: s.candidates, capped: s.capped, confirmed: s.confirmed, notes: s.notes, replay });
  await deps.store.log([{ runId, line: shared, replay, createdAt: now }, ...lines]);
  deps.print(shared);
  for (const why of s.skipped) deps.print(`skipped: ${why}`);
  if (!replay && !hold) await deps.store.setState(STATE_KEY, JSON.stringify([...prev, ...scanned]));
  return s;
}
