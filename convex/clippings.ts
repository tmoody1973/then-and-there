import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import { requireSecret } from "./auth";
import { clippingFields } from "./schema";

export const replaceForPage = mutation({
  args: { secret: v.string(), pageId: v.string(), clippings: v.array(v.object(clippingFields)) },
  handler: async (ctx, { secret, pageId, clippings }) => {
    requireSecret(secret);
    const old = await ctx.db
      .query("clippings")
      .withIndex("by_pageId", (q) => q.eq("pageId", pageId))
      .collect();
    await Promise.all(old.map((c) => ctx.db.delete(c._id)));
    return Promise.all(clippings.map((c) => ctx.db.insert("clippings", c)));
  },
});

export const byPage = query({
  args: { pageId: v.string() },
  handler: (ctx, { pageId }) =>
    ctx.db
      .query("clippings")
      .withIndex("by_pageId", (q) => q.eq("pageId", pageId))
      .collect(),
});

const STORY_TYPES = ["person", "event", "business"] as const;

// The strongest human stories not yet checked by the Editor (script-only).
export const topForVerify = query({
  args: { secret: v.string(), limit: v.number() },
  handler: async (ctx, { secret, limit }) => {
    requireSecret(secret);
    const picked = [];
    for (const type of STORY_TYPES) {
      let n = 0;
      // Walk strongest-first and stop early: a full collect would exceed Convex's per-query read limit.
      for await (const c of ctx.db.query("clippings").withIndex("by_type_score", (i) => i.eq("type", type)).order("desc")) {
        if (n >= limit) break;
        if (c.status !== "classified" || c.editorStatus !== "unchecked") continue;
        picked.push(c);
        n += 1;
      }
    }
    const top = picked.sort((a, b) => (b.humanStoryScore ?? 0) - (a.humanStoryScore ?? 0)).slice(0, limit);
    return Promise.all(
      top.map(async (c) => {
        const page = await ctx.db.query("pages").withIndex("by_pageId", (i) => i.eq("pageId", c.pageId)).unique();
        return {
          clippingId: c._id,
          type: c.type as string,
          people: (c.people ?? []) as string[],
          humanStoryScore: c.humanStoryScore as number,
          text: (c.cleanedText ?? c.rawText) as string,
          iiifBase: (page?.iiifBase ?? "") as string,
          box: c.box,
        };
      }),
    );
  },
});

export const setEditorStatus = mutation({
  args: { secret: v.string(), clippingId: v.id("clippings"), editorStatus: v.union(v.literal("pass"), v.literal("fail")) },
  handler: async (ctx, { secret, clippingId, editorStatus }) => {
    requireSecret(secret);
    await ctx.db.patch(clippingId, { editorStatus });
  },
});
