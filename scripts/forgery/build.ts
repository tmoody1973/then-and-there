// Builds Spot the Forgery rounds: one real 1889 front page each, one ad redrawn by Muse Image as
// a product from the future, toned to match the scan and pasted back where the ad was. The Editor
// confirms the planted product is plainly there. Every forged file carries a printed label.
// Output: public/forgery/round-N.jpg + data/forgery/rounds.json. Usage: bun scripts/forgery/build.ts [--rounds 5]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { toFile } from "openai";
import sharp from "sharp";
import { verifyClaim } from "../../lib/editor/verify";
import { pickAd, pickParts, PLANTS, toneMatch } from "../../lib/forgery/round";
import { convexUrl, writeSecret } from "../../lib/game/load";
import { createLocClient } from "../../lib/loc/client";
import { paperFromCite, plainCitation } from "../../lib/loc/cite";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { costOf, type Usage } from "../../lib/meta/pricing";
import { EDITOR_FORGERY_PROMPT } from "../../lib/pipeline/prompts";
import { withRetry } from "../../lib/util/retry";
import { safeId } from "../../worker/fetch";

const ROUNDS = Number(process.argv[process.argv.indexOf("--rounds") + 1]) || PLANTS.length;
const WIDTH = 1600; // the served page, in pixels
const LABEL_H = 56;
const MUSE_PER_IMAGE = 0.01; // Meta's published price
const MAX_EDITS = ROUNDS * 2;

type Box = { x: number; y: number; w: number; h: number };
type Page = { pageId: string; title: string; city: string; state: string; date: string; sequence: number; iiifBase: string; imageWidth: number; imageHeight: number; citeThis: { mla: string }; status: string };
type Clip = { _id: string; box: Box; segLabel: string; type?: string; rawText: string; cleanedText?: string; hardHistory?: boolean };

const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const meta = metaClient();
const loc = createLocClient({ servicesPerMinute: 60 });
let spent = 0;
let edits = 0;
const onUsage = (model: string, u: Usage) => void (spent += costOf(model, u));
const log = async (run: unknown) => void (await withRetry(() => convex.mutation(anyApi.editorRuns.log, { secret, run })));
const crop = (base: string, b: Box, w = 1000) => `${base}/${b.x},${b.y},${b.w},${b.h}/${Math.min(b.w, w)},/0/default.jpg`;
const grayStats = async (buf: Buffer) => {
  const s = await sharp(buf).grayscale().stats();
  return { mean: s.channels[0].mean, sd: s.channels[0].stdev };
};

// Muse output is not repeatable, so each edit is kept on disk and reused on a rerun.
async function museEdit(key: string, original: Buffer, prompt: string): Promise<Buffer> {
  const path = `cache/forgery/${key}.webp`;
  if (existsSync(path)) return readFileSync(path);
  edits += 1;
  spent += MUSE_PER_IMAGE;
  const res = (await meta.images.edit({ model: "muse-image-1.0", prompt, image: await toFile(original, "ad.jpg", { type: "image/jpeg" }), n: 1 } as never)) as { data?: Array<{ b64_json?: string }> };
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("muse returned no image");
  const out = Buffer.from(b64, "base64");
  writeFileSync(path, out);
  return out;
}

const label = (w: number) =>
  Buffer.from(
    `<svg width="${w}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#b1271d"/><text x="50%" y="36" text-anchor="middle" font-family="Menlo, monospace" font-size="22" font-weight="700" fill="#faf9f5" letter-spacing="2">ALTERED FOR A GAME · NOT A REAL PAGE · THEN &amp; THERE</text></svg>`,
  );

mkdirSync("cache/forgery", { recursive: true });
mkdirSync("public/forgery", { recursive: true });
mkdirSync("data/forgery", { recursive: true });

