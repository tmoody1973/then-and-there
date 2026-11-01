// Tightens one Front Page clue's crop when the page cutter glued a neighbor onto it (a dateline
// or a printed year that gives the answer away). The clue's Editor-checked words must still
// describe what stays. Rewrites the whole rotation from an export of the target's own rows.
//
//   bunx convex data frontPages --format jsonLines > cache/fp-local.jsonl
//   bun scripts/frontpage/trim.ts cache/fp-local.jsonl 4 1 17,5074,631,565 [--prod]
import { readFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { convexUrl, writeSecret } from "../../lib/game/load";
import { withRetry } from "../../lib/util/retry";

const [file, noArg, clueArg, boxArg] = process.argv.slice(2);
const PROD = process.argv.includes("--prod");
const [x, y, w, h] = (boxArg ?? "").split(",").map(Number);
if (!file || !noArg || !clueArg || [x, y, w, h].some((n) => !Number.isInteger(n) || n < 0)) throw new Error("usage: trim.ts <rows.jsonl> <no> <clue 1-6> <x,y,w,h> [--prod]");

const prodEnv = PROD ? readFileSync(".env.convex-prod", "utf8") : "";
const fromProd = (key: string) => prodEnv.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() ?? "";
const client = new ConvexHttpClient(PROD ? fromProd("CONVEX_URL") : convexUrl());
const secret = PROD ? fromProd("CONVEX_WRITE_SECRET") : writeSecret();

type Box = { x: number; y: number; w: number; h: number };
type Row = { _id?: string; _creationTime?: number; no: number; iiifBase: string; clues: Array<{ box: Box; image: string }> } & Record<string, unknown>;
const rows = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l) as Row);
const row = rows.find((r) => r.no === Number(noArg));
const k = Number(clueArg) - 1;
if (!row || !row.clues[k]) throw new Error(`no round ${noArg} clue ${clueArg} in ${file}`);
const old = row.clues[k].box;
if (x < old.x || y < old.y || x + w > old.x + old.w || y + h > old.y + old.h) throw new Error("the new box must sit inside the old one: trim, never widen");

const box = { x, y, w, h };
const res = await fetch(`${row.iiifBase}/${x},${y},${w},${h}/${Math.min(w, 900)},/0/default.jpg`);
if (!res.ok) throw new Error(`crop HTTP ${res.status}`);
const url = (await withRetry(() => client.mutation(anyApi.frontPages.uploadUrl, { secret }))) as string;
const up = await fetch(url, { method: "POST", headers: { "content-type": "image/jpeg" }, body: await res.blob() });
if (!up.ok) throw new Error(`upload HTTP ${up.status}`);
const image = ((await up.json()) as { storageId: string }).storageId;

const next = rows.map(({ _id: _i, _creationTime: _c, ...r }) => (r.no === row.no ? { ...r, clues: r.clues.map((c, i) => (i === k ? { ...c, box, image } : c)) } : r));
await withRetry(() => client.mutation(anyApi.frontPages.replaceAll, { secret, rows: next }));
process.stdout.write(`${PROD ? "prod" : "local"}: round ${row.no} clue ${k + 1} ${JSON.stringify(old)} -> ${JSON.stringify(box)}\n`);
