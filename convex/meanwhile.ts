import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import { requireSecret } from "./auth";
import { meanwhileFields } from "./schema";

export const replaceForDate = mutation({
  args: { secret: v.string(), date1889: v.string(), rows: v.array(v.object(meanwhileFields)) },
  handler: async (ctx, { secret, date1889, rows }) => {
    requireSecret(secret);
    const old = await ctx.db
      .query("meanwhile")
      .withIndex("by_date_scope", (q) => q.eq("date1889", date1889))
      .collect();
    await Promise.all(old.map((r) => ctx.db.delete(r._id)));
    await Promise.all(rows.map((r) => ctx.db.insert("meanwhile", r)));
  },
});

const MIDWEST = "midwest";
const NATIONAL = "national";

// The player's state if a pick exists for that date, otherwise the Midwest pick, labeled as a fallback.
const MAX_EXCLUDE = 50;

export const forDay = query({
  args: { date1889: v.string(), state: v.string(), city: v.optional(v.string()), exclude: v.optional(v.array(v.string())) },
  handler: async (ctx, { date1889, state, city, exclude }) => {
    // At most ~13 rows per date (12 states + Midwest), so match scope in code.
    const rows = await ctx.db
      .query("meanwhile")
      .withIndex("by_date_scope", (q) => q.eq("date1889", date1889))
      .collect();
    // Fallback order (spec 6.2): city → state → Midwest → national; skip stories this reader has seen.
    const seen = new Set((exclude ?? []).slice(0, MAX_EXCLUDE));
    const asked = city ?? state;
    for (const scope of [city, state, MIDWEST, NATIONAL].filter((s): s is string => Boolean(s))) {
      const pick = rows
        .filter((r) => r.scope === scope && !seen.has(r.clip.clippingId))
        .sort((a, b) => b.humanStoryScore - a.humanStoryScore)[0];
      if (pick) return scope === asked ? { clip: pick.clip, scope } : { clip: pick.clip, scope, fellBackFrom: asked };
    }
    return null;
  },
});
