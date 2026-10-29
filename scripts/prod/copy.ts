// Copies what the new modes need from the local database into production, and only adds:
// processed pages prod doesn't have (with their clippings), and the Front Page rounds with their
// clue images re-uploaded to prod storage. A page prod already has is never touched: rewriting
// its clippings would change their IDs and orphan readers' saved notes. Dry run unless --write.
//
//   bunx convex data frontPages --format jsonLines > cache/frontpages.jsonl   (local, admin read)
//   bun scripts/prod/copy.ts cache/frontpages.jsonl [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { convexUrl, writeSecret } from "../../lib/game/load";
import { DAYS } from "../../lib/oneday/days";
import { withRetry } from "../../lib/util/retry";

const WRITE = process.argv.includes("--write");
const roundsFile = process.argv[2];
if (!roundsFile || roundsFile.startsWith("--")) throw new Error("usage: bun scripts/prod/copy.ts <frontpages.jsonl> [--write]");

const prodEnv = readFileSync(".env.convex-prod", "utf8");
const fromProd = (key: string) => {
  const v = prodEnv.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim();
  if (!v) throw new Error(`${key} missing from .env.convex-prod`);
  return v;
};
const local = new ConvexHttpClient(convexUrl());
const localSecret = writeSecret();
const prod = new ConvexHttpClient(fromProd("CONVEX_URL"));
const prodSecret = fromProd("CONVEX_WRITE_SECRET");
if (fromProd("CONVEX_URL") === convexUrl()) throw new Error("local and prod point at the same deployment");

type Doc = Record<string, unknown> & { _id: string; _creationTime: number };
const strip = ({ _id: _i, _creationTime: _c, ...rest }: Doc) => rest;
const allPages = async (c: ConvexHttpClient, secret: string) =>
  (await withRetry(() => c.query(anyApi.pages.byDateRange, { secret, start: "1700-01-01", end: "1930-12-31" }))) as Array<Doc & { pageId: string; status: string }>;

// ---- 1. Pages prod lacks, with their clippings.
const prodIds = new Set((await allPages(prod, prodSecret)).map((p) => p.pageId));
const missing = (await allPages(local, localSecret)).filter((p) => p.status === "processed" && !prodIds.has(p.pageId));
const withClips = [];
for (const p of missing) {
  const clips = (await withRetry(() => local.query(anyApi.clippings.byPage, { pageId: p.pageId }))) as Doc[];
  withClips.push({ page: strip(p), clips: clips.map(strip) });
}
const clipCount = withClips.reduce((n, x) => n + x.clips.length, 0);
process.stdout.write(`pages: prod has ${prodIds.size}; ${missing.length} processed pages to add, ${clipCount} clippings\n`);

// ---- 2. Front Page rounds: the exported rows, with each clue image fetched from local storage.
const rows = readFileSync(roundsFile, "utf8").trim().split("\n").map((l) => JSON.parse(l) as Doc & { no: number; pageId: string; clues: Array<{ image: string }> });
const rounds = [];
for (const row of rows.sort((a, b) => a.no - b.no)) {
  const board = (await withRetry(() => local.query(anyApi.frontPages.board, { no: row.no }))) as { clues: Array<{ url: string }> } | null;
  if (!board || board.clues.length !== row.clues.length) throw new Error(`round ${row.no}: board doesn't match the exported row`);
  const images = await Promise.all(
    board.clues.map(async ({ url }) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`round ${row.no}: image HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    }),
  );
  rounds.push({ row, images });
}
const kb = rounds.reduce((n, r) => n + r.images.reduce((m, i) => m + i.length, 0), 0) / 1024;
process.stdout.write(`front page: ${rounds.length} rounds, ${rounds.reduce((n, r) => n + r.images.length, 0)} clue images (${Math.round(kb)} KB)\n`);

// ---- 3. Every whole page the new modes show must have its clippings in prod (the content note reads them).
const shown = [...rows.map((r) => r.pageId), ...DAYS.flatMap((d) => (JSON.parse(readFileSync(`data/oneday/${d.slug}.json`, "utf8")) as { papers: Array<{ pageId: string }> }).papers.map((p) => p.pageId))];
const adding = new Set(missing.map((p) => p.pageId));
const uncovered = shown.filter((id) => !prodIds.has(id) && !adding.has(id));
process.stdout.write(`whole pages shown: ${shown.length}; already in prod ${shown.filter((id) => prodIds.has(id)).length}, being added ${shown.filter((id) => adding.has(id)).length}, missing ${uncovered.length}\n`);
if (uncovered.length) throw new Error(`not in either database: ${uncovered.join(", ")}`);

if (!WRITE) {
  process.stdout.write("dry run: nothing written. Add --write to copy.\n");
  process.exit(0);
}

// Clippings before the page: if a run dies between the two, the page is still "missing" and the
// rerun redoes it (replaceForPage replaces, upsert is idempotent).
for (const [i, { page, clips }] of withClips.entries()) {
  await withRetry(() => prod.mutation(anyApi.clippings.replaceForPage, { secret: prodSecret, pageId: page.pageId, clippings: clips }));
  await withRetry(() => prod.mutation(anyApi.pages.upsert, { secret: prodSecret, page }));
  if ((i + 1) % 25 === 0) process.stdout.write(`  ${i + 1}/${withClips.length} pages\n`);
}
const upload = async (bytes: Uint8Array) => {
  const url = (await withRetry(() => prod.mutation(anyApi.frontPages.uploadUrl, { secret: prodSecret }))) as string;
  const res = await fetch(url, { method: "POST", headers: { "content-type": "image/jpeg" }, body: new Blob([bytes as BlobPart]) });
  if (!res.ok) throw new Error(`upload failed: HTTP ${res.status}`);
  return ((await res.json()) as { storageId: string }).storageId;
};
const prodRows: Array<Record<string, unknown>> = [];
for (const { row, images } of rounds) {
  const ids: string[] = [];
  for (const img of images) ids.push(await upload(img));
  prodRows.push({ ...strip(row), clues: row.clues.map((c, i) => ({ ...c, image: ids[i] })) });
}
await withRetry(() => prod.mutation(anyApi.frontPages.replaceAll, { secret: prodSecret, rows: prodRows }));
const log = `cache/prod-copy-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(log, JSON.stringify({ pages: missing.map((p) => p.pageId), rounds: prodRows.length }, null, 2));
process.stdout.write(`wrote ${missing.length} pages, ${clipCount} clippings, ${prodRows.length} rounds. Page list: ${log}\n`);
