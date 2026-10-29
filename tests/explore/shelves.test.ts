import { describe, expect, test } from "vitest";
import { buildShelf, SHELVES } from "../../lib/explore/shelves";

type C = Parameters<typeof buildShelf>[1][number];
const c = (id: string, o: Partial<C> = {}): C => ({
  clippingId: id, pageId: `p-${id}`, iiifBase: "https://iiif/x", box: { x: 0, y: 0, w: 1, h: 1 }, paper: "Paper", city: "milwaukee", state: "wisconsin",
  date: "1898-12-09", sequence: 2, language: ["english"], lccn: "sn84025861", type: "person", people: [], textKind: "repaired", text: `story ${id}`,
  editorStatus: "unchecked", hardHistory: false, humanStoryScore: 0.5, citeThis: { apa: "a", chicago: "c", mla: "m" }, ...o,
});
const shelf = (slug: string) => SHELVES.find((s) => s.slug === slug)!;

describe("shelves", () => {
  test("a shelf puts Editor-verified stories first, then stronger stories, at most 6", () => {
    const cards = buildShelf(shelf("black-press"), [
      c("weak", { humanStoryScore: 0.4 }), c("verified", { editorStatus: "pass", humanStoryScore: 0.3 }),
      ...Array.from({ length: 8 }, (_, i) => c(`x${i}`, { humanStoryScore: 0.6 })),
    ]);
    expect(cards).toHaveLength(6);
    expect(cards[0].clippingId).toBe("verified");
    expect(cards.map((x) => x.clippingId)).not.toContain("weak");
  });

  test("shelves leave out hard history and ads (search still finds them, with the note)", () => {
    const cards = buildShelf(shelf("black-press"), [c("hh", { hardHistory: true }), c("ad", { type: "ad" }), c("ok")]);
    expect(cards.map((x) => x.clippingId)).toEqual(["ok"]);
  });

  test("each shelf selects its own pages", () => {
    const pool = [
      c("advocate"),
      c("german", { lccn: "sn-german", language: ["german"] }),
      c("front1889", { lccn: "sn-x", city: "new york", state: "new york", date: "1889-11-20", sequence: 1 }),
      c("bly", { lccn: "sn-y", city: "pittsburgh", state: "pennsylvania", date: "1889-12-01", text: "Nellie Bly reached Ceylon" }),
    ];
    expect(buildShelf(shelf("black-press"), pool).map((x) => x.clippingId)).toEqual(["advocate"]);
    expect(buildShelf(shelf("german-milwaukee"), pool).map((x) => x.clippingId)).toEqual(["german"]);
    expect(buildShelf(shelf("front-1889"), pool).map((x) => x.clippingId)).toEqual(["front1889"]);
    expect(buildShelf(shelf("bly-race"), pool).map((x) => x.clippingId)).toEqual(["bly"]);
  });
});
