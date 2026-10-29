import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parseAlto } from "../../lib/alto/parse";
import { excerptAround } from "../../lib/game/draftDay";
import { focusBox } from "../../lib/game/focus";
import { tidy } from "../../lib/game/text";

describe("tidy", () => {
  test("rejoins words broken across lines", () => {
    expect(tidy("the Cos- mopolitan and poss- essed")).toBe("the Cosmopolitan and possessed");
  });
  test("rejoins words broken by a hyphen and a line break", () => {
    expect(tidy("is poss-\nessed of Wal-\n ker")).toBe("is possessed of Walker");
  });

  test("keeps real dashes", () => {
    expect(tidy("New York - the World")).toBe("New York - the World");
  });
});

describe("excerptAround", () => {
  test("starts at the sentence that leads into the mention", () => {
    const text = "Other news here. More news follows today. ".repeat(5) + "She left in haste. Her rival is Miss Elizabeth Bisland of the magazine.";
    expect(excerptAround(text).startsWith("Her rival is Miss Elizabeth Bisland")).toBe(true);
  });
});

describe("focusBox", () => {
  const page = parseAlto(readFileSync("tests/fixtures/alto-advocate-1898-12-09-p6.xml", "utf8"));
  // Wautoma marriage paragraph sits inside this column region (pixels, scale 3).
  const COLUMN = { x: 1300, y: 6000, w: 920, h: 2400 };

  test("frames the lines around a mention, inside the clipping", () => {
    const f = focusBox(page, 3, COLUMN, /Swadley/i)!;
    expect(f).toBeDefined();
    expect(f.y).toBeGreaterThanOrEqual(COLUMN.y);
    expect(f.y + f.h).toBeLessThanOrEqual(COLUMN.y + COLUMN.h);
    expect(f.h).toBeLessThan(COLUMN.h);
    expect(f.y).toBeLessThan(7060);
    expect(f.y + f.h).toBeGreaterThan(7120);
  });

  test("in a multi-column clipping, frames only the mention's column", () => {
    const WIDE = { x: 0, y: 6000, w: 4000, h: 2400 };
    const f = focusBox(page, 3, WIDE, /Swadley/i)!;
    expect(f.x).toBeGreaterThan(1200);
    expect(f.w).toBeLessThan(1100);
    expect(f.h).toBeGreaterThan(150);
  });

  test("returns undefined when the clipping never mentions it", () => {
    expect(focusBox(page, 3, COLUMN, /Nellie Bly/i)).toBeUndefined();
  });
});
