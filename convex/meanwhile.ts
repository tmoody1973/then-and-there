import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import { meanwhileFields } from "./schema";

export const replaceForDate = mutation({
  args: { date1889: v.string(), rows: v.array(v.object(meanwhileFields)) },
  handler: async (ctx, { date1889, rows }) => {
    const old = await ctx.db
      .query("meanwhile")
      .withIndex("by_date_scope", (q) => q.eq("date1889", date1889))
      .collect();
    await Promise.all(old.map((r) => ctx.db.delete(r._id)));
    await Promise.all(rows.map((r) => ctx.db.insert("meanwhile", r)));
  },
});

const MIDWEST = "midwest";

// The player's state if a pick exists for that date, otherwise the Midwest pick, labeled as a fallback.
export const forDay = query({
  args: { date1889: v.string(), state: v.string() },
  handler: async (ctx, { date1889, state }) => {
    // At most ~13 rows per date (12 states + Midwest), so match scope in code.
    const rows = await ctx.db
      .query("meanwhile")
      .withIndex("by_date_scope", (q) => q.eq("date1889", date1889))
      .collect();
    const own = rows.find((r) => r.scope === state);
    if (own) return { clip: own.clip, scope: own.scope as string };
    const fallback = rows.find((r) => r.scope === MIDWEST);
    return fallback ? { clip: fallback.clip, scope: MIDWEST, fellBackFrom: state } : null;
  },
});
