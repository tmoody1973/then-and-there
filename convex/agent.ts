import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import type { GenericDatabaseReader } from "convex/server";
import { v } from "convex/values";
import { KEY_PATTERN } from "../lib/agent/key";
import { normalizePlace } from "../lib/agent/places";
import { requireSecret } from "./auth";
import { activityFields, noteFields } from "./schema";

const MAX_FOLLOWS = 20;
const MIN_LEN = 2;
const MAX_LEN = 60;
const ACTIVITY_SHOWN = 50;

// The browser key is the reader's credential; a malformed one is refused before anything is read.
function requireKey(key: string): void {
  if (!KEY_PATTERN.test(key)) throw new Error("bad key");
}

type Db = GenericDatabaseReader<any>;
const followsOf = (db: Db, owner: string) => db.query("follows").withIndex("by_owner", (i) => i.eq("owner", owner)).collect();

export const follow = mutation({
  args: { key: v.string(), kind: v.union(v.literal("name"), v.literal("place")), value: v.string() },
  handler: async (ctx, { key, kind, value }) => {
    requireKey(key);
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (trimmed.length < MIN_LEN || trimmed.length > MAX_LEN) throw new Error(`a follow is ${MIN_LEN} to ${MAX_LEN} characters`);
    const stored = kind === "place" ? normalizePlace(trimmed) : trimmed;
    if (stored === null) throw new Error("unknown place: follow a Midwest state, Milwaukee, Chicago or Detroit");
    const mine = await followsOf(ctx.db, key);
    const same = mine.find((f) => f.kind === kind && f.value.toLowerCase() === stored.toLowerCase());
    if (same) return same._id;
    if (mine.length >= MAX_FOLLOWS) throw new Error(`you can follow up to ${MAX_FOLLOWS} names and places`);
    return ctx.db.insert("follows", { owner: key, kind, value: stored, createdAt: Date.now() });
  },
});

export const unfollow = mutation({
  args: { key: v.string(), id: v.id("follows") },
  handler: async (ctx, { key, id }) => {
    requireKey(key);
    const row = await ctx.db.get(id);
    if (row && row.owner === key) await ctx.db.delete(id);
  },
});

// "Forget everything": follows, notes and this reader's own activity lines.
export const forgetMe = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    for (const table of ["follows", "notes", "activity"] as const) {
      const rows = await ctx.db.query(table).withIndex("by_owner", (i) => i.eq("owner", key)).collect();
      await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    }
  },
});

export const mine = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireKey(key);
    const follows = await followsOf(ctx.db, key);
    const notes = await ctx.db.query("notes").withIndex("by_owner", (i) => i.eq("owner", key)).order("desc").collect();
    const own = await ctx.db.query("activity").withIndex("by_owner", (i) => i.eq("owner", key)).order("desc").take(ACTIVITY_SHOWN);
    const shared = await ctx.db.query("activity").withIndex("by_owner", (i) => i.eq("owner", undefined)).order("desc").take(ACTIVITY_SHOWN);
    return {
      follows: follows.map((f) => ({ id: f._id as string, kind: f.kind as string, value: f.value as string })),
      notes: notes.map(({ owner: _o, ...n }) => n),
      activity: [...own, ...shared]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, ACTIVITY_SHOWN)
        .map((a) => ({ line: a.line as string, replay: a.replay as boolean, createdAt: a.createdAt as number })),
    };
  },
});

// ---- Nightly job only (shared secret) ----

export const allFollows = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    const rows = await ctx.db.query("follows").collect();
    return rows.map((f) => ({ id: f._id as string, owner: f.owner as string, kind: f.kind as "name" | "place", value: f.value as string }));
  },
});

// Never the same clipping twice for one reader. Returns false when it's a repeat.
export const addNote = mutation({
  args: { secret: v.string(), note: v.object(noteFields) },
  handler: async (ctx, { secret, note }) => {
    requireSecret(secret);
    // A reader has few notes: look up by owner, match the clipping in code (chained index eq doesn't typecheck with generic builders).
    const dup = (await ctx.db.query("notes").withIndex("by_owner", (i) => i.eq("owner", note.owner)).collect()).find(
      (n) => n.clippingId === note.clippingId,
    );
    if (dup) return false;
    await ctx.db.insert("notes", note);
    return true;
  },
});

export const log = mutation({
  args: { secret: v.string(), rows: v.array(v.object(activityFields)) },
  handler: async (ctx, { secret, rows }) => {
    requireSecret(secret);
    await Promise.all(rows.map((r) => ctx.db.insert("activity", r)));
  },
});

export const getState = query({
  args: { secret: v.string(), key: v.string() },
  handler: async (ctx, { secret, key }) => {
    requireSecret(secret);
    const row = await ctx.db.query("agentState").withIndex("by_key", (i) => i.eq("key", key)).unique();
    return (row?.value as string | undefined) ?? null;
  },
});

export const setState = mutation({
  args: { secret: v.string(), key: v.string(), value: v.string() },
  handler: async (ctx, { secret, key, value }) => {
    requireSecret(secret);
    const row = await ctx.db.query("agentState").withIndex("by_key", (i) => i.eq("key", key)).unique();
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("agentState", { key, value });
  },
});
