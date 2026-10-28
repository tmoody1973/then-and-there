import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import { pageFields } from "./schema";

export const upsert = mutation({
  args: { page: v.object(pageFields) },
  handler: async (ctx, { page }) => {
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_pageId", (q) => q.eq("pageId", page.pageId))
      .unique();
    if (existing) {
      await ctx.db.replace(existing._id, page);
      return existing._id;
    }
    return ctx.db.insert("pages", page);
  },
});

// ponytail: full scan; the corpus is a few hundred pages. Add a date index if it grows past ~10k.
export const byDateRange = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const pages = await ctx.db.query("pages").collect();
    return pages.filter((p) => p.date >= start && p.date <= end);
  },
});
