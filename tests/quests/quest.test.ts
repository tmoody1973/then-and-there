import { describe, expect, test } from "vitest";
import { CHAPTERS, chapterStates, position, recordAnswer } from "../../lib/quests/quest";

const sources = [
  { chapter: 1, key: "a" },
  { chapter: 1, key: "b" },
  { chapter: 2, key: "c" },
  { chapter: 3, key: "d" },
  { chapter: 4, key: "e" },
];

describe("the Great Migration quest", () => {
  test("has four chapters in the mockup's order", () => {
    expect(CHAPTERS.map((c) => c.title)).toEqual(["Why people left", "The journey north", "Work up north", "A new life"]);
  });

  test("a new reader starts on the first source of chapter 1", () => {
    expect(position(sources, {})).toEqual({ index: 0, chapter: 1, ofChapter: 1, inChapter: 2, done: false });
  });

  test("you stand on the first source you haven't answered", () => {
    expect(position(sources, { a: "x", b: "y" })).toMatchObject({ index: 2, chapter: 2, ofChapter: 1, inChapter: 1 });
  });

  test("chapters read done, now and ahead", () => {
    expect(chapterStates(sources, { a: "x", b: "y" })).toEqual(["done", "now", "ahead", "ahead"]);
  });

  test("every source answered finishes the quest", () => {
    const all = Object.fromEntries(sources.map((s) => [s.key, "ok"]));
    expect(position(sources, all).done).toBe(true);
    expect(chapterStates(sources, all)).toEqual(["done", "done", "done", "done"]);
  });

  test("a blank answer doesn't count, and an answer is trimmed and capped", () => {
    expect(recordAnswer({}, "a", "   ")).toEqual({});
    expect(recordAnswer({}, "a", "  Jobs.  ")).toEqual({ a: "Jobs." });
    expect(recordAnswer({}, "a", "x".repeat(5000)).a).toHaveLength(2000);
  });
});
