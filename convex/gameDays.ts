import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import { gameDayFields } from "./schema";

export const upsert = mutation({
  args: { row: v.object(gameDayFields) },
  handler: async (ctx, { row }) => {
    const existing = await ctx.db
      .query("gameDays")
      .withIndex("by_day", (q) => q.eq("day", row.day))
      .unique();
    if (existing) {
      await ctx.db.replace(existing._id, row);
      return existing._id;
    }
    return ctx.db.insert("gameDays", row);
  },
});

// The day list never carries clues or answers, so locked days can't leak through it.
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("gameDays").withIndex("by_day").collect();
    return rows
      .filter((r) => r.status === "published")
      .map((r) => ({ day: r.day as number, date1889: r.date1889 as string, title: r.title as string }));
  },
});

// Only Editor-approved days are ever served.
export const getPublished = query({
  args: { day: v.number() },
  handler: async (ctx, { day }) => {
    const row = await ctx.db
      .query("gameDays")
      .withIndex("by_day", (q) => q.eq("day", day))
      .unique();
    return row && row.status === "published" ? row : null;
  },
});
