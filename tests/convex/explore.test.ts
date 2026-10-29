// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../../convex/schema";
import { BLACK_PRESS_LCCNS } from "../../lib/explore/communities";

const modules = import.meta.glob("../../convex/**/*.*s");
const api = anyApi;

type PageOver = Partial<{ lccn: string; state: string; city: string; date: string; sequence: number; language: string[]; status: "processed" | "fetched" }>;
const page = (id: string, o: PageOver = {}) => ({
  pageId: `http://www.loc.gov/resource/${o.lccn ?? "sn1"}/${o.date ?? "1889-11-29"}/ed-1/?sp=${id}`,
  lccn: o.lccn ?? "sn1",
  title: "test paper (testville, wis.) 1880-1900",
  city: o.city ?? "milwaukee",
  state: o.state ?? "wisconsin",
  date: o.date ?? "1889-11-29",
  sequence: o.sequence ?? 1,
  language: o.language ?? ["english"],
  iiifBase: "https://tile.loc.gov/image-services/iiif/x",
  altoUrl: "https://tile.loc.gov/storage-services/x.xml",
  imageWidth: 5000,
  imageHeight: 8000,
  altoScale: 3,
  citeThis: { apa: "apa", chicago: "chicago", mla: "mla" },
  status: o.status ?? ("processed" as const),
});

type ClipOver = Partial<{ rawText: string; cleanedText: string; type: "person" | "event" | "ad"; editorStatus: "unchecked" | "pass" | "fail"; hardHistory: boolean; people: string[] }>;
const clip = (pageId: string, o: ClipOver = {}) => ({
  pageId,
  box: { x: 10, y: 20, w: 300, h: 400 },
  segLabel: "article",
  segSource: "sam" as const,
  rawText: o.rawText ?? "nothing here",
  meanWc: 0.9,
  nonDictRate: 0.05,
  ...(o.cleanedText ? { cleanedText: o.cleanedText } : {}),
  ...(o.type ? { type: o.type } : {}),
  ...(o.hardHistory !== undefined ? { hardHistory: o.hardHistory } : {}),
  ...(o.people ? { people: o.people } : {}),
  status: "classified" as const,
  editorStatus: o.editorStatus ?? ("unchecked" as const),
  promptVersion: "2026-10-28.1",
});

async function seed(rows: Array<{ p: ReturnType<typeof page>; clips: ReturnType<typeof clip>[] }>) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (const { p, clips } of rows) {
      await ctx.db.insert("pages", p);
      for (const c of clips) await ctx.db.insert("clippings", c);
    }
  });
  return t;
}

const search = (t: Awaited<ReturnType<typeof seed>>, args: Record<string, unknown>) =>
  t.query(api.explore.search, args) as Promise<Array<{ clippingId: string; textKind: string; text: string; state: string; date: string }>>;

