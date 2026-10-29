import { describe, expect, test } from "vitest";
import type { BatchEntry, Follow } from "../../lib/agent/types";
import { MAX_BATCHES_PER_NIGHT, runNight, type FoundClip, type NightDeps } from "../../worker/agent/night";

const KEY = "aaaabbbbccccddddaaaabbbbccccdddd";
const KEY2 = "11112222333344441111222233334444";
const batch = (name: string): BatchEntry => ({ batch: name, ingested: "2026-10-23", page_count: 2, sha256: "x", size: 1, url: `https://x/${name}` });
const PAGE_TEXT = "APPLETON NEWS. We called on Mr. J. E. Ellmore at 861 College Avenue.";
const clip = (id: string, text = PAGE_TEXT): FoundClip => ({
  clippingId: id, text, type: "person", people: ["J. E. Ellmore"], humanStoryScore: 0.9, hardHistory: false,
  box: { x: 0, y: 0, w: 10, h: 10 }, iiifBase: "https://iiif/x", pageId: "p1", paper: "The Wisconsin Weekly Advocate", date: "1898-12-22", citationMla: "mla",
});

type Recorded = { printed: string[]; editor: Array<{ clippingId: string; text: string; claim: string }>; notes: Array<{ owner: string; clippingId: string; replay: boolean }>; lines: Array<{ owner?: string; line: string; replay: boolean }>; state: Record<string, string> };

function fake(o: Partial<{ follows: Follow[]; prev: string[] | null; list: BatchEntry[]; failDownload: string[]; clips: FoundClip[]; editorPass: boolean; noCredits: boolean }> = {}) {
  const rec: Recorded = { printed: [], editor: [], notes: [], lines: [], state: {} };
  if (o.prev !== null) rec.state.batches = JSON.stringify(o.prev ?? ["old"]);
  const deps: NightDeps = {
    listBatches: async () => o.list ?? [batch("old"), batch("new1")],
    download: async (e) => {
      if (o.failDownload?.includes(e.batch)) throw new Error("sha256 mismatch");
      return `/tmp/${e.batch}.tar.bz2`;
    },
    pages: async function* (archive) {
      yield { pageId: `${archive}#p1`, lccn: "sn84025861", date: "1898-12-22", text: PAGE_TEXT, xmlMember: "a/ocr.xml" };
      yield { pageId: `${archive}#p2`, lccn: "sn84025861", date: "1898-12-23", text: "Nothing of note.", xmlMember: "b/ocr.xml" };
    },
    placeOf: async () => ({ state: "wisconsin", city: "milwaukee" }),
    processPage: async () => {
      if (o.noCredits) throw new Error("402 Payment Required: insufficient credits");
      return o.clips ?? [clip("c1"), clip("c2", "Mr. Ellmore's barber shop is the finest.")];
    },
    verifyFind: async (input) => {
      rec.editor.push(input);
      return { pass: o.editorPass ?? true, reason: "quoted" };
    },
    store: {
      follows: async () => o.follows ?? [{ id: "f1", owner: KEY, kind: "name", value: "Ellmore" }],
      publishedDays: async () => [16],
      meanwhileCandidates: async () => [],
      replaceMeanwhile: async () => undefined,
      addNote: async (n) => {
        if (rec.notes.some((x) => x.owner === n.owner && x.clippingId === n.clippingId)) return false;
        rec.notes.push(n);
        return true;
      },
      log: async (rows) => void rec.lines.push(...rows),
      getState: async (k) => rec.state[k] ?? null,
      setState: async (k, v) => void (rec.state[k] = v),
    },
    print: (line) => void rec.printed.push(line),
    spent: () => 0,
  };
  return { deps, rec };
}
const OPTS = { today: "2026-10-30", budget: 3 };

