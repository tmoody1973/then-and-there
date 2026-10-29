// Loads processed clippings (with their page's paper, date, state and citation) for content scripts.
import type { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type { MeanwhileCandidate } from "./pickMeanwhile";

type PageRow = { pageId: string; title: string; state: string; city: string; date: string; iiifBase: string; citeThis: { mla: string }; status: string };
type ClipRow = {
  _id: string;
  box: { x: number; y: number; w: number; h: number };
  rawText: string;
  cleanedText?: string;
  translation?: string;
  language?: string;
  type?: string;
  humanStoryScore?: number;
  hardHistory?: boolean;
  status: string;
};

import { paperFromCite, plainCitation } from "../loc/cite";

const paperName = (p: PageRow) => paperFromCite(p.citeThis.mla, p.title);

export async function loadClips(convex: ConvexHttpClient, start: string, end: string): Promise<MeanwhileCandidate[]> {
  const pages = ((await convex.query(anyApi.pages.byDateRange, { secret: writeSecret(), start, end })) as PageRow[]).filter((p) => p.status === "processed");
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
        translation: r.translation,
        language: r.language,
        state: p.state,
        city: p.city,
        type: r.type,
        humanStoryScore: r.humanStoryScore,
        hardHistory: r.hardHistory,
        status: r.status,
      });
    }
  }
  return out;
}

// The shared secret Convex requires for writes and script-only reads (never shipped to the browser).
export function writeSecret(): string {
  const secret = process.env.CONVEX_WRITE_SECRET;
  if (!secret) throw new Error("CONVEX_WRITE_SECRET not set (see .env.example)");
  return secret;
}

export function convexUrl(): string {
  const url = process.env.CONVEX_URL;
  if (!url) throw new Error("CONVEX_URL not set (run `bunx convex dev` first)");
  return url;
}
