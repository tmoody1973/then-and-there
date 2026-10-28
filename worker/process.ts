// Processes cached pages end to end: segment -> words per clipping -> clean only
// when needed -> classify -> store in Convex.
// Usage: bun worker/process.ts [--limit N] [--only <substring>] [cacheDir]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { altoScale, parseAlto } from "../lib/alto/parse";
import { createLocClient } from "../lib/loc/client";
import { makeComplete, makeImageLoader, makeSam, makeSpark, metaClient } from "../lib/meta/client";
import { toDataUrl } from "../lib/meta/image";
import { costOf, type Usage } from "../lib/meta/pricing";
import type { JsonResult } from "../lib/pipeline/askJson";
import type { Classification } from "../lib/pipeline/classify";
import { classifyClipping } from "../lib/pipeline/classify";
import { type Cleaned, cleanClipping, needsCleanup } from "../lib/pipeline/clean";
import { nonDictionaryRate } from "../lib/pipeline/garble";
import { wordsInBox } from "../lib/pipeline/mapWords";
import { PROMPT_VERSION } from "../lib/pipeline/prompts";
import { type Box, segmentPage } from "../lib/segment/segmentPage";
import { mapPool } from "../lib/util/pool";
import { type CachedPage, safeId } from "./fetch";

const CLIPPING_CONCURRENCY = 8;
// Contributor tier allows 150 req/min; the SDK backs off on 429 (maxRetries in metaClient).
const PAGE_CONCURRENCY = 4;

export type PageRow = Omit<CachedPage, "status"> & { altoScale: number; status: "fetched" | "processed" | "failed" };

export type ClippingRow = {
  pageId: string;
  box: { x: number; y: number; w: number; h: number };
  segLabel: string;
  segSource: Box["source"];
  rawText: string;
  meanWc: number;
  nonDictRate: number;
  cleanedText?: string;
  translation?: string;
  language?: string;
  type?: Classification["type"];
  people?: string[];
  places?: string[];
  humanStoryScore?: number;
  hardHistory?: boolean;
  hardHistoryReason?: string;
  status: "raw" | "cleaned" | "classified" | "failed";
  editorStatus: "unchecked";
  promptVersion: string;
};

export type ProcessDeps = {
  altoXml: string;
  segment: (page: CachedPage) => Promise<Box[]>;
  clean: (c: { clippingId: string; cropUrl: string; rawText: string; nonDictRate: number }) => Promise<Cleaned>;
  classify: (c: { clippingId: string; text: string }) => Promise<JsonResult<Classification>>;
  store: { upsertPage: (p: PageRow) => Promise<void>; replaceClippings: (pageId: string, rows: ClippingRow[]) => Promise<void> };
  shouldClean?: (m: { meanWc: number; nonDictRate: number }) => boolean;
};

import { cropUrl } from "../lib/loc/paths";
export { cropUrl };

// Column splitting already starts each story at its headline, so a headline whose
// center sits inside a story or ad box would only duplicate it. Mastheads stay.
const centerIn = (a: Box, b: Box) => {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h;
};
export const dropContainedHeadlines = (boxes: Box[]) =>
  boxes.filter((b) => b.label !== "headline" || !boxes.some((o) => o !== b && o.label !== "headline" && centerIn(b, o)));

const round = (b: Box) => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) });

async function processClipping(page: CachedPage, box: Box, index: number, scale: number, alto: ReturnType<typeof parseAlto>, deps: ProcessDeps): Promise<ClippingRow> {
  const clippingId = `${safeId(page.pageId)}#${index}`;
  const { text, meanWc } = wordsInBox(alto, box, scale);
  const nonDictRate = nonDictionaryRate(text);
  const row: ClippingRow = {
    pageId: page.pageId,
    box: round(box),
    segLabel: box.label,
    segSource: box.source,
    rawText: text,
    meanWc,
    nonDictRate,
    status: "raw",
    editorStatus: "unchecked",
    promptVersion: PROMPT_VERSION,
  };
  if (box.label === "photograph" || !text) return row;
  let current = row;
  if ((deps.shouldClean ?? needsCleanup)({ meanWc, nonDictRate })) {
    try {
      const cleaned = await deps.clean({ clippingId, cropUrl: cropUrl(page.iiifBase, row.box), rawText: text, nonDictRate });
      current = { ...current, ...cleaned, status: "cleaned" };
    } catch {
      // Repair gave up (often "nothing readable"); the raw OCR is still worth classifying.
    }
  }
  const res = await deps.classify({ clippingId, text: current.cleanedText ?? text });
  if (!res.ok) return { ...current, status: "failed" };
  const { type, people, places, humanStoryScore, hardHistory, hardHistoryReason } = res.value;
  return {
    ...current,
    type,
    people,
    places,
    humanStoryScore,
    hardHistory,
    ...(hardHistoryReason ? { hardHistoryReason } : {}),
    status: "classified",
  };
}

