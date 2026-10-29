// The daily front page. board() is all a player's browser gets before guessing: clue images
// (opaque storage URLs) and where each sits on the page. reveal() returns the answer and score.
import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { type GenericId, v } from "convex/values";
import { REGIONS, scoreGuess } from "../lib/frontpage/rules";
import { requireSecret } from "./auth";
import { frontPageFields } from "./schema";

type Clue = { kind: string; label: string; box: { x: number; y: number; w: number; h: number }; image: GenericId<"_storage">; prints: string; why: string };
const frac = (n: number) => Math.round(n * 1e4) / 1e4;

export const board = query({
  args: { no: v.number() },
  handler: async (ctx, { no }) => {
    const row = await ctx.db.query("frontPages").withIndex("by_no", (i) => i.eq("no", no)).unique();
    if (!row) return null;
    const count = (await ctx.db.query("frontPages").collect()).length;
    const { imageWidth: W, imageHeight: H } = row;
    const clues = await Promise.all(
      (row.clues as Clue[]).map(async (c) => ({
        kind: c.kind,
        label: c.label,
        box: { x: frac(c.box.x / W), y: frac(c.box.y / H), w: frac(c.box.w / W), h: frac(c.box.h / H) },
        url: (await ctx.storage.getUrl(c.image)) ?? "",
      })),
    );
    return { no, count, aspect: W / H, clues };
  },
});

// How many pages are in rotation (the client works out today's number from it).
export const count = query({ args: {}, handler: async (ctx) => (await ctx.db.query("frontPages").collect()).length });

export const reveal = query({
  args: { no: v.number(), revealed: v.number(), year: v.number(), region: v.union(...REGIONS.map((r) => v.literal(r))) },
  handler: async (ctx, { no, revealed, year, region }) => {
    const row = await ctx.db.query("frontPages").withIndex("by_no", (i) => i.eq("no", no)).unique();
    if (!row) return null;
    const { paper, city, state, date, citeThis, pageId, iiifBase, imageWidth, imageHeight } = row;
    return {
      answer: { paper, city, state, region: row.region, date, year: row.year, citeThis, pageId, iiifBase, imageWidth, imageHeight },
      score: scoreGuess({ revealed: Math.min(Math.max(1, Math.round(revealed)), row.clues.length), year, region }, { year: row.year, region: row.region }),
      clues: (row.clues as Clue[]).map((c) => ({ kind: c.kind, label: c.label, prints: c.prints, why: c.why })),
    };
  },
});

// ---- Build script only (shared secret) ----

export const uploadUrl = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    return await ctx.storage.generateUploadUrl();
  },
});

export const replaceAll = mutation({
  args: { secret: v.string(), rows: v.array(v.object(frontPageFields)) },
  handler: async (ctx, { secret, rows }) => {
    requireSecret(secret);
    for (const old of await ctx.db.query("frontPages").collect()) await ctx.db.delete(old._id);
    for (const row of rows) await ctx.db.insert("frontPages", row);
  },
});
