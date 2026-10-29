import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { altoScale, parseAlto } from "../../lib/alto/parse";

const xml = readFileSync("tests/fixtures/alto-advocate-1898-12-09-p6.xml", "utf8");
const page = parseAlto(xml);
const words = page.lines.flatMap((l) => l.words);

describe("parseAlto", () => {
  test("reads page size", () => {
    expect(page.width).toBe(17424);
    expect(page.height).toBe(24261);
  });

  test("keeps hyphen subs on both halves", () => {
    const first = words.find((w) => w.text === "Poysip");
    const second = words.find((w) => w.text === "pi" && w.subs === "Poysippi");
    expect(first?.subs).toBe("Poysippi");
    expect(second).toBeDefined();
  });

  test("reads word positions", () => {
    const w = words.find((x) => x.text === "Poysip")!;
    expect([w.x, w.y, w.w, w.h]).toEqual([6099, 21539, 369, 113]);
  });

  test("reads word confidence within 0..1", () => {
    expect(words.length).toBeGreaterThan(1000);
    expect(words.every((w) => w.wc >= 0 && w.wc <= 1)).toBe(true);
  });

  test("lines carry their own box", () => {
    expect(page.lines.every((l) => l.w > 0 && l.h > 0)).toBe(true);
  });
});

describe("altoScale", () => {
  test("computes ALTO units per pixel", () => {
    expect(altoScale(17424, 5808)).toBe(3);
    expect(altoScale(15152, 3788)).toBe(4);
  });
});
