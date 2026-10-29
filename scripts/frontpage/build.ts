// Builds the daily front pages (decision 010): picks varied front pages, has the Game Master
// choose the ad, weather, prices, picture and headline, has the Editor check every clue against
// its crop, stores the crops in Convex storage, and replaces the frontPages table.
// Usage: bun scripts/frontpage/build.ts [--max 12] [--budget 4] [--dry]
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { z } from "zod";
import { verifyClaim } from "../../lib/editor/verify";
import { bandClear, clueLabel, type Kind, mastheadBox, orderClues, type Picks, type RoundClip, TEXT_CLUES, validatePicks } from "../../lib/frontpage/round";
import { regionOf } from "../../lib/frontpage/rules";
import { convexUrl, writeSecret } from "../../lib/game/load";
import { createLocClient } from "../../lib/loc/client";
import { paperFromCite } from "../../lib/loc/cite";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { toDataUrl } from "../../lib/meta/image";
import { costOf, type Usage } from "../../lib/meta/pricing";
import { askJson } from "../../lib/pipeline/askJson";
import { EDITOR_CLUE_PROMPT, FRONT_PAGE_GM_PROMPT, FRONT_PAGE_PHOTO_PROMPT } from "../../lib/pipeline/prompts";
import { mapPool } from "../../lib/util/pool";
import { withRetry } from "../../lib/util/retry";

const arg = (name: string, fallback: number) => Number(process.argv[process.argv.indexOf(`--${name}`) + 1] || fallback);
const MAX = process.argv.includes("--max") ? arg("max", 12) : 12;
const BUDGET = process.argv.includes("--budget") ? arg("budget", 4) : 4;
const DRY = process.argv.includes("--dry");
// No region fills more than a third of the rotation, or "Midwest" becomes the safe guess.
const REGION_CAP = Math.ceil(MAX / 3);
const SPARK = process.env.META_MODEL_SPARK ?? "";
const CROP_WIDTH = 1000;
const MAX_SHARE = 0.25;
const MIN_TEXT = 40; // characters; shorter clippings are page furniture
const LISTED = 40;

type Box = { x: number; y: number; w: number; h: number };
type Page = { pageId: string; title: string; city: string; state: string; date: string; sequence: number; iiifBase: string; imageWidth: number; imageHeight: number; citeThis: { apa: string; chicago: string; mla: string }; status: string };
type Clip = { _id: string; box: Box; segLabel: string; type?: string; rawText: string; cleanedText?: string; hardHistory?: boolean };

const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const meta = metaClient();
const loc = createLocClient({ servicesPerMinute: 60 });
let spent = 0;
const onUsage = (model: string, u: Usage) => void (spent += costOf(model, u));
const log = async (run: unknown) => void (await withRetry(() => convex.mutation(anyApi.editorRuns.log, { secret, run })));
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const share = (b: Box, p: Page) => (b.w * b.h) / (p.imageWidth * p.imageHeight);
const crop = (p: Page, b: Box) => `${p.iiifBase}/${b.x},${b.y},${b.w},${b.h}/${Math.min(b.w, CROP_WIDTH)},/0/default.jpg`;

// Crops are fetched once: the Editor sees the same bytes we store.
const bytesByUrl = new Map<string, Uint8Array>();
async function bytesOf(url: string) {
  if (!bytesByUrl.has(url)) bytesByUrl.set(url, await loc.getBytes(url));
  return bytesByUrl.get(url)!;
}

