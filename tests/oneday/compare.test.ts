import { describe, expect, test } from "vitest";
import { markPapers, shingles } from "../../lib/oneday/compare";

const WIRE =
  "Washington Aug 26 Secretary of State Colby today signed the proclamation declaring the suffrage amendment a part of the federal constitution and the women of the nation are now entitled to vote in the November election";
const TOPIC = /suffrag|amendment/i;
const box = { x: 0, y: 0, w: 10, h: 10 };

describe("shingles", () => {
  test("ignores case, punctuation and line-break hyphens", () => {
    expect(shingles("The Women, of the NATION!", 3)).toEqual(shingles("the women of the nation", 3));
    expect(shingles("suf-\nfrage amendment is law", 3).has("suffrage amendment is")).toBe(true);
  });
});

describe("markPapers", () => {
  const papers = [
    { id: "star", clips: [{ id: "s1", text: WIRE, box }, { id: "s2", text: "Local suffragists parade on Pennsylvania avenue tonight with bands and banners to mark the amendment", box }] },
    // Same wire story with OCR noise and a different lead.
    { id: "trib", clips: [{ id: "t1", text: `By the Associated Press. ${WIRE.replace("signed", "sigued").replace("nation", "natlon")}`, box }] },
    { id: "bisbee", clips: [{ id: "b1", text: "Copper output at the Queen mine rose again this week as the smelter returned to full time", box }] },
  ];
  const marks = markPapers(papers, TOPIC);

  test("the same wire story in two papers is marked wire copy in both", () => {
    expect(marks.s1).toBe("wire");
    expect(marks.t1).toBe("wire");
  });

  test("story coverage no other paper ran is this paper's own", () => {
    expect(marks.s2).toBe("own");
  });

  test("clippings off the day's story stay unmarked", () => {
    expect(marks.b1).toBeUndefined();
  });

  test("a merged column counts only if its opening names the story", () => {
    const column = `U. S. Expects Poles to Halt at Treaty Line. ${"Warsaw dispatches say the army holds its ground. ".repeat(10)} Suffrage leaders met today.`;
    expect(markPapers([{ id: "a", clips: [{ id: "c1", text: column, box }] }], TOPIC).c1).toBeUndefined();
  });

  test("a story repeated within one paper is not wire copy", () => {
    const one = markPapers([{ id: "a", clips: [{ id: "a1", text: WIRE, box }, { id: "a2", text: WIRE, box }] }], TOPIC);
    expect(one.a1).toBe("own");
  });
});
