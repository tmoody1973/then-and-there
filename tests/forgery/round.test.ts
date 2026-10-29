import { describe, expect, test } from "vitest";
import { pickAd, pickParts, PLANTS, toneMatch } from "../../lib/forgery/round";

const page = { width: 6000, height: 9000 };
const clip = (id: string, x: number, y: number, w: number, h: number, extra: Partial<{ type: string; segLabel: string; text: string; hardHistory: boolean }> = {}) => ({
  id,
  box: { x, y, w, h },
  type: "story",
  segLabel: "article",
  text: "A long enough paragraph of real newspaper text to count as a clipping on the page.",
  hardHistory: false,
  ...extra,
});

describe("pickAd", () => {
  test("takes a mid-sized ad: big enough to read, small enough to hide in", () => {
    const tiny = clip("tiny", 0, 0, 300, 300, { type: "ad" });
    const huge = clip("huge", 0, 0, 3000, 4000, { type: "ad" });
    const good = clip("good", 4000, 6000, 800, 1300, { type: "ad" });
    const story = clip("story", 0, 0, 800, 1300);
    expect(pickAd([tiny, huge, story, good], page)?.id).toBe("good");
  });

  test("never forges anything carrying a hard-history note", () => {
    expect(pickAd([clip("h", 4000, 6000, 800, 1300, { type: "ad", hardHistory: true })], page)).toBeNull();
  });
});

describe("pickParts", () => {
  const ad = clip("ad", 4000, 6000, 800, 1300, { type: "ad" });
  const others = [clip("a", 200, 1500, 1500, 2000), clip("b", 2000, 1500, 1200, 1500), clip("c", 200, 6000, 1400, 1800), clip("d", 3000, 4000, 900, 1000)];
  const parts = pickParts([ad, ...others], page, "ad");

  test("five parts: the masthead, the forged ad and three decoys", () => {
    expect(parts).toHaveLength(5);
    expect(parts.filter((p) => p.forged)).toHaveLength(1);
    expect(parts[0].id).toBe("masthead");
  });

  test("numbered 1 to 5 in reading order, top to bottom", () => {
    expect(parts.map((p) => p.n)).toEqual([1, 2, 3, 4, 5]);
    const ys = parts.map((p) => p.box.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  test("decoys never overlap the forged ad", () => {
    const overlapping = clip("x", 4100, 6100, 500, 500);
    const ids = pickParts([ad, overlapping, ...others], page, "ad").map((p) => p.id);
    expect(ids).not.toContain("x");
  });
});

test("toneMatch maps the edit's brightness and contrast onto the scan's", () => {
  const { a, b } = toneMatch({ mean: 180, sd: 40 }, { mean: 230, sd: 60 });
  expect(230 * a + b).toBeCloseTo(180);
  expect(60 * a).toBeCloseTo(40);
});

test("every planted product says how a reader could have known", () => {
  for (const p of PLANTS) {
    expect(p.prompt.length).toBeGreaterThan(40);
    expect(p.why.length).toBeGreaterThan(30);
  }
});
