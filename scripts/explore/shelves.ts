// Builds Explore's opening shelves from processed, pre-1931 pages. No model calls.
// Usage: bun scripts/explore/shelves.ts
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { buildShelf, SHELVES, type ShelfCard } from "../../lib/explore/shelves";
import { convexUrl, writeSecret } from "../../lib/game/load";
import { mapPool } from "../../lib/util/pool";
import { withRetry } from "../../lib/util/retry";

type Page = { pageId: string; lccn: string; title: string; city: string; state: string; date: string; sequence: number; language: string[]; iiifBase: string; citeThis: ShelfCard["citeThis"]; status: string };
type Clip = { _id: string; box: ShelfCard["box"]; rawText: string; cleanedText?: string; type?: string; people?: string[]; editorStatus: string; hardHistory?: boolean; humanStoryScore?: number };

const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const pages = ((await convex.query(anyApi.pages.byDateRange, { secret, start: "1800-01-01", end: "1930-12-31" })) as Page[]).filter((p) => p.status === "processed");
const pool: ShelfCard[] = (
  await mapPool(pages, 8, async (p) => {
    const clips = (await withRetry(() => convex.query(anyApi.clippings.byPage, { pageId: p.pageId }))) as Clip[];
    return clips.map((c) => ({
      clippingId: c._id, pageId: p.pageId, iiifBase: p.iiifBase, box: c.box, paper: p.title, city: p.city, state: p.state, date: p.date,
      sequence: p.sequence, language: p.language, lccn: p.lccn, type: c.type, people: c.people ?? [],
      textKind: c.cleanedText ? ("repaired" as const) : ("archive" as const), text: c.cleanedText ?? c.rawText,
      ...(c.cleanedText ? { archiveText: c.rawText } : {}),
      editorStatus: c.editorStatus, hardHistory: c.hardHistory === true, humanStoryScore: c.humanStoryScore ?? 0, citeThis: p.citeThis,
    }));
  })
).flat();
const shelves = SHELVES.map(({ select: _s, ...shelf }) => ({
  ...shelf,
  cards: buildShelf(SHELVES.find((x) => x.slug === shelf.slug)!, pool).map(({ lccn: _l, humanStoryScore: _h, ...card }) => card),
}));
await withRetry(() => convex.mutation(anyApi.explore.replaceShelves, { secret, shelves }));
for (const s of shelves) process.stdout.write(`${s.slug}: ${s.cards.length} cards (${s.cards.filter((c) => c.editorStatus === "pass").length} verified)\n`);
