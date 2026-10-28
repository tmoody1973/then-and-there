import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import { clippingFields } from "./schema";

export const replaceForPage = mutation({
  args: { pageId: v.string(), clippings: v.array(v.object(clippingFields)) },
  handler: async (ctx, { pageId, clippings }) => {
    const old = await ctx.db
      .query("clippings")
      .withIndex("by_pageId", (q) => q.eq("pageId", pageId))
      .collect();
    await Promise.all(old.map((c) => ctx.db.delete(c._id)));
    return Promise.all(clippings.map((c) => ctx.db.insert("clippings", c)));
  },
});

export const patch = mutation({
  args: { id: v.id("clippings"), fields: v.object(Object.fromEntries(Object.entries(clippingFields).map(([k, val]) => [k, v.optional(val)]))) },
  handler: async (ctx, { id, fields }) => ctx.db.patch(id, fields),
});

export const byPage = query({
  args: { pageId: v.string() },
  handler: (ctx, { pageId }) =>
    ctx.db
      .query("clippings")
      .withIndex("by_pageId", (q) => q.eq("pageId", pageId))
      .collect(),
});
