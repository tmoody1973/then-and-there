import { describe, expect, test } from "vitest";
import { pickMeanwhile, type MeanwhileCandidate } from "../../lib/game/pickMeanwhile";

const c = (id: string, state: string, date: string, score: number, extra: Partial<MeanwhileCandidate> = {}): MeanwhileCandidate => ({
  clippingId: id, pageId: `p-${id}`, iiifBase: "https://iiif/x", box: { x: 0, y: 0, w: 1, h: 1 }, paper: "Paper",
  date, citationMla: "MLA", text: `story ${id}`, state, type: "person", humanStoryScore: score, hardHistory: false,
  status: "classified", ...extra,
});

describe("pickMeanwhile", () => {
  test("skips hard history", () => {
    const rows = pickMeanwhile([c("a", "wisconsin", "1889-11-29", 0.9, { hardHistory: true }), c("b", "wisconsin", "1889-11-29", 0.7)], "1889-11-29");
    expect(rows.find((r) => r.scope === "wisconsin")?.clip.clippingId).toBe("b");
  });

  test("ignores ads and unclassified clippings", () => {
    const rows = pickMeanwhile([c("a", "ohio", "1889-11-29", 0.9, { type: "ad" }), c("b", "ohio", "1889-11-29", 0.9, { status: "failed" })], "1889-11-29");
    expect(rows).toEqual([]);
  });

  test("falls back up to 3 days earlier, preferring the closest date", () => {
    const rows = pickMeanwhile([c("old", "kansas", "1889-11-26", 0.9), c("near", "kansas", "1889-11-27", 0.5)], "1889-11-29");
    expect(rows.find((r) => r.scope === "kansas")?.clip.clippingId).toBe("near");
  });

  test("shows the English translation of a foreign-language story", () => {
    const rows = pickMeanwhile([c("de", "minnesota", "1889-11-29", 0.9, { language: "german", translation: "The bishop plans a German church." })], "1889-11-29");
    expect(rows[0].clip.excerpt).toContain("The bishop plans");
    expect(rows[0].clip.translatedFrom).toBe("german");
  });

  test("returns nothing beyond 3 days", () => {
    expect(pickMeanwhile([c("a", "iowa", "1889-11-25", 0.9)], "1889-11-29")).toEqual([]);
  });

  test("adds a midwest pick from the best of all states", () => {
    const rows = pickMeanwhile([c("a", "iowa", "1889-11-29", 0.6), c("b", "ohio", "1889-11-29", 0.8)], "1889-11-29");
    expect(rows.find((r) => r.scope === "midwest")?.clip.clippingId).toBe("b");
  });
});
