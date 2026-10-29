// Builds Case 01 (decision 011): for each stop on Bly's route, the Game Master picks the clipping
// that reports her there and writes the clue card; the Editor checks the card against the crop
// and checks the hint doesn't give the next stop away. Stops nothing passes are left out.
// Output: data/detective/case01.json (review it before shipping).
// Usage: bun scripts/detective/build.ts [--budget 2]
import { writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { z } from "zod";
import { iiifCropUrl } from "../../components/iiif";
import { clueEligible, leaksNext, STOPS } from "../../lib/detective/case";
import { verifyClaim, verifyHint } from "../../lib/editor/verify";
import { passage, ref } from "../../lib/game/draftDay";
import { framed } from "../../lib/game/framed";
import { convexUrl, loadClips, writeSecret } from "../../lib/game/load";
import { createLocClient } from "../../lib/loc/client";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { toDataUrl } from "../../lib/meta/image";
import { costOf, type Usage } from "../../lib/meta/pricing";
import { askJson } from "../../lib/pipeline/askJson";
import { DETECTIVE_GM_PROMPT } from "../../lib/pipeline/prompts";
import { withRetry } from "../../lib/util/retry";

const BUDGET = Number(process.argv[process.argv.indexOf("--budget") + 1]) || 2;
const SPARK = process.env.META_MODEL_SPARK ?? "";
const LISTED = 10;
const TRIES = 3;
const BLY = /\b(Bly|Cochrane?)\b/i;

const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const meta = metaClient();
const loc = createLocClient({ servicesPerMinute: 60 });
let spent = 0;
const onUsage = (model: string, u: Usage) => void (spent += costOf(model, u));
const log = async (run: unknown) => void (await withRetry(() => convex.mutation(anyApi.editorRuns.log, { secret, run })));
const loadImage = async (url: string) => toDataUrl(await loc.getBytes(url));
// The shared helper rounds: the Library's image server answers HTTP 500 to fractional pixels.
const crop = (base: string, b: Parameters<typeof iiifCropUrl>[1]) => iiifCropUrl(base, b, 1000);

const clips = await loadClips(convex, "1889-11-14", "1890-02-28");
const Card = z.object({ i: z.number().int(), summary: z.string().min(8), title: z.string().min(3), hint: z.string().min(8).optional() });

const stops = [];
const skipped: string[] = [];
// Every stop but home gets a card; home is the finish line (the finale ballot).
for (let n = 0; n < STOPS.length - 1; n += 1) {
  const stop = STOPS[n];
  const asks = n + 1 < STOPS.length - 1; // the last leg (San Francisco) asks for her time instead
  const next = asks ? STOPS[n + 1].name : null;
  // Earliest first: the news of the day, not the look back.
  let pool = clips.filter((c) => clueEligible(c, n) && c.type !== "ad").sort((a, b) => a.date.localeCompare(b.date) || a.text.length - b.text.length).slice(0, LISTED);
  let card = null;
  for (let t = 0; t < TRIES && pool.length && !card && spent < BUDGET; t += 1) {
    const complete = makeComplete(meta, `detective-${n}-${pool.map((c) => c.clippingId).join(",")}`, onUsage);
    const listing = pool.map((c, i) => `[${i}] (${c.date}, ${c.paper}) ${passage(c.text).replace(/\s+/g, " ").slice(0, 600)}`).join("\n");
    const gm = await askJson(Card, complete, { model: SPARK, effort: "low", prompt: DETECTIVE_GM_PROMPT(stop.place, next, listing) });
    if (!gm.ok || !pool[gm.value.i] || (asks && !gm.value.hint)) {
      skipped.push(`${stop.name}: game master ${gm.ok ? "picked off the list or left out the hint" : gm.error.slice(0, 60)}`);
      break;
    }
    const { i, summary, title, hint } = gm.value;
    const c = framed(pool[i], BLY);
    pool = pool.filter((_, k) => k !== i);
    if ([summary, title, hint ?? ""].some((s) => leaksNext(s, n))) {
      skipped.push(`${stop.name}: card names the next stop`);
      continue;
    }
    const v = await verifyClaim({ subjectKind: "clue", subjectId: `detective-${n}-${c.clippingId}`, claim: `${title}. ${summary}`, sourceText: c.text, cropUrl: crop(c.iiifBase, c.focus ?? c.box) }, { complete, loadImage, log });
    if (!v.pass) {
      skipped.push(`${stop.name}: editor rejected (${c.date} ${c.paper}): ${v.reason.slice(0, 90)}`);
      continue;
    }
    if (hint && next) {
      const h = await verifyHint({ subjectId: `detective-${n}-hint`, hint, answer: next }, { complete, log });
      if (!h.pass) {
        skipped.push(`${stop.name}: hint gives it away: ${h.reason.slice(0, 90)}`);
        continue;
      }
    }
    card = { n, name: stop.name, place: stop.place, clue: ref(c, BLY), summary, title, ...(hint ? { hint } : {}) };
  }
  if (card) stops.push(card);
  else skipped.push(`${stop.name}: left out (${clips.filter((c) => clueEligible(c, n)).length} eligible clippings)`);
  process.stdout.write(`${card ? "ok  " : "skip"} ${stop.name}  ($${spent.toFixed(3)})\n`);
}

writeFileSync("data/detective/case01.json", `${JSON.stringify({ builtAt: new Date().toISOString(), stops }, null, 2)}\n`);
process.stdout.write(`${stops.length} of ${STOPS.length - 1} stops built · $${spent.toFixed(3)} spent\n${skipped.map((s) => `  ${s}`).join("\n")}\n`);
