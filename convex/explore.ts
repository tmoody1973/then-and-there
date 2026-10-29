import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import { BLACK_PRESS_LCCNS } from "../lib/explore/communities";
import { requireSecret } from "./auth";
import { shelfFields } from "./schema";

const MAX_Q = 200;
const PER_INDEX = 256; // filters apply after the window, so keep it wide (Convex allows up to 1024)
const LIMIT = 30;
const CUTOFF = "1931-01-01"; // public domain: everything shown is pre-1931

type Clip = Record<string, unknown> & { _id: string; pageId: string; rawText: string; cleanedText?: string; type?: string; people?: string[]; editorStatus: string; hardHistory?: boolean };
type Page = Record<string, unknown> & { pageId: string; lccn: string; title: string; city: string; state: string; date: string; sequence: number; language: string[]; status: string };

// Story Finder: searches repaired text and the archive's own OCR (unrepaired clippings too).
// ponytail: page filters run in code over ≤512 search hits; denormalize state/date onto
// clippings if the corpus passes ~50k clippings.
export const search = query({
  args: {
    q: v.string(),
    state: v.optional(v.string()),
    city: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    language: v.optional(v.string()),
    community: v.optional(v.literal("black-press")),
    frontOnly: v.optional(v.boolean()),
    peopleOnly: v.optional(v.boolean()),
    verifiedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const q = a.q.trim();
    if (!q || q.length > MAX_Q) return [];
    const run = (index: string, field: string) =>
      ctx.db
        .query("clippings")
        .withSearchIndex(index, (s) => (a.peopleOnly ? s.search(field, q).eq("type", "person") : s.search(field, q)))
        .take(PER_INDEX) as Promise<Clip[]>;
    const [repaired, archive] = await Promise.all([run("search_text", "cleanedText"), run("search_raw", "rawText")]);

    const pages = new Map<string, Page | null>();
    const pageOf = async (id: string) => {
      if (!pages.has(id)) pages.set(id, (await ctx.db.query("pages").withIndex("by_pageId", (i) => i.eq("pageId", id)).unique()) as Page | null);
      return pages.get(id) ?? null;
    };
    const keep = (p: Page, c: Clip) =>
      p.status === "processed" &&
      p.date < CUTOFF &&
      (!a.state || p.state === a.state) &&
      (!a.city || p.city === a.city) &&
      (!a.from || p.date >= a.from) &&
      (!a.to || p.date <= a.to) &&
      (!a.language || p.language.includes(a.language)) &&
      (!a.community || BLACK_PRESS_LCCNS.includes(p.lccn)) &&
      (!a.frontOnly || p.sequence === 1) &&
      (!a.verifiedOnly || c.editorStatus === "pass");

    const seen = new Set<string>();
    const cards = [];
    for (const c of [...repaired, ...archive]) {
      if (cards.length >= LIMIT) break;
      if (seen.has(c._id)) continue;
      seen.add(c._id);
      const p = await pageOf(c.pageId);
      if (!p || !keep(p, c)) continue;
      cards.push({
        clippingId: c._id,
        pageId: p.pageId,
        iiifBase: p.iiifBase,
        box: c.box,
        paper: p.title,
        city: p.city,
        state: p.state,
        date: p.date,
        sequence: p.sequence,
        language: p.language,
        type: c.type,
        people: c.people ?? [],
        textKind: c.cleanedText ? ("repaired" as const) : ("archive" as const),
        text: c.cleanedText ?? c.rawText,
        ...(c.cleanedText ? { archiveText: c.rawText } : {}),
        editorStatus: c.editorStatus,
        hardHistory: c.hardHistory === true,
        citeThis: p.citeThis,
      });
    }
    return cards;
  },
});

// "Searching N processed pages." ponytail: full scan of a few hundred pages; add a counter doc past ~10k.
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const pages = ((await ctx.db.query("pages").collect()) as Page[]).filter((p) => p.status === "processed" && p.date < CUTOFF);
    return {
      pages: pages.length,
      states: [...new Set(pages.map((p) => p.state))].sort(),
      languages: [...new Set(pages.flatMap((p) => p.language))].sort(),
    };
  },
});

// The opening shelves, pre-built by scripts/explore/shelves.ts.
export const shelves = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("shelves").collect();
    return rows.sort((a, b) => a.order - b.order).map(({ _id: _i, _creationTime: _c, ...s }) => s);
  },
});

export const replaceShelves = mutation({
  args: { secret: v.string(), shelves: v.array(v.object(shelfFields)) },
  handler: async (ctx, { secret, shelves }) => {
    requireSecret(secret);
    for (const old of await ctx.db.query("shelves").collect()) await ctx.db.delete(old._id);
    for (const s of shelves) await ctx.db.insert("shelves", s);
  },
});
