// Lists every processed clipping that mentions Bly, her real name, or her rival, by date.
// No model calls. Output: data/game/candidates.json, read by a human to write picks.json.
import { writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { convexUrl, loadClips } from "../../lib/game/load";

const MENTION = /\b(Bly|Cochrane?|Bisland)\b/i;
const clips = await loadClips(new ConvexHttpClient(convexUrl()), "1889-11-14", "1890-01-31");
const hits = clips.filter((c) => MENTION.test(c.text));
const byDate: Record<string, Array<{ clippingId: string; paper: string; state: string; excerpt: string }>> = {};
for (const c of hits.sort((a, b) => a.date.localeCompare(b.date))) {
  (byDate[c.date] ??= []).push({ clippingId: c.clippingId, paper: c.paper, state: c.state, excerpt: c.text.slice(0, 300) });
}
writeFileSync("data/game/candidates.json", JSON.stringify(byDate, null, 2));
process.stdout.write(`${hits.length} clippings across ${Object.keys(byDate).length} dates -> data/game/candidates.json\n`);
