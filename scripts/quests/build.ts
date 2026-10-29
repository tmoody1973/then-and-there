// Builds the Great Migration quest: for each chapter, the guide picks up to five sources from
// confirmed Black-press titles (1916-1925) and writes a caption, a question and a note; the Editor
// checks caption and note against the crop. Output: data/quests/great-migration.json.
// Usage: bun scripts/quests/build.ts [--budget 1]
import { mkdirSync, writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { z } from "zod";
import { iiifCropUrl } from "../../components/iiif";
import { verifyClaim } from "../../lib/editor/verify";
import { BLACK_PRESS_LCCNS } from "../../lib/explore/communities";
import { passage, ref } from "../../lib/game/draftDay";
import { convexUrl, loadClips, writeSecret } from "../../lib/game/load";
import { createLocClient } from "../../lib/loc/client";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { toDataUrl } from "../../lib/meta/image";
import { costOf, type Usage } from "../../lib/meta/pricing";
import { askJson } from "../../lib/pipeline/askJson";
import { EDITOR_CLUE_PROMPT, QUEST_GM_PROMPT } from "../../lib/pipeline/prompts";
import { CHAPTERS } from "../../lib/quests/quest";
import { withRetry } from "../../lib/util/retry";

const BUDGET = Number(process.argv[process.argv.indexOf("--budget") + 1]) || 1;
const SPARK = process.env.META_MODEL_SPARK ?? "";
const PER_CHAPTER = 5;
const LISTED = 24;
// The migration itself, so a chapter's theme words don't pull in unrelated news.
const MIGRATION = /north|migra|exodus|chicago|detroit|pittsburgh|cleveland|harlem|new york|philadelphia|east st\.? louis|leaving the south|left the south|from the south/i;

const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const meta = metaClient();
const loc = createLocClient({ servicesPerMinute: 60 });
let spent = 0;
const onUsage = (model: string, u: Usage) => void (spent += costOf(model, u));
const log = async (run: unknown) => void (await withRetry(() => convex.mutation(anyApi.editorRuns.log, { secret, run })));
const loadImage = async (url: string) => toDataUrl(await loc.getBytes(url));
const lccnOf = (pageId: string) => pageId.match(/\/resource\/(\w+)\//)?.[1] ?? "";
const Picks = z.object({ picks: z.array(z.object({ i: z.number().int(), caption: z.string().min(8), question: z.string().min(10), notice: z.string().min(20) })) });

const clips = (await loadClips(convex, "1916-01-01", "1925-12-31")).filter((c) => BLACK_PRESS_LCCNS.includes(lccnOf(c.pageId)) && MIGRATION.test(c.text));
process.stdout.write(`${clips.length} Black-press clippings touch the migration\n`);

const used = new Set<string>();
const sources = [];
const notes: string[] = [];
for (const ch of CHAPTERS) {
  // Round-robin across papers (each oldest first), so one title can't fill the chapter.
  const byPaper = new Map<string, typeof clips>();
  for (const c of clips.filter((c) => !used.has(c.clippingId) && ch.terms.test(c.text) && c.text.length >= 200).sort((a, b) => a.date.localeCompare(b.date)))
    byPaper.set(c.paper, [...(byPaper.get(c.paper) ?? []), c]);
  const pool: typeof clips = [];
  for (let r = 0; pool.length < LISTED && [...byPaper.values()].some((l) => l[r]); r += 1)
    for (const l of byPaper.values()) if (l[r] && pool.length < LISTED) pool.push(l[r]);
  if (!pool.length || spent >= BUDGET) {
    notes.push(`${ch.title}: ${pool.length ? "budget reached" : "no candidates"}`);
    continue;
  }
  const complete = makeComplete(meta, `quest-${ch.n}-${pool.map((c) => c.clippingId).join(",")}`, onUsage);
  const listing = pool.map((c, i) => `[${i}] (${c.date}, ${c.paper}, ${c.city}) ${passage(c.text).replace(/\s+/g, " ").slice(0, 500)}`).join("\n");
  const gm = await askJson(Picks, complete, { model: SPARK, effort: "low", prompt: QUEST_GM_PROMPT(ch.title, ch.focus, listing, PER_CHAPTER) });
  if (!gm.ok) {
    notes.push(`${ch.title}: guide failed (${gm.error.slice(0, 60)})`);
    continue;
  }
  for (const p of gm.value.picks.slice(0, PER_CHAPTER)) {
    const c0 = pool[p.i];
    if (!c0 || used.has(c0.clippingId)) continue;
    // The whole clipping, not a zoomed part: the caption describes all of it.
    const c = c0;
    const v = await verifyClaim(
      { subjectKind: "clue", subjectId: `quest-${c.clippingId}`, claim: `KIND: a newspaper item (it may reprint or quote other papers; which paper printed it is known from the Library record). PRINTS: ${p.caption} WHY: ${p.notice}`, sourceText: c.text, cropUrl: iiifCropUrl(c.iiifBase, c.box, 1000), prompt: EDITOR_CLUE_PROMPT },
      { complete, loadImage, log },
    );
    if (!v.pass) {
      notes.push(`${ch.title}: editor rejected ${c.date} ${c.paper}: ${v.reason.slice(0, 100)}`);
      continue;
    }
    used.add(c.clippingId);
    sources.push({ chapter: ch.n, key: c.clippingId, clip: { ...ref(c, MIGRATION), city: c.city, state: c.state }, caption: p.caption, question: p.question, notice: p.notice, hardHistory: c.hardHistory === true });
  }
  process.stdout.write(`${ch.title}: ${sources.filter((s) => s.chapter === ch.n).length} sources  ($${spent.toFixed(3)})\n`);
}

mkdirSync("data/quests", { recursive: true });
writeFileSync("data/quests/great-migration.json", `${JSON.stringify({ builtAt: new Date().toISOString(), sources }, null, 2)}\n`);
process.stdout.write(`${sources.length} sources · $${spent.toFixed(3)}\n${notes.map((n) => `  ${n}`).join("\n")}\n`);
