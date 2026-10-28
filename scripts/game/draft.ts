// Drafts each picked day with the Case Writer, then runs every Editor check.
// Output: data/game/days.json (review it before importing).
import { readFileSync, writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { verifyClaim } from "../../lib/editor/verify";
import { draftDay, type Pick } from "../../lib/game/draftDay";
import { convexUrl, loadClips } from "../../lib/game/load";
import { createLocClient } from "../../lib/loc/client";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { toDataUrl } from "../../lib/meta/image";

const convex = new ConvexHttpClient(convexUrl());
const picks = JSON.parse(readFileSync("data/game/picks.json", "utf8")) as Pick[];
const clips = await loadClips(convex, "1889-11-14", "1890-01-31");
const meta = metaClient();
const loc = createLocClient({ servicesPerMinute: 60 });
const loadImage = async (url: string) => toDataUrl(await loc.getBytes(url));

const days = [];
for (const pick of picks) {
  const complete = makeComplete(meta, `game-day-${pick.day}`);
  const row = await draftDay(pick, clips, {
    complete,
    verify: (input) =>
      verifyClaim(input, { complete, loadImage, log: async (run) => void (await convex.mutation(anyApi.editorRuns.log, { run })) }),
  });
  days.push(row);
  process.stdout.write(`day ${row.day}: ${row.status}${row.rejectReasons.length ? ` (${row.rejectReasons.join("; ")})` : ""}\n`);
}
writeFileSync("data/game/days.json", JSON.stringify(days, null, 2));
