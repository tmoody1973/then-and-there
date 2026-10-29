// Every clipping on processed, pre-1931 pages, shaped as Explore cards (for shelves and packs).
import type { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { mapPool } from "../util/pool";
import { withRetry } from "../util/retry";
import type { ShelfCard } from "./shelves";

type Page = { pageId: string; lccn: string; title: string; city: string; state: string; date: string; sequence: number; language: string[]; iiifBase: string; citeThis: ShelfCard["citeThis"]; status: string };
type Clip = { _id: string; box: ShelfCard["box"]; rawText: string; cleanedText?: string; type?: string; people?: string[]; editorStatus: string; hardHistory?: boolean; humanStoryScore?: number };

export async function loadPool(convex: ConvexHttpClient, secret: string): Promise<ShelfCard[]> {
  const pages = ((await convex.query(anyApi.pages.byDateRange, { secret, start: "1800-01-01", end: "1930-12-31" })) as Page[]).filter((p) => p.status === "processed");
  const perPage = await mapPool(pages, 8, async (p) => {
    const clips = (await withRetry(() => convex.query(anyApi.clippings.byPage, { pageId: p.pageId }))) as Clip[];
    return clips.map((c) => ({
      clippingId: c._id, pageId: p.pageId, iiifBase: p.iiifBase, box: c.box, paper: p.title, city: p.city, state: p.state, date: p.date,
      sequence: p.sequence, language: p.language, lccn: p.lccn, type: c.type, people: c.people ?? [],
      textKind: c.cleanedText ? ("repaired" as const) : ("archive" as const), text: c.cleanedText ?? c.rawText,
      ...(c.cleanedText ? { archiveText: c.rawText } : {}),
      editorStatus: c.editorStatus, hardHistory: c.hardHistory === true, humanStoryScore: c.humanStoryScore ?? 0, citeThis: p.citeThis,
    }));
  });
  return perPage.flat();
}