describe("runNight", () => {
  test("one note per owner per night even with two confirmed finds", async () => {
    const { deps, rec } = fake();
    const s = await runNight(deps, OPTS);
    expect(rec.notes).toHaveLength(1);
    expect(s).toMatchObject({ batches: 1, pages: 2, follows: 1, candidates: 1, notes: 1 });
    const shared = rec.lines.find((l) => !l.owner)!;
    expect(shared.line).toBe("Checked 1 new batch (2 pages). Searched 1 follow. 1 candidate. Editor confirmed 1. Sent 1 note.");
    expect(rec.lines.some((l) => l.owner === KEY)).toBe(true);
    expect(JSON.parse(rec.state.batches)).toEqual(["old", "new1"]);
  });

  test('an Editor fail sends no note and the line says "Editor confirmed 0"', async () => {
    const { deps, rec } = fake({ editorPass: false });
    await runNight(deps, OPTS);
    expect(rec.notes).toEqual([]);
    expect(rec.lines.find((l) => !l.owner)!.line).toContain("Editor confirmed 0. Sent 0 notes.");
  });

  test("a failed batch is not saved as seen", async () => {
    const { deps, rec } = fake({ list: [batch("old"), batch("good"), batch("bad")], failDownload: ["bad"] });
    const s = await runNight(deps, OPTS);
    expect(JSON.parse(rec.state.batches)).toEqual(["old", "good"]);
    expect(s.skipped.join(" ")).toContain("bad");
  });

  test("nothing printed or sent to the Editor contains a follow value or a key", async () => {
    const { deps, rec } = fake({
      follows: [
        { id: "f1", owner: KEY, kind: "name", value: "Ellmore" },
        { id: "f2", owner: KEY2, kind: "name", value: "Zyxwvut" },
        { id: "f3", owner: KEY2, kind: "place", value: "milwaukee" },
      ],
    });
    await runNight(deps, OPTS);
    const printed = rec.printed.join("\n");
    for (const secret of ["Zyxwvut", KEY, KEY2, "Ellmore", "milwaukee"]) expect(printed).not.toContain(secret);
    for (const call of rec.editor) {
      expect(JSON.stringify(call)).not.toContain("Zyxwvut");
      expect(JSON.stringify(call)).not.toContain(KEY);
      expect(JSON.stringify(call)).not.toContain(KEY2);
      // The only follow-derived text the Editor sees is a span printed in that very clipping.
      const MENTION = "This clipping mentions ";
      if (call.claim.startsWith(MENTION)) expect(call.text).toContain(call.claim.slice(MENTION.length));
    }
  });

  test("replay labels every note and line, and leaves the saved batch list alone", async () => {
    const { deps, rec } = fake({ list: [batch("old"), batch("new1")] });
    await runNight(deps, { ...OPTS, replay: "old" });
    expect(rec.notes.every((n) => n.replay)).toBe(true);
    expect(rec.lines.every((l) => l.replay && (l.owner || l.line.startsWith("Replay: ")))).toBe(true);
    expect(JSON.parse(rec.state.batches)).toEqual(["old"]);
  });

  test('out of credits logs "skipped: no credits" and resolves', async () => {
    const { deps, rec } = fake({ noCredits: true });
    const s = await runNight(deps, OPTS);
    expect(s.skipped).toContain("no credits");
    expect(rec.notes).toEqual([]);
    expect(rec.printed.join("\n")).toContain("skipped: no credits");
  });

  test("the first night records a baseline and scans nothing", async () => {
    const { deps, rec } = fake({ prev: null, list: [batch("a"), batch("b"), batch("c")] });
    const s = await runNight(deps, OPTS);
    expect(JSON.parse(rec.state.batches)).toEqual(["a", "b", "c"]);
    expect(s.batches).toBe(0);
    expect(rec.lines[0].line).toBe("First night: recorded 3 existing batches as the starting point. New batches are checked from tomorrow.");
  });

  test(`scans at most ${MAX_BATCHES_PER_NIGHT} new batches a night; the rest wait, unseen`, async () => {
    const list = [batch("old"), ...Array.from({ length: MAX_BATCHES_PER_NIGHT + 2 }, (_, i) => batch(`n${i}`))];
    const { deps, rec } = fake({ list });
    const s = await runNight(deps, OPTS);
    expect(s.batches).toBe(MAX_BATCHES_PER_NIGHT);
    expect(JSON.parse(rec.state.batches)).toHaveLength(1 + MAX_BATCHES_PER_NIGHT);
  });

  test("with no follows it records new batches without downloading them", async () => {
    let downloads = 0;
    const { deps, rec } = fake({ follows: [] });
    deps.download = async () => (downloads++, "/tmp/x");
    await runNight(deps, OPTS);
    expect(downloads).toBe(0);
    expect(JSON.parse(rec.state.batches)).toEqual(["old", "new1"]);
  });
});