describe("explore.search", () => {
  test('finds a word that exists only in raw OCR (unrepaired clipping), labeled textKind "archive"', async () => {
    const p = page("1");
    const t = await seed([{ p, clips: [clip(p.pageId, { rawText: "Mr. Ellmore opened a shaving parlor" })] }]);
    const res = await search(t, { q: "Ellmore" });
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ textKind: "archive", state: "wisconsin" });
  });

  test('prefers the repaired text and labels it "repaired" when both match', async () => {
    const p = page("1");
    const t = await seed([{ p, clips: [clip(p.pageId, { rawText: "Nellie Bly trip", cleanedText: "Nellie Bly's trip around the world" })] }]);
    const res = await search(t, { q: "Nellie" });
    expect(res[0]).toMatchObject({ textKind: "repaired", text: "Nellie Bly's trip around the world" });
    // The archive's own OCR rides along so a reader can compare it with the repair.
    expect(res[0]).toMatchObject({ archiveText: "Nellie Bly trip" });
    const raw = await seed([{ p: page("9"), clips: [clip(page("9").pageId, { rawText: "only raw words" })] }]);
    expect((await search(raw, { q: "raw" }))[0]).not.toHaveProperty("archiveText");
  });

  test("returns each clipping once when both indexes match it", async () => {
    const p = page("1");
    const t = await seed([{ p, clips: [clip(p.pageId, { rawText: "Bisland sails", cleanedText: "Bisland sails west" })] }]);
    expect(await search(t, { q: "Bisland" })).toHaveLength(1);
  });

  test("filters by state, date range, language and front page (sequence 1)", async () => {
    const a = page("1", { state: "wisconsin", date: "1889-11-29", language: ["german"], sequence: 1 });
    const b = page("2", { state: "michigan", date: "1890-01-10", language: ["english"], sequence: 4 });
    const t = await seed([
      { p: a, clips: [clip(a.pageId, { rawText: "Bly news" })] },
      { p: b, clips: [clip(b.pageId, { rawText: "Bly news" })] },
    ]);
    expect((await search(t, { q: "Bly", state: "michigan" })).map((r) => r.state)).toEqual(["michigan"]);
    expect(await search(t, { q: "Bly", from: "1890-01-01", to: "1890-01-31" })).toHaveLength(1);
    expect(await search(t, { q: "Bly", language: "german" })).toHaveLength(1);
    expect((await search(t, { q: "Bly", frontOnly: true })).map((r) => r.state)).toEqual(["wisconsin"]);
  });

  test('community "black-press" keeps only pages whose lccn is in BLACK_PRESS_LCCNS', async () => {
    const black = page("1", { lccn: BLACK_PRESS_LCCNS[0] });
    const other = page("2", { lccn: "sn-not-listed" });
    const t = await seed([
      { p: black, clips: [clip(black.pageId, { rawText: "church social" })] },
      { p: other, clips: [clip(other.pageId, { rawText: "church social" })] },
    ]);
    expect(await search(t, { q: "church", community: "black-press" })).toHaveLength(1);
  });

  test('peopleOnly keeps type "person"; verifiedOnly keeps editorStatus "pass"', async () => {
    const p = page("1");
    const t = await seed([
      {
        p,
        clips: [
          clip(p.pageId, { rawText: "Smith wed", type: "person", editorStatus: "pass" }),
          clip(p.pageId, { rawText: "Smith hardware sale", type: "ad" }),
        ],
      },
    ]);
    expect(await search(t, { q: "Smith", peopleOnly: true })).toHaveLength(1);
    expect(await search(t, { q: "Smith", verifiedOnly: true })).toHaveLength(1);
    expect(await search(t, { q: "Smith" })).toHaveLength(2);
  });

  test("never returns a page dated 1931-01-01 or later", async () => {
    const old = page("1", { date: "1930-12-31" });
    const late = page("2", { date: "1931-01-01" });
    const t = await seed([
      { p: old, clips: [clip(old.pageId, { rawText: "council meeting" })] },
      { p: late, clips: [clip(late.pageId, { rawText: "council meeting" })] },
    ]);
    expect((await search(t, { q: "council" })).map((r) => r.date)).toEqual(["1930-12-31"]);
  });

  test("ignores pages that aren't processed", async () => {
    const p = page("1", { status: "fetched" });
    const t = await seed([{ p, clips: [clip(p.pageId, { rawText: "orphan text" })] }]);
    expect(await search(t, { q: "orphan" })).toEqual([]);
  });

  test("empty, whitespace-only or >200-character q returns [] without throwing", async () => {
    const p = page("1");
    const t = await seed([{ p, clips: [clip(p.pageId, { rawText: "anything" })] }]);
    expect(await search(t, { q: "" })).toEqual([]);
    expect(await search(t, { q: "   " })).toEqual([]);
    expect(await search(t, { q: "x".repeat(201) })).toEqual([]);
  });

  test("a place filter still finds a match ranked below the first 64 hits", async () => {
    const wi = page("1", { state: "wisconsin" });
    const mi = page("2", { state: "michigan" });
    const t = await seed([
      { p: wi, clips: Array.from({ length: 80 }, () => clip(wi.pageId, { rawText: "Bly passes" })) },
      { p: mi, clips: [clip(mi.pageId, { rawText: "Bly passes" })] },
    ]);
    expect(await search(t, { q: "Bly", state: "michigan" })).toHaveLength(1);
  });

  test("caps results at 30", async () => {
    const p = page("1");
    const t = await seed([{ p, clips: Array.from({ length: 40 }, () => clip(p.pageId, { rawText: "fire downtown" })) }]);
    expect(await search(t, { q: "fire" })).toHaveLength(30);
  });
});

describe("explore.stats", () => {
  test("stats counts processed pages only, with the states and languages present", async () => {
    const a = page("1", { state: "wisconsin", language: ["german"] });
    const c = page("3", { state: "michigan", language: ["english"] });
    const b = page("2", { status: "fetched", state: "ohio" });
    const t = await seed([{ p: a, clips: [] }, { p: b, clips: [] }, { p: c, clips: [] }]);
    expect(await t.query(api.explore.stats, {})).toEqual({ pages: 2, states: ["michigan", "wisconsin"], languages: ["english", "german"] });
  });
});

describe("explore cards and shelves", () => {
  test("a card carries the people named in the clipping", async () => {
    const p = page("1");
    const t = await seed([{ p, clips: [clip(p.pageId, { rawText: "Ellmore wed", type: "person", editorStatus: "pass", people: ["J. E. Ellmore"] })] }]);
    expect((await t.query(api.explore.search, { q: "Ellmore" }))[0]).toMatchObject({ people: ["J. E. Ellmore"] });
  });

  test("shelves are served in order and replaced whole; writing them needs the secret", async () => {
    const t = convexTest(schema, modules);
    process.env.CONVEX_WRITE_SECRET = "s";
    const shelf = (slug: string, order: number) => ({ slug, title: slug, blurb: "b", order, cards: [] });
    await t.mutation(api.explore.replaceShelves, { secret: "s", shelves: [shelf("b", 2), shelf("a", 1)] });
    await t.mutation(api.explore.replaceShelves, { secret: "s", shelves: [shelf("c", 1)] });
    expect(((await t.query(api.explore.shelves, {})) as Array<{ slug: string }>).map((x) => x.slug)).toEqual(["c"]);
    await expect(t.mutation(api.explore.replaceShelves, { secret: "nope", shelves: [] })).rejects.toThrow(/not allowed/);
  });
});

