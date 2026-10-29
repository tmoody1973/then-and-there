// The nightly agent, wired to the real Library, Meta models and Convex. Run by GitHub Actions.
// Usage: bun worker/agent/run.ts [--replay <batch>] [--budget 3] [cacheDir]
// Output is counts only: the Actions log is public, so it never prints a follow or a key.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type { BatchEntry, Follow } from "../../lib/agent/types";
import { verifyClaim } from "../../lib/editor/verify";
import { convexUrl, loadClips, writeSecret } from "../../lib/game/load";
import { createLocClient } from "../../lib/loc/client";
import { paperFromCite, plainCitation } from "../../lib/loc/cite";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { toDataUrl } from "../../lib/meta/image";
import { costOf, type Usage } from "../../lib/meta/pricing";
import { EDITOR_FIND_PROMPT } from "../../lib/pipeline/prompts";
import { withRetry } from "../../lib/util/retry";
import { fetchPage } from "../fetch";
import { makeProcessDeps, processPage } from "../process";
import { createBulkLimiter, downloadBatch, readBatchPages, readPageAlto } from "./batches";
import { runNight, safeErrorLine, type FoundClip } from "./night";

const BATCH_LIST = "https://chroniclingamerica.loc.gov/data/ocr/ocr.json";
const DAY_MS = 86_400_000;
const MEANWHILE_DAYS_BACK = 3;

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const replay = flag("--replay");
const budget = Number(flag("--budget") ?? 3);
const cacheDir = args.find((a) => !a.startsWith("--")) ?? "cache/pages";

const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const loc = createLocClient({ servicesPerMinute: 60 });
const meta = metaClient();
const loadImage = async (url: string) => toDataUrl(await loc.getBytes(url));
let spent = 0;
const onUsage = (model: string, u: Usage) => void (spent += costOf(model, u));
const q = <T>(fn: unknown, a: Record<string, unknown> = {}) => withRetry(() => convex.query(fn as never, { secret, ...a } as never)) as Promise<T>;
const m = <T>(fn: unknown, a: Record<string, unknown>) => withRetry(() => convex.mutation(fn as never, { secret, ...a } as never)) as Promise<T>;
const minusDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10);
const limiter = createBulkLimiter();
const work = mkdtempSync(join(tmpdir(), "tt-night-"));

type PageRow = { pageId: string; title: string; date: string; iiifBase: string; citeThis: { mla: string }; status: string };
const toFound = (page: PageRow, rows: ClipRow[]): FoundClip[] =>
  rows.map((c) => ({
    clippingId: c._id, text: c.cleanedText ?? c.rawText, type: c.type, people: c.people, humanStoryScore: c.humanStoryScore, hardHistory: c.hardHistory,
    box: c.box, iiifBase: page.iiifBase, pageId: page.pageId, paper: paperFromCite(page.citeThis.mla, page.title), date: page.date, citationMla: plainCitation(page.citeThis.mla),
  }));

type ClipRow = { _id: string; cleanedText?: string; rawText: string; type?: string; people?: string[]; humanStoryScore?: number; hardHistory?: boolean; box: FoundClip["box"] };

try {
  const summary = await runNight(
    {
      listBatches: async () => (await loc.getJson(BATCH_LIST)) as BatchEntry[],
      download: (e) => downloadBatch(e, work, { takeSlot: limiter.takeSlot }),
      pages: (archive) => readBatchPages(archive),
      placeOf: async (lccn) => {
        const cached = await q<string | null>(anyApi.agent.getState, { key: `place:${lccn}` });
        if (cached) return JSON.parse(cached) as { state: string; city: string };
        const d = (await loc.getPageJson(`https://www.loc.gov/item/${lccn}/?fo=json`)) as { item?: { location_city?: string[]; location_state?: string[] } };
        const place = { city: d.item?.location_city?.[0] ?? "", state: d.item?.location_state?.[0] ?? "" };
        await m(anyApi.agent.setState, { key: `place:${lccn}`, value: JSON.stringify(place) });
        return place;
      },
      processPage: async ({ pageId, lccn, date, archive, xmlMember }) => {
        // The fetcher needs the page's search record: one narrow search (this paper, this date).
        const { results } = await loc.searchPages({ facets: [`number_lccn:${lccn}`], startDate: date, endDate: date, count: 100 });
        const record = results.find((r) => String(r.id) === pageId);
        if (!record) throw new Error("page not found in the Library's search");
        const page = await fetchPage(loc, record, cacheDir, { altoXml: await readPageAlto(archive, xmlMember) });
        if (page.status !== "fetched") throw new Error(page.error ?? "fetch failed");
        const res = await processPage(page, makeProcessDeps(page, { loc, meta, convex, onUsage, cacheDir }));
        if (res.error) throw new Error(res.error);
        const rows = (await withRetry(() => convex.query(anyApi.clippings.byPage, { pageId }))) as ClipRow[];
        return toFound({ ...page, status: "processed" }, rows);
      },
      existing: async (pageId) => {
        const page = (await withRetry(() => convex.query(anyApi.pages.byPageId, { pageId }))) as PageRow | null;
        if (page?.status !== "processed") return null;
        return toFound(page, (await withRetry(() => convex.query(anyApi.clippings.byPage, { pageId }))) as ClipRow[]);
      },
      verifyFind: ({ clippingId, text, claim, cropUrl }) =>
        verifyClaim(
          { subjectKind: "find", subjectId: clippingId, claim, sourceText: text, cropUrl, prompt: EDITOR_FIND_PROMPT },
          { complete: makeComplete(meta, `find-${clippingId}`, onUsage), loadImage, log: async (run) => void (await m(anyApi.editorRuns.log, { run })) },
        ),
      store: {
        follows: async () => {
          const all: Follow[] = [];
          for (let cursor: string | null = null; ; ) {
            const res: { page: Follow[]; isDone: boolean; continueCursor: string } = await q(anyApi.agent.allFollows, { cursor });
            all.push(...res.page);
            if (res.isDone) return all;
            cursor = res.continueCursor;
          }
        },
        publishedDays: async () => ((await withRetry(() => convex.query(anyApi.gameDays.listPublished, {}))) as Array<{ day: number }>).map((d) => d.day),
        meanwhileCandidates: (date) => loadClips(convex, minusDays(date, MEANWHILE_DAYS_BACK), date),
        replaceMeanwhile: async (date, rows) => void (await m(anyApi.meanwhile.replaceForDate, { date1889: date, rows: rows.map((r) => ({ ...r, date1889: date })) })),
        addNote: (note) => m<boolean>(anyApi.agent.addNote, { note }),
        log: async (rows) => void (await m(anyApi.agent.log, { rows })),
        getState: (key) => q<string | null>(anyApi.agent.getState, { key }),
        setState: async (key, value) => void (await m(anyApi.agent.setState, { key, value })),
      },
      print: (line) => void process.stdout.write(`${line}\n`),
      spent: () => spent,
    },
    { today: new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }), replay, budget },
  );
  process.stdout.write(`notes sent: ${summary.notes} | model spend: $${spent.toFixed(4)} of $${budget}\n`);
} catch (e) {
  process.stdout.write(`${safeErrorLine(e)}\n`);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
