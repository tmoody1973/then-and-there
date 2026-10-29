// The Library's newly added OCR batches: which are new, downloading them politely and verifiably,
// and reading each page's plain OCR text. Bundle layout (Task 1 spike, fu_three_ver02):
//   <lccn>/<yyyy>/<mm>/<dd>/ed-<n>/seq-<n>/ocr.txt (+ ocr.xml, which the agent never reads)
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BatchEntry } from "../../lib/agent/types";

const USER_AGENT = "then-and-there/0.1 (hackathon research; tarik@radiomilwaukee.org)";
const BULK_PER_WINDOW = 10; // the Library allows 10 bulk downloads per 10 minutes
const BULK_WINDOW_MS = 600_000;
const CUTOFF_YEAR = 1931;
const MEMBER = /^([^/]+)\/(\d{4})\/(\d{2})\/(\d{2})\/ed-(\d+)\/seq-(\d+)\/ocr\.txt$/;

export class BatchChecksumError extends Error {
  constructor(batch: string, why: string) {
    super(`batch ${batch}: ${why}`);
    this.name = "BatchChecksumError";
  }
}

export function newBatches(prev: string[], list: BatchEntry[], opts: { replay?: string } = {}): BatchEntry[] {
  if (opts.replay) return list.filter((b) => b.batch === opts.replay);
  const seen = new Set(prev);
  return list.filter((b) => !seen.has(b.batch));
}

// ponytail: in-process sliding window; one nightly job at a time is the deployment model.
export function createBulkLimiter(deps: { now?: () => number; sleep?: (ms: number) => Promise<void> } = {}) {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let stamps: number[] = [];
  return {
    async takeSlot(): Promise<void> {
      stamps = stamps.filter((s) => s > now() - BULK_WINDOW_MS);
      if (stamps.length >= BULK_PER_WINDOW) {
        await sleep(stamps[0] + BULK_WINDOW_MS - now());
        stamps = stamps.filter((s) => s > now() - BULK_WINDOW_MS);
      }
      stamps = [...stamps, now()];
    },
  };
}

// Streams to disk while hashing; a short body or a checksum mismatch leaves no file behind.
export async function downloadBatch(
  entry: BatchEntry,
  dir: string,
  deps: { fetchImpl?: typeof fetch; takeSlot: () => Promise<void> },
): Promise<string> {
  await deps.takeSlot();
  const res = await (deps.fetchImpl ?? fetch)(entry.url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok || !res.body) throw new BatchChecksumError(entry.batch, `HTTP ${res.status}`);
  const path = join(dir, `${entry.batch}.tar.bz2`);
  const hash = createHash("sha256");
  const out = createWriteStream(path);
  let bytes = 0;
  try {
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      hash.update(chunk);
      bytes += chunk.length;
      if (!out.write(chunk)) await new Promise((r) => out.once("drain", r));
    }
  } finally {
    await new Promise<void>((r) => out.end(r));
  }
  const why = bytes !== entry.size ? `truncated (${bytes} of ${entry.size} bytes)` : hash.digest("hex") !== entry.sha256 ? "sha256 mismatch" : null;
  if (why) {
    await unlink(path).catch(() => undefined);
    throw new BatchChecksumError(entry.batch, why);
  }
  return path;
}

function tar(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn("tar", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`tar ${args[0]} failed (${code}): ${err.slice(0, 200)}`))));
  });
}

// Lists the archive, keeps pre-1931 ocr.txt members by path alone, extracts exactly those (portable
// across GNU and BSD tar: no pattern flags), and yields one page at a time.
export async function* readBatchPages(archivePath: string): AsyncIterable<{ pageId: string; lccn: string; date: string; text: string }> {
  const members = (await tar(["-tjf", archivePath]))
    .split("\n")
    .map((name) => ({ name, m: name.match(MEMBER) }))
    .filter((x): x is { name: string; m: RegExpMatchArray } => x.m !== null && Number(x.m[2]) < CUTOFF_YEAR);
  if (!members.length) return;
  const dir = await mkdtemp(join(tmpdir(), "tt-pages-"));
  try {
    const list = join(dir, ".members");
    await writeFile(list, members.map((x) => x.name).join("\n"));
    await tar(["-xjf", archivePath, "-C", dir, "-T", list]);
    for (const { name, m } of members) {
      const [, lccn, y, mo, d, ed, seq] = m;
      const date = `${y}-${mo}-${d}`;
      yield { pageId: `http://www.loc.gov/resource/${lccn}/${date}/ed-${ed}/?sp=${seq}`, lccn, date, text: await readFile(join(dir, name), "utf8") };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
