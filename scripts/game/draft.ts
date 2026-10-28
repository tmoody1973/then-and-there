// Drafts each picked day with the Case Writer, then runs every Editor check.
// Output: data/game/days.json (review it before importing).
import { readFileSync, writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { verifyClaim, verifyHint, verifySolvable } from "../../lib/editor/verify";
import { readFileSync as read } from "node:fs";
import { altoScale, parseAlto } from "../../lib/alto/parse";
import { draftDay, MENTION, ref, type Pick } from "../../lib/game/draftDay";
import { pickMorgue } from "../../lib/game/pickMorgue";
import { focusBox } from "../../lib/game/focus";
import { safeId } from "../../worker/fetch";
import { convexUrl, loadClips } from "../../lib/game/load";
import { createLocClient } from "../../lib/loc/client";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { toDataUrl } from "../../lib/meta/image";

const convex = new ConvexHttpClient(convexUrl());
const picks = JSON.parse(readFileSync("data/game/picks.json", "utf8")) as Pick[];
// From Jan 1889: the morgue may hold anything printed before a game day.
const loaded = await loadClips(convex, "1889-01-01", "1890-01-31");
// Frame the evidence lines for every picked clipping, from its page's cached OCR file.
const picked = new Set(picks.flatMap((p) => [...p.clueClippingIds, p.revealClippingId]));
function framed<T extends { pageId: string; box: { x: number; y: number; w: number; h: number } }>(c: T, mention: RegExp): T {
  const dir = `cache/pages/${safeId(c.pageId)}`;
  const page = parseAlto(read(`${dir}/alto.xml`, "utf8"));
  const meta = JSON.parse(read(`${dir}/meta.json`, "utf8")) as { imageWidth: number };
  const focus = focusBox(page, altoScale(page.width, meta.imageWidth), c.box, mention);
  return focus ? { ...c, focus } : c;
}
const clips = loaded.map((c) => (picked.has(c.clippingId) ? framed(c, MENTION) : c));
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
  // The Morgue (decision 008): earlier clippings that bear on the call, each Editor-checked as relevant.
  const morgue = [];
  if (pick.morgueTerms?.length) {
    const terms = new RegExp(`\\b(${pick.morgueTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
    const candidates = pickMorgue(loaded, { date1889: row.date1889, terms: pick.morgueTerms, excludeIds: [...pick.clueClippingIds, pick.revealClippingId] });
    for (const [i, m] of candidates.entries()) {
      const item = framed(m, terms);
      const ok = await verifySolvable(
        { subjectId: `day${pick.day}-morgue${i + 1}`, question: row.question.prompt, clueText: ref(item, terms).excerpt },
        { complete, log },
      );
      if (ok.pass) morgue.push(ref(item, terms));
    }
  }
  days.push(morgue.length ? { ...row, morgue } : row);
  process.stdout.write(`  morgue: ${morgue.length} kept\n`);
  process.stdout.write(`day ${row.day}: ${row.status}${row.rejectReasons.length ? ` (${row.rejectReasons.join("; ")})` : ""}\n`);
}
writeFileSync("data/game/days.json", JSON.stringify(days, null, 2));
