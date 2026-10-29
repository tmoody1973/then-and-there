import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import { requireSecret } from "./auth";
import { packFields } from "./schema";

export const list = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("packs").collect()).map((p) => ({ slug: p.slug as string, title: p.title as string, count: (p.items as unknown[]).length })),
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const p = (await ctx.db.query("packs").collect()).find((x) => x.slug === slug);
    if (!p) return null;
    const { _id: _i, _creationTime: _c, ...pack } = p;
    return pack;
  },
});

export const replacePacks = mutation({
  args: { secret: v.string(), packs: v.array(v.object(packFields)) },
  handler: async (ctx, { secret, packs }) => {
    requireSecret(secret);
    for (const old of await ctx.db.query("packs").collect()) await ctx.db.delete(old._id);
    for (const p of packs) await ctx.db.insert("packs", p);
  },
});
