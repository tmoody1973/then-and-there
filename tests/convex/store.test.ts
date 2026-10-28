// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.*s");
const api = anyApi;

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
    await t.mutation(api.pages.upsert, { page: PAGE });
    await t.mutation(api.pages.upsert, { page: { ...PAGE, status: "processed" } });
    const rows = await t.run((ctx) => ctx.db.query("pages").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("processed");
  });

  test("replaceForPage replaces", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.clippings.replaceForPage, { pageId: PAGE.pageId, clippings: [clip(0), clip(1), clip(2)] });
    await t.mutation(api.clippings.replaceForPage, { pageId: PAGE.pageId, clippings: [clip(5), clip(6)] });
    const rows = await t.query(api.clippings.byPage, { pageId: PAGE.pageId });
    expect(rows.map((r: { box: { y: number } }) => r.box.y).sort()).toEqual([5, 6]);
  });

  test("stats counts", async () => {
    const t = convexTest(schema, modules);
    for (const pass of [true, true, true, false]) {
      await t.mutation(api.editorRuns.log, {
        run: { subjectKind: "clipping", subjectId: "c1", claim: "x", pass, reason: "r", model: "m", createdAt: 1 },
      });
    }
    expect(await t.query(api.editorRuns.stats, {})).toEqual({ total: 4, passed: 3, failed: 1 });
  });
});
