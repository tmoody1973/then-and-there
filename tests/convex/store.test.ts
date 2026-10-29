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

const PAGE = {
  pageId: "http://www.loc.gov/resource/sn88064119/1889-11-29/ed-1/?sp=1",
  lccn: "sn88064119",
  title: "homer guardian (homer, la.) 1888-1890",
  city: "homer",
  state: "louisiana",
  date: "1889-11-29",
  sequence: 1,
  language: ["english"],
  iiifBase: "https://tile.loc.gov/image-services/iiif/x",
  altoUrl: "https://tile.loc.gov/storage-services/x.xml",
  imageWidth: 5956,
  imageHeight: 9351,
  altoScale: 3,
  citeThis: { apa: "a", chicago: "c", mla: "m" },
  status: "fetched" as const,
};

const clip = (y: number) => ({
  pageId: PAGE.pageId,
  box: { x: 0, y, w: 100, h: 100 },
  segLabel: "article",
  segSource: "spark" as const,
  rawText: "text",
  meanWc: 0.9,
  nonDictRate: 0.05,
  status: "raw" as const,
  editorStatus: "unchecked" as const,
  promptVersion: "2026-10-28.1",
});

describe("store", () => {
  test("upsert is idempotent", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.pages.upsert, { secret: SECRET, page: PAGE });
    await t.mutation(api.pages.upsert, { secret: SECRET, page: { ...PAGE, status: "processed" } });
    const rows = await t.run((ctx) => ctx.db.query("pages").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("processed");
  });

  test("pageFlagged says whether any clipping on a page carries a content note", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.clippings.replaceForPage, { secret: SECRET, pageId: PAGE.pageId, clippings: [clip(0), clip(1)] });
    expect(await t.query(api.clippings.pageFlagged, { pageId: PAGE.pageId })).toBe(false);
    await t.run(async (ctx) => {
      const [first] = await ctx.db.query("clippings").collect();
      await ctx.db.patch(first._id, { hardHistory: true });
    });
    expect(await t.query(api.clippings.pageFlagged, { pageId: PAGE.pageId })).toBe(true);
    expect(await t.query(api.clippings.pageFlagged, { pageId: "nope" })).toBe(false);
  });

  test("replaceForPage replaces", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.clippings.replaceForPage, { secret: SECRET, pageId: PAGE.pageId, clippings: [clip(0), clip(1), clip(2)] });
    await t.mutation(api.clippings.replaceForPage, { secret: SECRET, pageId: PAGE.pageId, clippings: [clip(5), clip(6)] });
    const rows = await t.query(api.clippings.byPage, { pageId: PAGE.pageId });
    expect(rows.map((r: { box: { y: number } }) => r.box.y).sort()).toEqual([5, 6]);
  });

  test("stats counts", async () => {
    const t = convexTest(schema, modules);
    for (const pass of [true, true, true, false]) {
      await t.mutation(api.editorRuns.log, {
        secret: SECRET,
        run: { subjectKind: "clipping", subjectId: "c1", claim: "x", pass, reason: "r", model: "m", createdAt: 1 },
      });
    }
    expect(await t.query(api.editorRuns.stats, {})).toEqual({ total: 4, passed: 3, failed: 1 });
  });

  test("byDateRange returns pages inside the range only", async () => {
    const t = convexTest(schema, modules);
    for (const date of ["1889-11-13", "1889-11-14", "1890-01-25", "1890-01-26"]) {
      await t.mutation(api.pages.upsert, { secret: SECRET, page: { ...PAGE, pageId: `p-${date}`, date } });
    }
    const rows = await t.query(api.pages.byDateRange, { secret: SECRET, start: "1889-11-14", end: "1890-01-25" });
    expect(rows.map((r: { date: string }) => r.date).sort()).toEqual(["1889-11-14", "1890-01-25"]);
  });

  test("processedIds lists only pages marked processed", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.pages.upsert, { secret: SECRET, page: { ...PAGE, pageId: "a", status: "processed" } });
    await t.mutation(api.pages.upsert, { secret: SECRET, page: { ...PAGE, pageId: "b", status: "failed" } });
    const res = await t.query(api.pages.processedIds, { secret: SECRET, cursor: null });
    expect(res.page).toEqual(["a"]);
    expect(res.isDone).toBe(true);
  });

  test("byPageId returns one page or null", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.pages.upsert, { secret: SECRET, page: { ...PAGE, pageId: "x" } });
    expect((await t.query(api.pages.byPageId, { pageId: "x" }))?.pageId).toBe("x");
    expect(await t.query(api.pages.byPageId, { pageId: "missing" })).toBeNull();
  });

  test("writes and script-only reads are refused without the secret", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.pages.upsert, { secret: "wrong", page: PAGE })).rejects.toThrow(/not allowed/);
    await expect(t.mutation(api.clippings.replaceForPage, { secret: "", pageId: "x", clippings: [] })).rejects.toThrow(/not allowed/);
    await expect(t.mutation(api.editorRuns.log, { secret: "nope", run: { subjectKind: "clue", subjectId: "c", claim: "x", pass: true, reason: "r", model: "m", createdAt: 1 } })).rejects.toThrow(/not allowed/);
    await expect(t.query(api.pages.processedIds, { secret: "x", cursor: null })).rejects.toThrow(/not allowed/);
    expect(await t.run((ctx) => ctx.db.query("pages").collect())).toHaveLength(0);
  });

  test("topForVerify returns unchecked classified clippings, strongest first; setEditorStatus needs the secret", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.pages.upsert, { secret: SECRET, page: PAGE });
    const story = (score: number, editorStatus: "unchecked" | "pass") => ({ ...clip(score), type: "person" as const, humanStoryScore: score, status: "classified" as const, editorStatus });
    await t.mutation(api.clippings.replaceForPage, { secret: SECRET, pageId: PAGE.pageId, clippings: [story(0.4, "unchecked"), story(0.9, "unchecked"), story(0.95, "pass")] });
    const top = (await t.query(api.clippings.topForVerify, { secret: SECRET, limit: 5 })) as Array<{ clippingId: string; humanStoryScore: number; iiifBase: string }>;
    expect(top.map((r) => r.humanStoryScore)).toEqual([0.9, 0.4]);
    expect(top[0].iiifBase).toBe(PAGE.iiifBase);
    await expect(t.mutation(api.clippings.setEditorStatus, { secret: "wrong", clippingId: top[0].clippingId, editorStatus: "pass" })).rejects.toThrow(/not allowed/);
    await t.mutation(api.clippings.setEditorStatus, { secret: SECRET, clippingId: top[0].clippingId, editorStatus: "pass" });
    expect(((await t.query(api.clippings.topForVerify, { secret: SECRET, limit: 5 })) as unknown[]).length).toBe(1);
  });
});
