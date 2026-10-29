import { describe, expect, test } from "vitest";
import { MAX_CANDIDATE_PAGES, matchName, matchPage, pickCandidates, type Hit } from "../../lib/agent/match";
import type { Follow } from "../../lib/agent/types";

const page = (text: string, o: Partial<{ pageId: string; date: string; state: string; city: string }> = {}) => ({
  pageId: o.pageId ?? "p1", date: o.date ?? "1909-07-01", state: o.state ?? "florida", city: o.city ?? "gainesville", text,
});
const follow = (value: string, kind: "name" | "place" = "name", owner = "k1", id = `f-${value}`): Follow => ({ id, owner, kind, value });

describe("matchName", () => {
  test('matchName finds "J. E. Ellmore" across a line-break hyphen and returns the printed span', () => {
    expect(matchName("we called on Mr. J. E. Ell-\nmore at 861 College Avenue", "J. E. Ellmore")).toBe("J. E. Ellmore");
  });

  test("matchName joins a name the OCR split across lines without a hyphen", () => {
    expect(matchName("declared Senator Cum\nmins in the Senate", "Cummins")).toBe("Cum mins");
  });

  test('matchName tolerates one OCR error in a long name but not in "Bly"', () => {
    expect(matchName("Mrs. Ellm0re entertained", "Ellmore")).toBe("Ellm0re");
    expect(matchName("Mrs. Elm0ree entertained", "Ellmore")).toBeNull();
    expect(matchName("Miss Bley arrived", "Bly")).toBeNull();
  });

  test('matchName does not match inside a longer word ("Blythe" for "Bly")', () => {
    expect(matchName("Mr. Blythe of Chicago", "Bly")).toBeNull();
    expect(matchName("Nellie Bly, the World's reporter", "Bly")).toBe("Bly");
  });

  test("matchName ignores case and periods in initials", () => {
    expect(matchName("JE ELLMORE, barber", "J. E. Ellmore")).toBe("JE ELLMORE");
  });
});

describe("matchPage", () => {
  test("matchPage ignores pages dated 1931 or later", () => {
    expect(matchPage(page("Ellmore", { date: "1931-01-01" }), [follow("Ellmore")])).toEqual([]);
    expect(matchPage(page("Ellmore", { date: "1930-12-31" }), [follow("Ellmore")])).toHaveLength(1);
  });

  test("matchPage matches a place follow by page state or city", () => {
    const hits = matchPage(page("nothing", { state: "wisconsin", city: "milwaukee" }), [follow("milwaukee", "place"), follow("wisconsin", "place", "k2"), follow("ohio", "place", "k3")]);
    expect(hits.map((h) => h.owner)).toEqual(["k1", "k2"]);
  });

  test("matchPage reports every owner who follows a matched name", () => {
    const hits = matchPage(page("J. E. Ellmore visited"), [follow("Ellmore", "name", "k1"), follow("ellmore", "name", "k2", "f2")]);
    expect(hits).toEqual([
      { pageId: "p1", owner: "k1", followId: "f-Ellmore", matched: "Ellmore", kind: "name" },
      { pageId: "p1", owner: "k2", followId: "f2", matched: "Ellmore", kind: "name" },
    ]);
  });
});

describe("pickCandidates", () => {
  const hit = (pageId: string, owner: string, kind: "name" | "place" = "name"): Hit => ({ pageId, owner, followId: "f", matched: "x", kind });

  test(`pickCandidates caps a common name at ${MAX_CANDIDATE_PAGES} candidate pages and counts the rest`, () => {
    const hits = Array.from({ length: 12 }, (_, i) => hit(`p${i}`, "k1"));
    const res = pickCandidates(hits);
    expect(res.pages).toHaveLength(MAX_CANDIDATE_PAGES);
    expect(res.capped).toBe(7);
  });

  test("pickCandidates ranks pages by distinct owners, and a name hit outranks a place hit", () => {
    const res = pickCandidates([hit("place-only", "k1", "place"), hit("place-only", "k2", "place"), hit("two-names", "k1"), hit("two-names", "k2"), hit("one-name", "k3")]);
    expect(res.pages.map((p) => p.pageId)).toEqual(["two-names", "place-only", "one-name"]);
  });
});
