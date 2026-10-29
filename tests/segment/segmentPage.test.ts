import { describe, expect, test } from "vitest";
import { parseSamOutput, segmentPage, splitColumnsAtHeadlines, type Box } from "../../lib/segment/segmentPage";

const PAGE = { pageId: "p1", iiifBase: "https://iiif/x", imageWidth: 5808, imageHeight: 8087 };
const box = (label: Box["label"], x: number, y: number, w: number, h: number): Box => ({
  label, x, y, w, h, score: 1, source: "spark",
});

function deps(opts: { spark?: string; samConcept?: string; samRefine?: (text: string) => string } = {}) {
  const samTexts: string[] = [];
  return {
    samTexts,
    d: {
      image: async (_iiif: string, width: number) => ({ dataUrl: "data:image/jpeg;base64,AA", w: width, h: Math.round((8087 * width) / 5808) }),
      spark: async () => opts.spark ?? "[]",
      sam: async (_img: string, text: string) => {
        samTexts.push(text);
        if (text === "illustration") return opts.samConcept ?? "";
        return opts.samRefine ? opts.samRefine(text) : "";
      },
    },
  };
}

describe("parseSamOutput", () => {
  test("reads the documented record with confidence", () => {
    const out = parseSamOutput(
      "<0f>1<|box;x1=444;y1=625;x2=679;y2=850;w=1800;h=1200;c=0.9609375|><|mask;x=0;y=0;c=0.9609375;data=226,236,!AB|>",
    );
    expect(out).toEqual([{ objectId: 1, x1: 444, y1: 625, x2: 679, y2: 850, w: 1800, h: 1200, c: 0.9609375 }]);
  });

  test("empty output is no records", () => expect(parseSamOutput("")).toEqual([]));
});

describe("splitColumnsAtHeadlines", () => {
  test("cuts an article at each headline top", () => {
    const out = splitColumnsAtHeadlines([
      box("article", 0, 0, 100, 1000),
      box("headline", 0, 300, 100, 40),
      box("headline", 0, 700, 100, 40),
    ]);
    const articles = out.filter((b) => b.label === "article").map((b) => [b.y, b.y + b.h]);
    expect(articles).toEqual([
      [0, 300],
      [300, 700],
      [700, 1000],
    ]);
    expect(out.filter((b) => b.label === "headline")).toHaveLength(2);
  });

  test("leaves articles without headlines alone", () => {
    expect(splitColumnsAtHeadlines([box("article", 0, 0, 100, 500)])).toHaveLength(1);
  });
});

describe("segmentPage", () => {
  test("scales Spark boxes to full resolution", async () => {
    const spark = JSON.stringify([{ object_name: "advertisement", bbox: [{ x_min: 50, y_min: 100, x_max: 150, y_max: 200 }] }]);
    const out = await segmentPage(PAGE, deps({ spark }).d);
    const ad = out.find((b) => b.label === "advertisement")!;
    expect(ad.x).toBeCloseTo(290.4, 1);
    expect(ad.w).toBeCloseTo(580.8, 1);
  });

  test("drops degenerate boxes", async () => {
    const spark = JSON.stringify([{ object_name: "article", bbox: [{ x_min: 50, y_min: 100, x_max: 50, y_max: 200 }] }]);
    expect(await segmentPage(PAGE, deps({ spark }).d)).toEqual([]);
  });

  test("never sends SAM an unordered box when two headlines share a height (live 400: 'box is not ordered')", async () => {
    const spark = JSON.stringify([
      { object_name: "article", bbox: [{ x_min: 200, y_min: 0, x_max: 300, y_max: 500 }] },
      { object_name: "headline", bbox: [{ x_min: 205, y_min: 250, x_max: 295, y_max: 270 }] },
      { object_name: "headline", bbox: [{ x_min: 210, y_min: 250, x_max: 290, y_max: 268 }] },
    ]);
    const { d, samTexts } = deps({ spark });
    await segmentPage(PAGE, d);
    const sent = [...samTexts.slice(1).join("").matchAll(/x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+)/g)].map((m) => m.slice(1).map(Number));
    expect(sent.length).toBe(2);
    for (const [x1, y1, x2, y2] of sent) {
      expect(x2).toBeGreaterThan(x1);
      expect(y2).toBeGreaterThan(y1);
    }
  });

  test("asks SAM for illustrations and refines non-headline boxes", async () => {
    const spark = JSON.stringify([
      { object_name: "advertisement", bbox: [{ x_min: 0, y_min: 0, x_max: 100, y_max: 100 }] },
      { object_name: "article", bbox: [{ x_min: 200, y_min: 0, x_max: 300, y_max: 500 }] },
      { object_name: "headline", bbox: [{ x_min: 600, y_min: 0, x_max: 900, y_max: 50 }] },
    ]);
    const { d, samTexts } = deps({ spark });
    await segmentPage(PAGE, d);
    expect(samTexts[0]).toBe("illustration");
    const refine = samTexts.slice(1).join("");
    expect(refine.startsWith("<0f>")).toBe(true);
    expect((refine.match(/<\|box;/g) ?? []).length).toBe(2);
  });

  test("keeps Spark's box when SAM returns nothing for that id, uses SAM's when it does", async () => {
    const spark = JSON.stringify([
      { object_name: "advertisement", bbox: [{ x_min: 0, y_min: 0, x_max: 100, y_max: 100 }] },
      { object_name: "advertisement", bbox: [{ x_min: 500, y_min: 500, x_max: 600, y_max: 600 }] },
    ]);
    const { d } = deps({
      spark,
      samRefine: () => "<0f>0<|box;x1=10;y1=20;x2=110;y2=120;w=2000;h=2785;c=0.8|><|mask;x=0;y=0;data=1,1,!A|>",
    });
    const ads = (await segmentPage(PAGE, d)).filter((b) => b.label === "advertisement");
    expect(ads[0].source).toBe("sam");
    expect(ads[0].score).toBe(0.8);
    expect(ads[0].x).toBeCloseTo(10 * 2.904, 1);
    expect(ads[1].source).toBe("spark");
  });

  test("SAM illustration replaces an overlapping Spark photograph", async () => {
    const spark = JSON.stringify([{ object_name: "photograph", bbox: [{ x_min: 100, y_min: 100, x_max: 200, y_max: 200 }] }]);
    // Same region in 2000-px coordinates: x 200..400, y ~278..557.
    const samConcept = "<0f>0<|box;x1=200;y1=279;x2=400;y2=557;w=2000;h=2785;c=0.9|><|mask;x=0;y=0;data=1,1,!A|>";
    const photos = (await segmentPage(PAGE, deps({ spark, samConcept }).d)).filter((b) => b.label === "photograph");
    expect(photos).toHaveLength(1);
    expect(photos[0].source).toBe("sam");
  });
});
