// Drafts each picked day with the Case Writer, then runs every Editor check.
// Output: data/game/days.json (review it before importing).
import { readFileSync, writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { verifyClaim, verifyHint, verifySolvable } from "../../lib/editor/verify";
import { readFileSync as read } from "node:fs";
import { altoScale, parseAlto } from "../../lib/alto/parse";
import { draftDay, MENTION, type Pick } from "../../lib/game/draftDay";
import { focusBox } from "../../lib/game/focus";
import { safeId } from "../../worker/fetch";
import { convexUrl, loadClips } from "../../lib/game/load";
import { createLocClient } from "../../lib/loc/client";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { toDataUrl } from "../../lib/meta/image";

const convex = new ConvexHttpClient(convexUrl());
const picks = JSON.parse(readFileSync("data/game/picks.json", "utf8")) as Pick[];
const loaded = await loadClips(convex, "1889-11-14", "1890-01-31");
// Frame the evidence lines for every picked clipping, from its page's cached OCR file.
const picked = new Set(picks.flatMap((p) => [...p.clueClippingIds, p.revealClippingId]));
const clips = loaded.map((c) => {
  if (!picked.has(c.clippingId)) return c;
  const dir = `cache/pages/${safeId(c.pageId)}`;
  const page = parseAlto(read(`${dir}/alto.xml`, "utf8"));
  const meta = JSON.parse(read(`${dir}/meta.json`, "utf8")) as { imageWidth: number };
  const focus = focusBox(page, altoScale(page.width, meta.imageWidth), c.box, MENTION);
  return focus ? { ...c, focus } : c;
});
const meta = metaClient();
const loc = createLocClient({ servicesPerMinute: 60 });
const loadImage = async (url: string) => toDataUrl(await loc.getBytes(url));

const days = [];
for (const pick of picks) {
  const complete = makeComplete(meta, `game-day-${pick.day}`);
  const log = async (run: Parameters<typeof convex.mutation>[1]) => void (await convex.mutation(anyApi.editorRuns.log, { run }));
  const row = await draftDay(pick, clips, {
    complete,
    verify: (input) => verifyClaim(input, { complete, loadImage, log }),
    verifySolvable: (input) => verifySolvable(input, { complete, log }),
    verifyHint: (input) => verifyHint(input, { complete, log }),
  });
  days.push(row);
  process.stdout.write(`day ${row.day}: ${row.status}${row.rejectReasons.length ? ` (${row.rejectReasons.join("; ")})` : ""}\n`);
}
writeFileSync("data/game/days.json", JSON.stringify(days, null, 2));
