import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { cachedCall } from "../../lib/meta/cache";

describe("cachedCall", () => {
  test("runs fn once per key, again when promptVersion changes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tt-cache-"));
    let n = 0;
    const fn = async () => ({ n: ++n });
    const key = { model: "m", promptVersion: "v1", subjectId: "c1", input: { a: 1 } };
    expect(await cachedCall(key, fn, dir)).toEqual({ n: 1 });
    expect(await cachedCall(key, fn, dir)).toEqual({ n: 1 });
    expect(await cachedCall({ ...key, promptVersion: "v2" }, fn, dir)).toEqual({ n: 2 });
    expect(n).toBe(2);
  });
});
