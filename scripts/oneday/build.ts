// Builds One Day, Many Papers: for each day, picks three front pages that ran the story, marks
// each story clipping as shared wire copy or the paper's own, and has the Comparer write what to
// notice (the Editor checks it against the computed facts). Output: data/oneday/<slug>.json.
// Usage: bun scripts/oneday/build.ts [--budget 1]
import { writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { z } from "zod";
import { verifyClaim } from "../../lib/editor/verify";
import { regionOf } from "../../lib/frontpage/rules";
import { convexUrl, writeSecret } from "../../lib/game/load";
import { paperFromCite, plainCitation } from "../../lib/loc/cite";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { costOf, type Usage } from "../../lib/meta/pricing";
import { markPapers } from "../../lib/oneday/compare";
import { DAYS } from "../../lib/oneday/days";
import { askJson } from "../../lib/pipeline/askJson";
import { COMPARER_PROMPT, EDITOR_COMPARE_PROMPT } from "../../lib/pipeline/prompts";
import { withRetry } from "../../lib/util/retry";

const BUDGET = Number(process.argv[process.argv.indexOf("--budget") + 1]) || 1;
const SPARK = process.env.META_MODEL_SPARK ?? "";
const PAPERS = 3;

type Box = { x: number; y: number; w: number; h: number };
type Page = { pageId: string; lccn?: string; language?: string[]; title: string; city: string; state: string; date: string; sequence: number; iiifBase: string; imageWidth: number; imageHeight: number; citeThis: { mla: string }; status: string };
type Clip = { _id: string; box: Box; rawText: string; cleanedText?: string };

const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const meta = metaClient();
let spent = 0;
const onUsage = (model: string, u: Usage) => void (spent += costOf(model, u));
const log = async (run: unknown) => void (await withRetry(() => convex.mutation(anyApi.editorRuns.log, { secret, run })));
const Note = z.object({ noticed: z.string().min(20), question: z.string().min(10) });
const pct = (n: number) => `${Math.round(n * 100)}%`;
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

for (const day of DAYS) {
  const pages = ((await withRetry(() => convex.query(anyApi.pages.byDateRange, { secret, start: day.dates[0], end: day.dates[1] }))) as Page[]).filter(
    (p) => p.status === "processed" && p.sequence === 1,
  );
  const loaded = [];
  for (const p of pages) {
    const rows = (await withRetry(() => convex.query(anyApi.clippings.byPage, { pageId: p.pageId }))) as Clip[];
    loaded.push({ page: p, paperKey: p.lccn ?? p.title, clips: rows.map((c) => ({ id: c._id, box: c.box, text: c.cleanedText ?? c.rawText })) });
  }
  // Two editions of one paper never make each other "wire copy": compare by paper, not page.
  const byPaper = new Map<string, { id: string; clips: (typeof loaded)[number]["clips"] }>();
  for (const l of loaded) byPaper.set(l.paperKey, { id: l.paperKey, clips: [...(byPaper.get(l.paperKey)?.clips ?? []), ...l.clips] });
  const marks = markPapers([...byPaper.values()], day.topic);
  const scored = loaded
    .map((l) => {
      const area = l.page.imageWidth * l.page.imageHeight;
      const story = l.clips.filter((c) => marks[c.id]);
      return { ...l, story, share: story.reduce((s, c) => s + (c.box.w * c.box.h) / area, 0) };
    })
    .filter((l) => l.story.length);
  // The mockup's papers first when we hold them, then the most coverage, one page per paper, spread across regions.
  const preferred = (l: (typeof scored)[number]) => day.prefer.findIndex((t) => l.page.title.toLowerCase().startsWith(t));
  const ranked = [...scored].sort((a, b) => (preferred(b) >= 0 ? 1 : 0) - (preferred(a) >= 0 ? 1 : 0) || b.share - a.share);
  const picked: typeof scored = [];
  for (const l of ranked) {
    if (picked.length >= PAPERS) break;
    if (picked.some((p) => p.paperKey === l.paperKey)) continue;
    const regionTaken = (r: typeof l) => picked.some((p) => regionOf(p.page.state) === regionOf(r.page.state));
    const newRegionLeft = ranked.some((r) => !picked.some((p) => p.paperKey === r.paperKey) && !regionTaken(r));
    if (preferred(l) < 0 && regionTaken(l) && newRegionLeft) continue;
    picked.push(l);
  }
  if (picked.length < PAPERS) {
    process.stdout.write(`skip ${day.slug}: only ${picked.length} papers ran the story (${pages.length} front pages held)\n`);
    continue;
  }

  const papers = picked.map((l) => ({
    paper: paperFromCite(l.page.citeThis.mla, l.page.title),
    city: titleCase(l.page.city),
    state: titleCase(l.page.state),
    date: l.page.date,
    pageId: l.page.pageId,
    iiifBase: l.page.iiifBase,
    width: l.page.imageWidth,
    height: l.page.imageHeight,
    citationMla: plainCitation(l.page.citeThis.mla),
    // A paper in another language translated the news, so none of its text can match the English wire.
    language: (l.page.language ?? []).filter((x) => x !== "english").map(titleCase)[0] ?? null,
    share: l.share,
    marks: l.story.map((c) => ({ box: c.box, mark: marks[c.id], excerpt: c.text.replace(/\s+/g, " ").trim().slice(0, 280) })),
  }));
  const facts = papers
    .map((p) => {
      const own = p.marks.filter((m) => m.mark === "own");
      const lang = p.language ? ` Printed in ${p.language}: it translated or wrote its own story, so none of its text can match the English wire.` : "";
      return `${p.paper} (${p.city}, ${p.state}; ${p.date}):${lang} the story took ${pct(p.share)} of the front page; ${p.marks.length - own.length} wire pieces, ${own.length} of its own.${own.length ? ` Its own: ${own.slice(0, 3).map((m) => `"${m.excerpt.slice(0, 140)}"`).join("; ")}` : ""}`;
    })
    .join("\n");

  let note = null;
  for (let t = 0; t < 2 && !note && spent < BUDGET; t += 1) {
    const complete = makeComplete(meta, `oneday-${day.slug}-${t}-${facts.length}`, onUsage);
    const res = await askJson(Note, complete, { model: SPARK, effort: "low", prompt: COMPARER_PROMPT(day.event, facts) });
    if (!res.ok) continue;
    const v = await verifyClaim({ subjectKind: "context", subjectId: `oneday-${day.slug}`, claim: res.value.noticed, sourceText: facts, prompt: EDITOR_COMPARE_PROMPT }, { complete, loadImage: async () => "", log });
    if (v.pass) note = res.value;
    else process.stdout.write(`  ${day.slug}: editor rejected the note: ${v.reason.slice(0, 100)}\n`);
  }
  writeFileSync(`data/oneday/${day.slug}.json`, `${JSON.stringify({ slug: day.slug, builtAt: new Date().toISOString(), papers, ...(note ?? {}) }, null, 2)}\n`);
  process.stdout.write(`ok   ${day.slug}: ${papers.map((p) => `${p.paper} ${pct(p.share)}`).join(" · ")}${note ? "" : " (no note passed)"}  ($${spent.toFixed(3)})\n`);
}
