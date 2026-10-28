// Picks "meanwhile, back home" stories for each picked day's date. Deterministic.
// Output: data/game/meanwhile.json
import { readFileSync, writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import type { Pick } from "../../lib/game/draftDay";
import { convexUrl, loadClips } from "../../lib/game/load";
import { pickMeanwhile } from "../../lib/game/pickMeanwhile";
import { date1889ForDay } from "../../lib/game/schedule";

const picks = JSON.parse(readFileSync("data/game/picks.json", "utf8")) as Pick[];
const clips = await loadClips(new ConvexHttpClient(convexUrl()), "1889-11-10", "1890-01-31");
const out = picks.map((p) => {
  const date1889 = date1889ForDay(p.day);
  return { date1889, rows: pickMeanwhile(clips, date1889).map((r) => ({ ...r, date1889 })) };
});
writeFileSync("data/game/meanwhile.json", JSON.stringify(out, null, 2));
for (const o of out) process.stdout.write(`${o.date1889}: ${o.rows.length} picks (${o.rows.map((r) => r.scope).join(", ")})\n`);