// ---- 1. Candidate pages: front pages with every kind of clue, spread across regions and decades.
const pages = ((await convex.query(anyApi.pages.byDateRange, { secret, start: "1700-01-01", end: "1930-12-31" })) as Page[]).filter(
  (p) => p.status === "processed" && p.sequence === 1 && regionOf(p.state),
);
const loaded = await mapPool(pages, 8, async (p) => {
  const rows = (await withRetry(() => convex.query(anyApi.clippings.byPage, { pageId: p.pageId }))) as Clip[];
  const clips: RoundClip[] = rows.map((c) => ({ clippingId: c._id, segLabel: c.segLabel, type: c.type, text: c.cleanedText ?? c.rawText, hardHistory: c.hardHistory === true, box: c.box }));
  return { page: p, clips };
});
const usable = (p: Page, c: RoundClip) => !c.hardHistory && share(c.box, p) <= MAX_SHARE;
const candidates = (p: Page, clips: RoundClip[]) => ({
  text: clips.flatMap((c, i) => (usable(p, c) && c.segLabel !== "photograph" && c.text.trim().length >= MIN_TEXT ? [i] : [])),
  photo: clips.flatMap((c, i) => (usable(p, c) && c.segLabel === "photograph" && share(c.box, p) >= 0.01 ? [i] : [])),
});
const eligible = loaded.filter(({ page, clips }) => { const c = candidates(page, clips); return c.photo.length && c.text.length >= TEXT_CLUES + 2; });
const groups = new Map<string, typeof eligible>();
for (const e of [...eligible].sort((a, b) => a.page.date.localeCompare(b.page.date))) {
  const key = `${regionOf(e.page.state)}-${e.page.date.slice(0, 3)}`;
  groups.set(key, [...(groups.get(key) ?? []), e]);
}
const ordered: typeof eligible = [];
for (let round = 0; ordered.length < eligible.length; round += 1)
  for (const g of groups.values()) if (g[round]) ordered.push(g[round]);
process.stdout.write(`${pages.length} front pages, ${eligible.length} with every clue kind, ${groups.size} region-decade groups\n`);

// ---- 2. Game Master, Editor, storage, per page.
const GmPick = z.object({ i: z.number().int(), prints: z.string().min(8), why: z.string().min(8) });
const GmSchema = z.object({ clues: z.array(GmPick.extend({ kind: z.string() })) });
const PhotoSchema = z.object({ prints: z.string().min(8), why: z.string().min(8) });

async function upload(bytes: Uint8Array): Promise<string> {
  const url = (await withRetry(() => convex.mutation(anyApi.frontPages.uploadUrl, { secret }))) as string;
  const res = await fetch(url, { method: "POST", headers: { "content-type": "image/jpeg" }, body: new Blob([bytes as BlobPart]) });
  if (!res.ok) throw new Error(`upload failed: HTTP ${res.status}`);
  return ((await res.json()) as { storageId: string }).storageId;
}

