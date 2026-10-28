// Loads processed clippings (with their page's paper, date, state and citation) for content scripts.
import type { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type { MeanwhileCandidate } from "./pickMeanwhile";

type PageRow = { pageId: string; title: string; state: string; date: string; iiifBase: string; citeThis: { mla: string }; status: string };
type ClipRow = {
  _id: string;
  box: { x: number; y: number; w: number; h: number };
  rawText: string;
  cleanedText?: string;
  type?: string;
  humanStoryScore?: number;
  hardHistory?: boolean;
  status: string;
};

// The Library's MLA citation carries the paper's properly cased name: <cite>Homer Guardian</cite>.
const paperName = (p: PageRow) => p.citeThis.mla.match(/<cite>(.*?)<\/cite>/)?.[1] ?? p.title;
const plainCitation = (mla: string) => mla.replace(/<\/?cite>/g, "");

export async function loadClips(convex: ConvexHttpClient, start: string, end: string): Promise<MeanwhileCandidate[]> {
  const pages = ((await convex.query(anyApi.pages.byDateRange, { start, end })) as PageRow[]).filter((p) => p.status === "processed");
  const out: MeanwhileCandidate[] = [];
  for (const p of pages) {
    const rows = (await convex.query(anyApi.clippings.byPage, { pageId: p.pageId })) as ClipRow[];
    for (const r of rows) {
      out.push({
        clippingId: r._id,
        pageId: p.pageId,
        iiifBase: p.iiifBase,
        box: r.box,
        paper: paperName(p),
        date: p.date,
        citationMla: plainCitation(p.citeThis.mla),
        text: r.cleanedText ?? r.rawText,
        state: p.state,
        type: r.type,
        humanStoryScore: r.humanStoryScore,
        hardHistory: r.hardHistory,
        status: r.status,
      });
    }
  }
  return out;
}

export function convexUrl(): string {
  const url = process.env.CONVEX_URL;
  if (!url) throw new Error("CONVEX_URL not set (run `bunx convex dev` first)");
  return url;
}
