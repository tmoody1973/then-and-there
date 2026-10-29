// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.*s");
const api = anyApi;
const SECRET = "test-secret";
process.env.CONVEX_WRITE_SECRET = SECRET;
const KINDS = ["ad", "weather", "prices", "photo", "headline", "masthead"] as const;

async function seed(t: ReturnType<typeof convexTest>) {
  const image = await t.run((ctx) => ctx.storage.store(new Blob(["jpg"], { type: "image/jpeg" })));
  const row = (no: number) => ({
    no, pageId: `page${no}`, paper: "The Topeka State Journal", city: "topeka", state: "kansas", region: "Midwest", date: "1902-05-14", year: 1902,
    citeThis: { apa: "apa", chicago: "chicago", mla: "mla" }, iiifBase: "https://tile.loc.gov/x:1902051401", imageWidth: 1000, imageHeight: 1400,
    clues: KINDS.map((kind) => ({ kind, label: kind, box: { x: 100, y: 140, w: 200, h: 280 }, image, prints: `${kind} prints`, why: `${kind} why` })),
  });
  await t.mutation(api.frontPages.replaceAll, { secret: SECRET, rows: [row(1), row(2)] });
}

describe("front pages", () => {
  test("the board carries clue images and positions, never the paper, place, date or Library address", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const board = await t.query(api.frontPages.board, { no: 1 });
    expect(board.count).toBe(2);
    expect(board.aspect).toBeCloseTo(1000 / 1400);
    expect(board.clues.map((c: { kind: string }) => c.kind)).toEqual([...KINDS]);
    expect(board.clues[0].box).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 });
    expect(typeof board.clues[0].url).toBe("string");
    const json = JSON.stringify(board);
    for (const leak of ["Topeka", "topeka", "kansas", "1902", "Midwest", "tile.loc.gov", "prints", "page1"]) expect(json).not.toContain(leak);
  });

  test("reveal returns the answer, the score and every clue's explanation", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const r = await t.query(api.frontPages.reveal, { no: 1, revealed: 2, year: 1912, region: "Midwest" });
    expect(r.answer).toMatchObject({ paper: "The Topeka State Journal", year: 1902, region: "Midwest", date: "1902-05-14" });
    expect(r.score).toEqual({ points: 646, yearsOff: 10, regionRight: true });
    expect(r.clues[5]).toMatchObject({ kind: "masthead", prints: "masthead prints", why: "masthead why" });
  });

  test("an unknown number is null, and replacing rows needs the secret", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    expect(await t.query(api.frontPages.board, { no: 9 })).toBeNull();
    expect(await t.query(api.frontPages.reveal, { no: 9, revealed: 1, year: 1900, region: "West" })).toBeNull();
    await expect(t.mutation(api.frontPages.replaceAll, { secret: "nope", rows: [] })).rejects.toThrow(/not allowed/);
    await expect(t.mutation(api.frontPages.uploadUrl, { secret: "nope" })).rejects.toThrow(/not allowed/);
  });
});
