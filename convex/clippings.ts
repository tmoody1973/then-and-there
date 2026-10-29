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
