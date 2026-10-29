import { describe, expect, test } from "vitest";
import { bandClear, clueLabel, mastheadBox, orderClues, validatePicks, type RoundClip } from "../../lib/frontpage/round";

const W = 1000, H = 1400;
const clip = (i: number, segLabel: string, extra: Partial<RoundClip> = {}): RoundClip => ({
  clippingId: `c${i}`, segLabel, type: "other", text: `text ${i}`, hardHistory: false, box: { x: 0, y: 200 + i * 10, w: 200, h: 200 }, ...extra,
});
const clips = [clip(0, "advertisement"), clip(1, "article"), clip(2, "article", { type: "notice" }), clip(3, "photograph"), clip(4, "headline"), clip(5, "advertisement")];
const p = (i: number, kind: string) => ({ i, kind, prints: "x", why: "y" }) as const;
const good = { text: [p(0, "ad"), p(1, "weather"), p(2, "prices"), p(4, "headline")], photo: { i: 3, prints: "x", why: "y" } };

describe("front page round", () => {
  test("well-formed picks pass", () => {
    expect(validatePicks(good, clips, W, H)).toEqual([]);
  });

  test("the Game Master picks exactly four text clues from the menu", () => {
    expect(validatePicks({ ...good, text: good.text.slice(0, 3) }, clips, W, H)).toContain("need 4 text clues, got 3");
    expect(validatePicks({ ...good, text: [p(0, "ad"), p(1, "gossip"), p(2, "prices"), p(4, "headline")] }, clips, W, H)).toContain("clue 2: unknown kind gossip");
  });

  test("each kind must sit on the right kind of box", () => {
    expect(validatePicks({ ...good, photo: { i: 1, prints: "x", why: "y" } }, clips, W, H)).toContain("photo: clipping 1 is not a photograph box");
    expect(validatePicks({ ...good, text: [p(0, "ad"), p(1, "weather"), p(2, "prices"), p(5, "headline")] }, clips, W, H)).toContain("headline: clipping 5 is not a headline box");
    expect(validatePicks({ ...good, text: [p(1, "ad"), p(0, "item"), p(2, "prices"), p(4, "headline")] }, clips, W, H)).toContain("ad: clipping 1 is not an advertisement");
    expect(validatePicks({ ...good, text: [p(0, "ad"), p(3, "item"), p(2, "prices"), p(4, "headline")] }, clips, W, H)).toContain("item: clipping 3 is a picture, not text");
  });

  test("picks are distinct, exist, avoid hard history, and stay under a quarter of the page", () => {
    expect(validatePicks({ ...good, text: [p(0, "ad"), p(1, "weather"), p(1, "prices"), p(4, "headline")] }, clips, W, H)).toContain("prices: clipping 1 is already used");
    expect(validatePicks({ ...good, text: [p(0, "ad"), p(9, "weather"), p(2, "prices"), p(4, "headline")] }, clips, W, H)).toContain("weather: no clipping 9");
    const hard = clips.map((c, i) => (i === 1 ? { ...c, hardHistory: true } : c));
    expect(validatePicks(good, hard, W, H)).toContain("weather: clipping 1 carries a content note");
    const big = clips.map((c, i) => (i === 2 ? { ...c, box: { x: 0, y: 0, w: 1000, h: 400 } } : c));
    expect(validatePicks(good, big, W, H)).toContain("prices: clipping 2 covers too much of the page");
  });

  test("the picture is the fourth clue and the masthead always the last", () => {
    expect(orderClues(["a", "b", "c", "d"], "pic", "mast")).toEqual(["a", "b", "c", "pic", "d", "mast"]);
  });

  test("the masthead is the top band of the page", () => {
    expect(mastheadBox(W, H)).toEqual({ x: 0, y: 0, w: 1000, h: 168 });
    expect(mastheadBox(W, H, 0.16)).toEqual({ x: 0, y: 0, w: 1000, h: 224 });
  });

  test("labels name what each clue is; a picture before 1900 is an illustration", () => {
    expect(clueLabel("photo", 1889)).toBe("An illustration");
    expect(clueLabel("photo", 1912)).toBe("A photograph");
    expect(clueLabel("weather", 1912)).toBe("The weather report");
    expect(clueLabel("item", 1912)).toBe("A news item");
    expect(clueLabel("notice", 1912)).toBe("A notice");
  });
});

test("the masthead band is only used when it touches no hard-history clipping", () => {
  const band = mastheadBox(W, H, 0.12);
  expect(bandClear(band, [clip(0, "article", { box: { x: 0, y: 50, w: 200, h: 100 } })])).toBe(true);
  expect(bandClear(band, [clip(0, "article", { hardHistory: true, box: { x: 0, y: 50, w: 200, h: 100 } })])).toBe(false);
  expect(bandClear(band, [clip(0, "article", { hardHistory: true, box: { x: 0, y: 900, w: 200, h: 100 } })])).toBe(true);
});
