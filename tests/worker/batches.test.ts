import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { BatchEntry } from "../../lib/agent/types";
import { BatchChecksumError, createBulkLimiter, downloadBatch, newBatches, readBatchPages } from "../../worker/agent/batches";

const entry = (batch: string, body = "", over: Partial<BatchEntry> = {}): BatchEntry => ({
  batch,
  ingested: "2026-10-23T13:06:48-04:00",
  page_count: 1,
  sha256: createHash("sha256").update(body).digest("hex"),
  size: Buffer.byteLength(body),
  url: `https://chroniclingamerica.loc.gov/data/ocr/${batch}.tar.bz2`,
  ...over,
});
const fakeFetch = (body: string) => (async () => new Response(body)) as unknown as typeof fetch;
const noWait = { takeSlot: async () => undefined };

describe("newBatches", () => {
  test("newBatches returns unseen batches; replay returns the named batch even if seen", () => {
    const list = [entry("a"), entry("b"), entry("c")];
    expect(newBatches(["a", "b"], list).map((b) => b.batch)).toEqual(["c"]);
    expect(newBatches(["a", "b", "c"], list, { replay: "a" }).map((b) => b.batch)).toEqual(["a"]);
    expect(newBatches([], list, { replay: "missing" })).toEqual([]);
  });
});

describe("downloadBatch", () => {
  test("downloads to disk and checks the sha256", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tt-batch-"));
    const path = await downloadBatch(entry("ok", "hello batch"), dir, { fetchImpl: fakeFetch("hello batch"), ...noWait });
    expect(path).toBe(join(dir, "ok.tar.bz2"));
    expect(existsSync(path)).toBe(true);
  });

  test("downloadBatch rejects a checksum mismatch and leaves no file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tt-batch-"));
    const e = entry("bad", "x".repeat(5), { sha256: "0".repeat(64) });
    await expect(downloadBatch(e, dir, { fetchImpl: fakeFetch("x".repeat(5)), ...noWait })).rejects.toBeInstanceOf(BatchChecksumError);
    expect(readdirSync(dir)).toEqual([]);
  });

  test("downloadBatch rejects a truncated body", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tt-batch-"));
    const e = entry("short", "full body here");
    await expect(downloadBatch(e, dir, { fetchImpl: fakeFetch("full body"), ...noWait })).rejects.toBeInstanceOf(BatchChecksumError);
    expect(readdirSync(dir)).toEqual([]);
  });
});

describe("createBulkLimiter", () => {
  test("allows 10 bulk downloads per 10 minutes, then waits", async () => {
    let t = 0;
    const waits: number[] = [];
    const lim = createBulkLimiter({ now: () => t, sleep: async (ms) => void (waits.push(ms), (t += ms)) });
    for (let i = 0; i < 11; i += 1) await lim.takeSlot();
    expect(waits).toEqual([600_000]);
  });
});

describe("readBatchPages", () => {
  test("readBatchPages maps archive paths to pageIds and skips 1931+ pages", async () => {
    const pages = [];
    for await (const p of readBatchPages("tests/fixtures/batch/mini.tar.bz2")) pages.push(p);
    expect(pages.map((p) => p.pageId).sort()).toEqual([
      "http://www.loc.gov/resource/sn95026977/1909-07-01/ed-1/?sp=1",
      "http://www.loc.gov/resource/sn95026977/1909-07-01/ed-1/?sp=2",
      "http://www.loc.gov/resource/sn95026977/1909-07-02/ed-1/?sp=1",
    ]);
    const first = pages.find((p) => p.pageId.endsWith("1909-07-01/ed-1/?sp=1"))!;
    expect(first).toMatchObject({ lccn: "sn95026977", date: "1909-07-01" });
    expect(first.text).toContain("Senator Cum");
  });

  test("an archive whose text files don't follow the known layout is an error, not an empty batch", async () => {
    const read = async () => {
      for await (const _ of readBatchPages("tests/fixtures/batch/unknown-layout.tar.bz2")) void _;
    };
    await expect(read()).rejects.toThrow(/unrecognized batch layout/);
  });
});