const pages = ((await withRetry(() => convex.query(anyApi.pages.byDateRange, { secret, start: "1889-11-01", end: "1890-01-31" }))) as Page[]).filter(
  (p) => p.status === "processed" && p.sequence === 1,
);
const rounds: Array<Record<string, unknown>> = [];
const skipped: string[] = [];
for (const p of pages) {
  if (rounds.length >= ROUNDS || edits >= MAX_EDITS) break;
  const rows = (await withRetry(() => convex.query(anyApi.clippings.byPage, { pageId: p.pageId }))) as Clip[];
  const clips = rows.map((c) => ({ id: c._id, box: c.box, type: c.type, segLabel: c.segLabel, text: c.cleanedText ?? c.rawText, hardHistory: c.hardHistory === true }));
  const dims = { width: p.imageWidth, height: p.imageHeight };
  const ad = pickAd(clips, dims);
  if (!ad) continue;
  const parts = pickParts(clips, dims, ad.id);
  if (parts.length < 5) continue;
  const plant = PLANTS[rounds.length % PLANTS.length];
  const paper = paperFromCite(p.citeThis.mla, p.title);
  try {
    // 1. The ad as the Library serves it, and Muse's redrawing of it.
    const original = Buffer.from(await loc.getBytes(crop(p.iiifBase, ad.box)));
    const edited = await museEdit(`${safeId(p.pageId)}-${rounds.length % PLANTS.length}`, original, plant.prompt);
    // 2. The Editor looks at the redrawn ad: is the planted product plainly there?
    const complete = makeComplete(meta, `forgery-${p.pageId}-${plant.product}`, onUsage);
    const asJpeg = await sharp(edited).jpeg().toBuffer();
    const v = await verifyClaim(
      { subjectKind: "clue", subjectId: `forgery-${p.pageId}`, claim: `This newspaper advertisement is for ${plant.product}.`, sourceText: "(no transcription; judge from the image)", cropUrl: "edited", prompt: EDITOR_FORGERY_PROMPT },
      { complete, loadImage: async () => `data:image/jpeg;base64,${asJpeg.toString("base64")}`, log },
    );
    if (!v.pass) throw new Error(`editor: ${v.reason.slice(0, 100)}`);
    // 3. Tone the edit to the scan, scale it into the ad's place on the served page, label the file.
    const scale = WIDTH / p.imageWidth;
    const H = Math.round(p.imageHeight * scale);
    const at = { x: Math.round(ad.box.x * scale), y: Math.round(ad.box.y * scale), w: Math.round(ad.box.w * scale), h: Math.round(ad.box.h * scale) };
    const { a, b } = toneMatch(await grayStats(original), await grayStats(edited));
    const patch = await sharp(edited).grayscale().linear(a, b).resize(at.w, at.h, { fit: "fill" }).blur(0.4).toBuffer();
    const pageImg = Buffer.from(await loc.getBytes(`${p.iiifBase}/full/${WIDTH},/0/default.jpg`));
    const n = rounds.length + 1;
    await sharp(pageImg)
      .resize(WIDTH, H, { fit: "fill" })
      .extend({ bottom: LABEL_H, background: "#b1271d" })
      .composite([{ input: patch, left: at.x, top: at.y }, { input: label(WIDTH), left: 0, top: H }])
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(`public/forgery/round-${n}.jpg`);
    rounds.push({
      round: n,
      image: `/forgery/round-${n}.jpg`,
      width: WIDTH,
      height: H,
      pageId: p.pageId,
      iiifBase: p.iiifBase,
      paper,
      place: `${p.city.replace(/\b\w/g, (c) => c.toUpperCase())}, ${p.state.replace(/\b\w/g, (c) => c.toUpperCase())}`,
      date: p.date,
      citationMla: plainCitation(p.citeThis.mla),
      product: plant.product,
      why: plant.why,
      // Boxes in served-page pixels for the tap targets; the forged one also in page pixels for the real crop.
      parts: parts.map((q) => ({ n: q.n, label: q.label, forged: q.forged, box: { x: Math.round(q.box.x * scale), y: Math.round(q.box.y * scale), w: Math.round(q.box.w * scale), h: Math.round(q.box.h * scale) } })),
      originalBox: ad.box,
    });
    process.stdout.write(`ok   round ${n}: ${p.date} ${paper} · ${plant.product}  ($${spent.toFixed(3)})\n`);
  } catch (e) {
    skipped.push(`${p.date} ${paper}: ${(e instanceof Error ? e.message : String(e)).split("\n")[0].slice(0, 140)}`);
  }
}
writeFileSync("data/forgery/rounds.json", `${JSON.stringify({ builtAt: new Date().toISOString(), rounds }, null, 2)}\n`);
process.stdout.write(`${rounds.length} rounds · ${edits} Muse edits · ~$${spent.toFixed(3)} (Muse at its published $0.01/image)\n${skipped.map((s) => `  skipped ${s}`).join("\n")}\n`);