export async function processPage(page: CachedPage, deps: ProcessDeps): Promise<{ clippings: number; cleaned: number; failed: number }> {
  const alto = parseAlto(deps.altoXml);
  const scale = altoScale(alto.width, page.imageWidth);
  let boxes: Box[];
  try {
    boxes = await deps.segment(page);
  } catch (e) {
    await deps.store.upsertPage({ ...page, altoScale: scale, status: "failed", error: e instanceof Error ? e.message : String(e) });
    return { clippings: 0, cleaned: 0, failed: 0 };
  }
  const rows = await mapPool(dropContainedHeadlines(boxes), CLIPPING_CONCURRENCY, (b, i) => processClipping(page, b, i, scale, alto, deps));
  await deps.store.replaceClippings(page.pageId, rows);
  await deps.store.upsertPage({ ...page, altoScale: scale, status: "processed" });
  return {
    clippings: rows.length,
    cleaned: rows.filter((r) => r.cleanedText !== undefined).length,
    failed: rows.filter((r) => r.status === "failed").length,
  };
}

function cachedPages(cacheDir: string): CachedPage[] {
  return readdirSync(cacheDir)
    .map((d) => {
      try {
        return JSON.parse(readFileSync(join(cacheDir, d, "meta.json"), "utf8")) as CachedPage;
      } catch {
        return undefined;
      }
    })
    .filter((p): p is CachedPage => p?.status === "fetched");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const limit = Number(flag("--limit") ?? Infinity);
  // Hard stop on spend (USD, live calls only). Pages already started finish; no new ones begin.
  const budget = Number(flag("--budget") ?? 40);
  const only = flag("--only");
  const cacheDir = args[0] ?? "cache/pages";
  if (!process.env.CONVEX_URL) throw new Error("CONVEX_URL not set (run `bunx convex dev` first)");

  // Leaves headroom for a concurrent fetch run: both share the Library's 150/min image limit.
  const loc = createLocClient({ servicesPerMinute: 100 });
  const meta = metaClient();
  const convex = new ConvexHttpClient(process.env.CONVEX_URL);
  const loadImage = async (url: string) => toDataUrl(await loc.getBytes(url));
  const calls: Record<string, number> = {};
  const count = (k: string) => (calls[k] = (calls[k] ?? 0) + 1);
  // Live (uncached) calls only: what this run actually spent.
  let spent = 0;
  const spentBy: Record<string, number> = {};
  const onUsage = (model: string, u: Usage) => {
    const usd = costOf(model, u);
    spent += usd;
    spentBy[model] = (spentBy[model] ?? 0) + usd;
  };

  const pages = cachedPages(cacheDir)
    .filter((p) => !only || p.pageId.includes(only))
    .slice(0, limit);
  let totals = { clippings: 0, cleaned: 0, failed: 0 };
  let stopped = 0;
  await mapPool(pages, PAGE_CONCURRENCY, async (page) => {
    if (spent >= budget) {
      stopped += 1;
      return;
    }
    const id = safeId(page.pageId);
    const spark = makeSpark(meta, id, onUsage);
    const sam = makeSam(meta, id, onUsage);
    const complete = makeComplete(meta, id, onUsage);
    const res = await processPage(page, {
      altoXml: readFileSync(join(cacheDir, id, "alto.xml"), "utf8"),
      segment: (p) =>
        segmentPage(p, {
          image: makeImageLoader(loc),
          spark: (img, prompt) => (count("spark-layout"), spark(img, prompt)),
          sam: (img, text) => (count("sam"), sam(img, text)),
        }),
      clean: (c) => (count("clean"), cleanClipping(c, { complete, loadImage })),
      classify: (c) => (count("classify"), classifyClipping(c, { complete })),
      store: {
        upsertPage: async (p) => void (await convex.mutation(anyApi.pages.upsert, { page: p })),
        replaceClippings: async (pageId, rows) => void (await convex.mutation(anyApi.clippings.replaceForPage, { pageId, clippings: rows })),
      },
    });
    totals = { clippings: totals.clippings + res.clippings, cleaned: totals.cleaned + res.cleaned, failed: totals.failed + res.failed };
    process.stdout.write(`${page.date} ${page.title.slice(0, 40)} p${page.sequence}: ${res.clippings} clippings, ${res.cleaned} cleaned, ${res.failed} failed\n`);
  });
  process.stdout.write(`\npages ${pages.length} | ${JSON.stringify(totals)}\nmodel calls (incl. cache hits): ${JSON.stringify(calls)}\n`);
  const by = Object.entries(spentBy).map(([m, v]) => `${m} $${v.toFixed(4)}`).join(", ");
  if (stopped) process.stdout.write(`BUDGET STOP: $${budget} reached; ${stopped} pages not started (rerun to continue; finished work is cached)\n`);
  process.stdout.write(`spent this run: $${spent.toFixed(4)} (${by || "all cached"}) | per page: $${(spent / Math.max(1, pages.length)).toFixed(4)}\n`);
}