const rows: Array<Record<string, unknown>> = [];
const skipped: string[] = [];
for (const { page: p, clips } of ordered) {
  if (rows.length >= MAX) break;
  if (spent >= BUDGET) {
    skipped.push("budget reached");
    break;
  }
  const paper = paperFromCite(p.citeThis.mla, p.title);
  const year = Number(p.date.slice(0, 4));
  const region = regionOf(p.state)!;
  if (rows.filter((r) => r.region === region).length >= REGION_CAP) continue;
  const answer = `${paper}, ${titleCase(p.city)}, ${titleCase(p.state)} (${region}), ${p.date}`;
  const complete = makeComplete(meta, `frontpage-${p.pageId}`, onUsage);
  const loadImage = async (url: string) => toDataUrl(await bytesOf(url));
  const cand = candidates(p, clips);
  // The smallest clippings first: clues are snippets, and the list is capped.
  const listed = [...cand.text].sort((a, b) => share(clips[a].box, p) - share(clips[b].box, p)).slice(0, LISTED).sort((a, b) => a - b);
  const listing = listed
    .map((i) => `[${i}] (${clips[i].segLabel}${clips[i].type ? `/${clips[i].type}` : ""}, ${Math.round(share(clips[i].box, p) * 100)}% of page) ${clips[i].text.replace(/\s+/g, " ").slice(0, 260)}`)
    .join("\n");
  const label = `${p.date} ${paper}`;
  try {
    const gm = await askJson(GmSchema, complete, { model: SPARK, effort: "low", prompt: FRONT_PAGE_GM_PROMPT(answer, listing) });
    if (!gm.ok) throw new Error(`game master: ${gm.error.slice(0, 80)}`);
    const offList = gm.value.clues.filter((c) => !listed.includes(c.i)).map((c) => c.i);
    if (offList.length) throw new Error(`game master picked unlisted clippings ${offList.join(", ")}`);
    const photoIdx = [...cand.photo].sort((a, b) => clips[b].box.w * clips[b].box.h - clips[a].box.w * clips[a].box.h)[0];
    const photoUrl = crop(p, clips[photoIdx].box);
    const photo = await askJson(PhotoSchema, complete, { model: SPARK, effort: "low", prompt: FRONT_PAGE_PHOTO_PROMPT(answer, clips[photoIdx].text.trim().slice(0, 200)), imageDataUrl: await loadImage(photoUrl) });
    if (!photo.ok) throw new Error(`photo: ${photo.error.slice(0, 80)}`);
    const picks: Picks = { text: gm.value.clues, photo: { i: photoIdx, ...photo.value } };
    const errors = validatePicks(picks, clips, p.imageWidth, p.imageHeight);
    if (errors.length) throw new Error(errors.join("; "));

    const clue = (i: number, kind: Kind, prints: string, why: string) => ({ kind, label: clueLabel(kind, year), box: clips[i].box, url: crop(p, clips[i].box), prints, why, src: clips[i].text });
    const clues = [...picks.text.map((t) => clue(t.i, t.kind as Kind, t.prints, t.why)), clue(photoIdx, "photo", picks.photo.prints, picks.photo.why)];
    for (const c of clues) {
      const v = await verifyClaim({ subjectKind: "clue", subjectId: `fp-${p.pageId}-${c.kind}-${c.box.x}-${c.box.y}`, claim: `KIND: ${c.label}. PRINTS: ${c.prints} WHY: ${c.why}`, sourceText: c.src, cropUrl: c.url, prompt: EDITOR_CLUE_PROMPT }, { complete, loadImage, log });
      if (!v.pass) throw new Error(`editor rejected ${c.kind}: ${v.reason.slice(0, 100)}`);
    }
    // The masthead: the top band, widened once if the Editor can't see the nameplate in it.
    let masthead = null;
    for (const s of [0.12, 0.16]) {
      const box = mastheadBox(p.imageWidth, p.imageHeight, s);
      if (!bandClear(box, clips)) continue;
      const m = { kind: "masthead" as const, src: "", label: clueLabel("masthead", year), box, url: crop(p, box), prints: `The nameplate reads "${paper}".`, why: "A paper's nameplate usually carries its town's name, which is why it is the last clue." };
      const v = await verifyClaim({ subjectKind: "clue", subjectId: `fp-${p.pageId}-masthead-${s}`, claim: `KIND: ${m.label}. PRINTS: ${m.prints} WHY: ${m.why}`, sourceText: "(no transcription; judge from the image)", cropUrl: m.url, prompt: EDITOR_CLUE_PROMPT }, { complete, loadImage, log });
      if (v.pass) {
        masthead = m;
        break;
      }
    }
    if (!masthead) throw new Error("editor could not see the nameplate");

    const stored = [];
    for (const c of orderClues(clues.slice(0, TEXT_CLUES), clues[TEXT_CLUES], masthead)) stored.push({ kind: c.kind, label: c.label, box: c.box, image: DRY ? "dry" : await upload(await bytesOf(c.url)), prints: c.prints, why: c.why });
    rows.push({
      no: rows.length + 1, pageId: p.pageId, paper, city: p.city, state: p.state, region, date: p.date, year, citeThis: p.citeThis,
      iiifBase: p.iiifBase, imageWidth: p.imageWidth, imageHeight: p.imageHeight, clues: stored,
    });
    process.stdout.write(`  no. ${rows.length}: ${label} (${region})\n`);
  } catch (e) {
    const why = (e instanceof Error ? e.message : String(e)).split("\n")[0].slice(0, 160);
    skipped.push(`${label}: ${why}`);
    process.stdout.write(`  skipped ${label}: ${why}\n`);
  }
}

if (!DRY && rows.length) await withRetry(() => convex.mutation(anyApi.frontPages.replaceAll, { secret, rows }));
process.stdout.write(`${rows.length} front pages ${DRY ? "built (dry run, not saved)" : "saved"}, ${skipped.length} skipped | spent $${spent.toFixed(4)} of $${BUDGET}\n`);
