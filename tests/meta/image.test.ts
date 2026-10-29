import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { jpegSize } from "../../lib/meta/image";

describe("jpegSize", () => {
  test("reads baseline JPEG dimensions", () => {
    expect(jpegSize(new Uint8Array(readFileSync("tests/fixtures/tiny-37x23.jpg")))).toEqual({ w: 37, h: 23 });
  });
  test("reads progressive JPEG dimensions", () => {
    expect(jpegSize(new Uint8Array(readFileSync("tests/fixtures/tiny-37x23-progressive.jpg")))).toEqual({ w: 37, h: 23 });
  });
  test("throws on non-JPEG bytes", () => {
    expect(() => jpegSize(new TextEncoder().encode("<html>blocked</html>"))).toThrow(/JPEG/);
  });
});
