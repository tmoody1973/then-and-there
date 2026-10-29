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

const clip = {
  clippingId: "c1",
  pageId: "p1",
  iiifBase: "https://iiif/x",
  box: { x: 0, y: 0, w: 10, h: 10 },
  paper: "The Evening World",
  date: "1889-11-29",
  citationMla: "MLA",
  excerpt: "A FREE TRIP TO EUROPE",
};
const day = (n: number, status: "draft" | "published" | "rejected") => ({
  day: n,
  date1889: "1889-11-29",
  title: `Day ${n}`,
  clue: clip,
  question: { kind: "choice" as const, prompt: "Will she make it?", options: ["Yes", "No"], answerIndex: 0 },
  hints: ["Which steamer?"],
  reveal: { ...clip, explanation: "Because." },
  status,
  rejectReasons: [],
});

describe("gameDays", () => {
  test("getPublished returns null for a draft", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.gameDays.upsert, { secret: SECRET, row: day(16, "draft") });
    expect(await t.query(api.gameDays.getPublished, { day: 16 })).toBeNull();
  });

  test("listPublished omits drafts and rejected days", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.gameDays.upsert, { secret: SECRET, row: day(1, "published") });
    await t.mutation(api.gameDays.upsert, { secret: SECRET, row: day(2, "draft") });
    await t.mutation(api.gameDays.upsert, { secret: SECRET, row: day(3, "rejected") });
    const rows = await t.query(api.gameDays.listPublished, {});
    expect(rows.map((r: { day: number }) => r.day)).toEqual([1]);
  });

  test("listPublished rows carry no question or clue fields", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.gameDays.upsert, { secret: SECRET, row: day(1, "published") });
    const [row] = await t.query(api.gameDays.listPublished, {});
    expect(Object.keys(row).sort()).toEqual(["date1889", "day", "title"]);
  });

  test("upsert replaces by day", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.gameDays.upsert, { secret: SECRET, row: day(1, "draft") });
    await t.mutation(api.gameDays.upsert, { secret: SECRET, row: day(1, "published") });
    expect((await t.query(api.gameDays.getPublished, { day: 1 }))?.status).toBe("published");
  });
});

describe("meanwhile", () => {
  const row = (scope: string) => ({ date1889: "1889-11-29", scope, clip, humanStoryScore: 0.8 });

  test("falls back to midwest", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.meanwhile.replaceForDate, { secret: SECRET, date1889: "1889-11-29", rows: [row("midwest")] });
    const got = await t.query(api.meanwhile.forDay, { date1889: "1889-11-29", state: "wisconsin" });
    expect(got).toMatchObject({ scope: "midwest", fellBackFrom: "wisconsin" });
  });

  test("prefers the state row", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.meanwhile.replaceForDate, { secret: SECRET, date1889: "1889-11-29", rows: [row("midwest"), row("wisconsin")] });
    const got = await t.query(api.meanwhile.forDay, { date1889: "1889-11-29", state: "wisconsin" });
    expect(got?.scope).toBe("wisconsin");
    expect(got?.fellBackFrom).toBeUndefined();
  });

  test("forDay skips excluded ids and falls back city → state → Midwest → national", async () => {
    const t = convexTest(schema, modules);
    const r = (scope: string, id: string, score: number) => ({ date1889: "1889-11-29", scope, clip: { ...clip, clippingId: id }, humanStoryScore: score });
    await t.mutation(api.meanwhile.replaceForDate, {
      secret: SECRET,
      date1889: "1889-11-29",
      rows: [r("milwaukee", "m1", 0.9), r("wisconsin", "w1", 0.8), r("wisconsin", "w2", 0.7), r("midwest", "mw", 0.6), r("national", "n1", 0.95)],
    });
    const get = (args: Record<string, unknown>) => t.query(api.meanwhile.forDay, { date1889: "1889-11-29", state: "wisconsin", ...args }) as Promise<{ clip: { clippingId: string }; scope: string; fellBackFrom?: string } | null>;
    expect(await get({ city: "milwaukee" })).toMatchObject({ scope: "milwaukee", clip: { clippingId: "m1" } });
    expect(await get({ city: "milwaukee", exclude: ["m1"] })).toMatchObject({ scope: "wisconsin", clip: { clippingId: "w1" }, fellBackFrom: "milwaukee" });
    expect(await get({ exclude: ["w1"] })).toMatchObject({ clip: { clippingId: "w2" } });
    expect(await get({ exclude: ["w1", "w2", "mw"] })).toMatchObject({ scope: "national", fellBackFrom: "wisconsin" });
    expect(await get({ exclude: ["w1", "w2", "mw", "n1"] })).toBeNull();
  });

  test("returns null when nothing exists for the date", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.meanwhile.forDay, { date1889: "1889-12-01", state: "ohio" })).toBeNull();
  });

  test("game writes are refused without the secret", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.gameDays.upsert, { secret: "wrong", row: day(1, "published") })).rejects.toThrow(/not allowed/);
    await expect(t.mutation(api.meanwhile.replaceForDate, { secret: "wrong", date1889: "1889-11-29", rows: [] })).rejects.toThrow(/not allowed/);
    expect(await t.query(api.gameDays.listPublished, {})).toEqual([]);
  });
});
