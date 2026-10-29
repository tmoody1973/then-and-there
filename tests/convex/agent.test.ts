// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.*s");
const api = anyApi;
const SECRET = "test-secret";
process.env.CONVEX_WRITE_SECRET = SECRET;
const KEY = "0123456789abcdef0123456789abcdef";
const OTHER = "fedcba9876543210fedcba9876543210";
const MAX_TOTAL_FOLLOWS = 1000;
const CLIP = { clippingId: "c1", pageId: "p1", iiifBase: "https://iiif/x", box: { x: 0, y: 0, w: 10, h: 10 }, paper: "Paper", date: "1898-12-09", citationMla: "mla", excerpt: "Mr. Ellmore" };
const note = (owner: string, clippingId = "c1") => ({ owner, clippingId, clip: { ...CLIP, clippingId }, matched: "Ellmore", replay: false, createdAt: 1 });

type Mine = { follows: Array<{ id: string; kind: string; value: string }>; notes: Array<{ clippingId: string }>; activity: Array<{ line: string }> };
const mine = (t: ReturnType<typeof convexTest>, key = KEY) => t.query(api.agent.mine, { key }) as Promise<Mine>;

describe("agent memory", () => {
  test("a malformed key is refused", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.agent.follow, { key: "short", kind: "name", value: "Ellmore" })).rejects.toThrow(/bad key/);
    await expect(t.query(api.agent.mine, { key: "ZZZZ456789abcdef0123456789abcdef" })).rejects.toThrow(/bad key/);
  });

  test("follow trims, rejects values under 2 or over 60 characters, and caps a key at 20 follows", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "  J. E. Ellmore  " });
    expect((await mine(t)).follows.map((f) => f.value)).toEqual(["J. E. Ellmore"]);
    await expect(t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "x" })).rejects.toThrow(/2 to 60/);
    await expect(t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "y".repeat(61) })).rejects.toThrow(/2 to 60/);
    for (let i = 0; i < 19; i += 1) await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: `Name ${i}` });
    await expect(t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "One too many" })).rejects.toThrow(/20/);
  });

  test("following the same thing twice keeps one follow", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "Ellmore" });
    await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "ellmore" });
    expect((await mine(t)).follows).toHaveLength(1);
  });

  test("a place follow must be a known place", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agent.follow, { key: KEY, kind: "place", value: "Milwaukee" });
    expect((await mine(t)).follows[0]).toMatchObject({ kind: "place", value: "milwaukee" });
    await expect(t.mutation(api.agent.follow, { key: KEY, kind: "place", value: "Atlantis" })).rejects.toThrow(/place/);
  });

  test("mine returns only that key's follows and notes", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "Ellmore" });
    await t.mutation(api.agent.follow, { key: OTHER, kind: "name", value: "Fenwick" });
    await t.mutation(api.agent.addNote, { secret: SECRET, note: note(OTHER) });
    const m = await mine(t);
    expect(m.follows.map((f) => f.value)).toEqual(["Ellmore"]);
    expect(m.notes).toEqual([]);
  });

  test("unfollow only removes the caller's own follow", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "Ellmore" });
    const id = (await mine(t)).follows[0].id;
    await t.mutation(api.agent.unfollow, { key: OTHER, id });
    expect((await mine(t)).follows).toHaveLength(1);
    await t.mutation(api.agent.unfollow, { key: KEY, id });
    expect((await mine(t)).follows).toHaveLength(0);
  });

  test("forgetMe deletes follows, notes and own activity, leaving shared lines", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "Ellmore" });
    await t.mutation(api.agent.addNote, { secret: SECRET, note: note(KEY) });
    await t.mutation(api.agent.log, { secret: SECRET, rows: [{ owner: KEY, runId: "r1", line: "Sent 1 note.", replay: false, createdAt: 2 }, { runId: "r1", line: "Checked 1 new batch.", replay: false, createdAt: 1 }] });
    expect((await mine(t)).activity.map((a) => a.line)).toEqual(["Sent 1 note.", "Checked 1 new batch."]);
    await t.mutation(api.agent.forgetMe, { key: KEY });
    const m = await mine(t);
    expect(m.follows).toEqual([]);
    expect(m.notes).toEqual([]);
    expect(m.activity.map((a) => a.line)).toEqual(["Checked 1 new batch."]);
  });

  test("addNote refuses a duplicate clipping for the same key", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(api.agent.addNote, { secret: SECRET, note: note(KEY) })).toBe(true);
    expect(await t.mutation(api.agent.addNote, { secret: SECRET, note: note(KEY) })).toBe(false);
    expect(await t.mutation(api.agent.addNote, { secret: SECRET, note: note(OTHER) })).toBe(true);
    expect((await mine(t)).notes).toHaveLength(1);
  });

  test("secret-gated agent functions refuse without the secret", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.agent.allFollows, { secret: "x", cursor: null })).rejects.toThrow(/not allowed/);
    await expect(t.mutation(api.agent.addNote, { secret: "x", note: note(KEY) })).rejects.toThrow(/not allowed/);
    await expect(t.mutation(api.agent.log, { secret: "x", rows: [] })).rejects.toThrow(/not allowed/);
    await expect(t.mutation(api.agent.setState, { secret: "x", key: "batches", value: "[]" })).rejects.toThrow(/not allowed/);
    await expect(t.query(api.agent.getState, { secret: "x", key: "batches" })).rejects.toThrow(/not allowed/);
  });

  test("state round-trips and allFollows lists every key's follows", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agent.setState, { secret: SECRET, key: "batches", value: '["a"]' });
    await t.mutation(api.agent.setState, { secret: SECRET, key: "batches", value: '["a","b"]' });
    expect(await t.query(api.agent.getState, { secret: SECRET, key: "batches" })).toBe('["a","b"]');
    expect(await t.query(api.agent.getState, { secret: SECRET, key: "missing" })).toBeNull();
    await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "Ellmore" });
    await t.mutation(api.agent.follow, { key: OTHER, kind: "place", value: "Detroit" });
    const all = ((await t.query(api.agent.allFollows, { secret: SECRET, cursor: null })) as { page: Array<{ owner: string; value: string }> }).page;
    expect(all.map((f) => `${f.owner.slice(0, 4)}:${f.value}`).sort()).toEqual(["0123:Ellmore", "fedc:detroit"]);
  });

  test("follows are capped across all readers, and the count tracks adds and removals (review #4)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "Ellmore" });
    await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "Fenwick" });
    expect(await t.query(api.agent.getState, { secret: SECRET, key: "follows:count" })).toBe("2");
    await t.mutation(api.agent.unfollow, { key: KEY, id: (await mine(t)).follows[0].id });
    expect(await t.query(api.agent.getState, { secret: SECRET, key: "follows:count" })).toBe("1");
    await t.mutation(api.agent.forgetMe, { key: KEY });
    expect(await t.query(api.agent.getState, { secret: SECRET, key: "follows:count" })).toBe("0");
    await t.mutation(api.agent.setState, { secret: SECRET, key: "follows:count", value: String(MAX_TOTAL_FOLLOWS) });
    await expect(t.mutation(api.agent.follow, { key: OTHER, kind: "name", value: "Bass" })).rejects.toThrow(/full/);
  });

  test("allFollows pages through every follow for the nightly job (review #4)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agent.follow, { key: KEY, kind: "name", value: "Ellmore" });
    await t.mutation(api.agent.follow, { key: OTHER, kind: "name", value: "Fenwick" });
    const first = (await t.query(api.agent.allFollows, { secret: SECRET, cursor: null })) as { page: unknown[]; isDone: boolean; continueCursor: string };
    expect(first.page).toHaveLength(2);
    expect(first.isDone).toBe(true);
  });
});

