import { describe, expect, test } from "vitest";
import { buildPack, checkQuestions, PACKS } from "../../lib/explore/packs";
import type { ShelfCard } from "../../lib/explore/shelves";

const c = (id: string, o: Partial<ShelfCard> = {}): ShelfCard => ({
  clippingId: id, pageId: `p-${id}`, iiifBase: "https://iiif/x", box: { x: 0, y: 0, w: 1, h: 1 }, paper: "Paper", city: "milwaukee", state: "wisconsin",
  date: "1898-12-09", sequence: 2, language: ["english"], lccn: "sn84025861", type: "person", people: [], textKind: "repaired", text: `story ${id}`,
  editorStatus: "pass", hardHistory: false, humanStoryScore: 0.5, citeThis: { apa: "a", chicago: "c", mla: "<cite>Paper</cite>. mla" }, ...o,
});
const black = PACKS.find((p) => p.slug === "black-press-milwaukee")!;

describe("teacher packs", () => {
  test('a pack holds at most 8 items, all editorStatus "pass"', () => {
    const pack = buildPack(black, [...Array.from({ length: 12 }, (_, i) => c(`v${i}`)), c("unchecked", { editorStatus: "unchecked", humanStoryScore: 0.99 })]);
    expect(pack.items).toHaveLength(8);
    expect(pack.items.map((i) => i.clippingId)).not.toContain("unchecked");
  });

  test("flagged clippings are excluded by default and kept apart for the opt-in", () => {
    const pack = buildPack(black, [c("ok"), c("flagged", { hardHistory: true })]);
    expect(pack.items.map((i) => i.clippingId)).toEqual(["ok"]);
    expect(pack.hardItems.map((i) => i.clippingId)).toEqual(["flagged"]);
  });

  test("a question that fails the Editor twice is dropped", async () => {
    const verdicts: Record<string, boolean> = { "Q1?": true, "Q2?": false, "Q2 again?": false, "Q3?": false, "Q3 again?": true };
    const kept = await checkQuestions(["Q1?", "Q2?", "Q3?"], {
      verify: async (q) => verdicts[q] ?? false,
      replace: async (q) => `${q.slice(0, -1)} again?`,
    });
    expect(kept).toEqual(["Q1?", "Q3 again?"]);
  });
});
