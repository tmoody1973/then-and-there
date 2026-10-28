import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Box } from "../../lib/segment/segmentPage";
import type { CachedPage } from "../../worker/fetch";
import { processPage, type ClippingRow, type PageRow } from "../../worker/process";

const altoXml = readFileSync("tests/fixtures/alto-advocate-1898-12-09-p6.xml", "utf8");
const PAGE: CachedPage = {
  pageId: "http://www.loc.gov/resource/sn84025861/1898-12-09/ed-1/?sp=6",
  lccn: "sn84025861",
  title: "the wisconsin weekly advocate",
  city: "milwaukee",
  state: "wisconsin",
  date: "1898-12-09",
  sequence: 6,
  language: ["english"],
  iiifBase: "https://tile.loc.gov/image-services/iiif/x",
  altoUrl: "https://tile.loc.gov/storage-services/x.xml",
  imageWidth: 5808,
  imageHeight: 8087,
  citeThis: { apa: "a", chicago: "c", mla: "m" },
  status: "fetched",
};
const MARRIAGE: Box = { label: "article", x: 1320, y: 6930, w: 880, h: 560, score: 0.8, source: "sam" };
const PHOTO: Box = { label: "photograph", x: 0, y: 0, w: 100, h: 100, score: 0.9, source: "sam" };
const CLASS = { type: "event" as const, people: ["Nicholas Swadley"], places: ["Poysippi"], humanStoryScore: 0.7, hardHistory: false };

function deps(boxes: Box[] | Error, opts: { shouldClean?: boolean; classifyFailsFor?: number } = {}) {
  const stored: { page?: PageRow; rows?: ClippingRow[] } = {};
  let classifyCalls = 0;
  let cleanCalls = 0;
  return {
    stored,
    counts: () => ({ classifyCalls, cleanCalls }),
    d: {
      altoXml,
      shouldClean: () => opts.shouldClean ?? false,
      segment: async () => {
        if (boxes instanceof Error) throw boxes;
        return boxes;
      },
      clean: async () => {
        cleanCalls += 1;
        return { cleanedText: "cleaned", language: "english" };
      },
      classify: async () => {
        classifyCalls += 1;
        return classifyCalls === opts.classifyFailsFor ? { ok: false as const, error: "bad" } : { ok: true as const, value: CLASS };
      },
      store: {
        upsertPage: async (p: PageRow) => {
          stored.page = p;
        },
        replaceClippings: async (_id: string, rows: ClippingRow[]) => {
          stored.rows = rows;
        },
      },
    },
  };
}

describe("processPage", () => {
  test("stores one clipping per box with raw text and metrics", async () => {
    const { d, stored } = deps([MARRIAGE, { ...MARRIAGE, y: 100 }]);
    const res = await processPage(PAGE, d);
    expect(res.clippings).toBe(2);
    expect(stored.rows).toHaveLength(2);
    expect(stored.rows![0].rawText).toContain("Nicholas Swadley");
    expect(stored.rows![0].meanWc).toBeGreaterThan(0);
    expect(stored.page).toMatchObject({ status: "processed", altoScale: 3 });
  });

  test("skips cleanup when text is good, then classifies", async () => {
    const { d, stored, counts } = deps([MARRIAGE], { shouldClean: false });
    await processPage(PAGE, d);
    expect(counts().cleanCalls).toBe(0);
    expect(stored.rows![0]).toMatchObject({ status: "classified", type: "event", humanStoryScore: 0.7 });
  });

  test("cleans when needed and classifies the cleaned text", async () => {
    const { d, stored, counts } = deps([MARRIAGE], { shouldClean: true });
    await processPage(PAGE, d);
    expect(counts().cleanCalls).toBe(1);
    expect(stored.rows![0]).toMatchObject({ cleanedText: "cleaned", status: "classified" });
  });

  test("photographs are not classified for text", async () => {
    const { d, counts, stored } = deps([PHOTO]);
    await processPage(PAGE, d);
    expect(counts().classifyCalls).toBe(0);
    expect(stored.rows![0].status).toBe("raw");
  });

  test("one failing clipping doesn't fail the page", async () => {
    const { d, stored } = deps([MARRIAGE, { ...MARRIAGE, y: 100 }, { ...MARRIAGE, y: 3000 }], { classifyFailsFor: 2 });
    const res = await processPage(PAGE, d);
    expect(stored.page?.status).toBe("processed");
    expect(stored.rows!.map((r) => r.status)).toEqual(["classified", "failed", "classified"]);
    expect(res.failed).toBe(1);
  });

  test("segmentation failure marks the page failed and stores no clippings", async () => {
    const { d, stored } = deps(new Error("layout model returned no JSON array"));
    await processPage(PAGE, d);
    expect(stored.page).toMatchObject({ status: "failed", error: "layout model returned no JSON array" });
    expect(stored.rows).toBeUndefined();
  });
});
