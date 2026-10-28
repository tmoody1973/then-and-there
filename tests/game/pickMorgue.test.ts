import { describe, expect, test } from "vitest";
import type { MeanwhileCandidate } from "../../lib/game/pickMeanwhile";
import { pickMorgue } from "../../lib/game/pickMorgue";

const c = (id: string, date: string, text: string, extra: Partial<MeanwhileCandidate> = {}): MeanwhileCandidate => ({
  clippingId: id, pageId: `p-${id}`, iiifBase: "https://iiif/x", box: { x: 0, y: 0, w: 1, h: 1 }, paper: "Paper", date,
  citationMla: "MLA", text, state: "ohio", type: "event", humanStoryScore: 0.5, hardHistory: false, status: "classified", ...extra,
});
const opts = { date1889: "1889-12-13", terms: ["Hong Kong", "Colombo", "Oriental"], excludeIds: ["clue"] };

describe("pickMorgue", () => {
  test("never uses a clipping printed after the day (no hindsight)", () => {
    expect(pickMorgue([c("late", "1889-12-14", "reached Hong Kong")], opts)).toEqual([]);
  });
  test("excludes the day's own clue", () => {
    expect(pickMorgue([c("clue", "1889-12-13", "bound for Hong Kong")], opts)).toEqual([]);
  });
  test("excludes flagged hard history and unclassified clippings", () => {
    expect(pickMorgue([c("h", "1889-12-01", "Colombo", { hardHistory: true }), c("f", "1889-12-01", "Colombo", { status: "failed" })], opts)).toEqual([]);
  });
  test("ranks by distinct terms matched, then the most recent", () => {
    const out = pickMorgue([
      c("one-old", "1889-11-20", "Colombo"),
      c("two", "1889-11-15", "from Colombo to Hong Kong"),
      c("one-new", "1889-12-10", "Hong Kong"),
    ], opts);
    expect(out.map((x) => x.clippingId)).toEqual(["two", "one-new", "one-old"]);
  });
  test("one clipping per page, at most three", () => {
    const out = pickMorgue([
      c("a", "1889-12-01", "Hong Kong", { pageId: "same" }), c("b", "1889-12-02", "Hong Kong", { pageId: "same" }),
      c("c", "1889-12-03", "Colombo"), c("d", "1889-12-04", "Colombo"), c("e", "1889-12-05", "Oriental"),
    ], opts);
    expect(out).toHaveLength(3);
    expect(new Set(out.map((x) => x.pageId)).size).toBe(3);
  });
  test("matches terms case-insensitively as whole words", () => {
    expect(pickMorgue([c("x", "1889-12-01", "the HONG KONG steamer"), c("y", "1889-12-01", "Hongkonger")], opts).map((x) => x.clippingId)).toEqual(["x"]);
  });
});
