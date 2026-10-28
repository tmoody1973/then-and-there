import { mutationGeneric as mutation } from "convex/server";
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
