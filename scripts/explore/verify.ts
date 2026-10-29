// Explore's "Verified" badge (decision 009): the Editor checks the machine label on the strongest
// human-story clippings, strongest first, until the budget runs out.
// Usage: bun scripts/explore/verify.ts [--budget 5] [--limit 400]
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { verifyLabel } from "../../lib/editor/labels";
import { convexUrl, writeSecret } from "../../lib/game/load";
import { createLocClient } from "../../lib/loc/client";
import { cropUrl } from "../../lib/loc/paths";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { toDataUrl } from "../../lib/meta/image";
import { costOf, type Usage } from "../../lib/meta/pricing";
import { mapPool } from "../../lib/util/pool";

const flag = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const budget = Number(flag("--budget") ?? 5);
const limit = Number(flag("--limit") ?? 400);
const CONCURRENCY = 4;

type Row = { clippingId: string; type: string; people: string[]; text: string; iiifBase: string; box: { x: number; y: number; w: number; h: number } };

const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const meta = metaClient();
const loc = createLocClient({ servicesPerMinute: 60 });
const loadImage = async (url: string) => toDataUrl(await loc.getBytes(url));
let spent = 0;
const onUsage = (model: string, u: Usage) => void (spent += costOf(model, u));
const log = async (run: unknown) => void (await convex.mutation(anyApi.editorRuns.log, { secret, run }));

const rows = (await convex.query(anyApi.clippings.topForVerify, { secret, limit })) as Row[];
const tally = { pass: 0, fail: 0, skipped: 0 };
await mapPool(rows, CONCURRENCY, async (r) => {
  if (spent >= budget) return void (tally.skipped += 1);
  const complete = makeComplete(meta, `label-${r.clippingId}`, onUsage);
  const verdict = await verifyLabel({ ...r, cropUrl: cropUrl(r.iiifBase, r.box) }, { complete, loadImage, log });
  await convex.mutation(anyApi.clippings.setEditorStatus, { secret, clippingId: r.clippingId, editorStatus: verdict.pass ? "pass" : "fail" });
  tally[verdict.pass ? "pass" : "fail"] += 1;
});
process.stdout.write(
  `verified ${tally.pass + tally.fail} of ${rows.length}: ${tally.pass} pass, ${tally.fail} fail` +
    `${tally.skipped ? `, ${tally.skipped} not started (budget)` : ""} | spent $${spent.toFixed(4)} of $${budget}\n`,
);
