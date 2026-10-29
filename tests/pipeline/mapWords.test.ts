import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parseAlto } from "../../lib/alto/parse";
import { wordsInBox } from "../../lib/pipeline/mapWords";

const page = parseAlto(readFileSync("tests/fixtures/alto-advocate-1898-12-09-p6.xml", "utf8"));
// Pixel box around the Wautoma marriage paragraph (verified against the scan, image width 5808).
const BOX = { x: 1320, y: 6930, w: 880, h: 560 };

describe("wordsInBox", () => {
  const got = wordsInBox(page, BOX, 3);

  test("reads the paragraph in order", () => {
    expect(got.text).toContain("Nicholas Swadley of Pine Village");
    expect(got.text).toContain("Jolliffe");
  });

  test("joins a hyphenated word once", () => {
    expect(got.text.match(/Poysippi/g)).toHaveLength(1);
    expect(got.text).not.toMatch(/\bpi\b/);
  });

  test("reports mean confidence and count", () => {
    expect(got.wordCount).toBeGreaterThan(30);
    expect(got.meanWc).toBeGreaterThan(0);
    expect(got.meanWc).toBeLessThanOrEqual(1);
  });

  test("empty box gives empty text", () => {
    expect(wordsInBox(page, { x: 0, y: 0, w: 1, h: 1 }, 3)).toEqual({ text: "", meanWc: 0, wordCount: 0 });
  });
});
