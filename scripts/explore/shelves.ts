// Builds Explore's opening shelves from processed, pre-1931 pages. No model calls.
// Usage: bun scripts/explore/shelves.ts
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { loadPool } from "../../lib/explore/pool";
import { buildShelf, SHELVES } from "../../lib/explore/shelves";
import { convexUrl, writeSecret } from "../../lib/game/load";
import { withRetry } from "../../lib/util/retry";

const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const pool = await loadPool(convex, secret);
const shelves = SHELVES.map(({ select: _s, ...shelf }) => ({
  ...shelf,
  cards: buildShelf(SHELVES.find((x) => x.slug === shelf.slug)!, pool).map(({ lccn: _l, humanStoryScore: _h, ...card }) => card),
}));
await withRetry(() => convex.mutation(anyApi.explore.replaceShelves, { secret, shelves }));
for (const s of shelves) process.stdout.write(`${s.slug}: ${s.cards.length} cards (${s.cards.filter((c) => c.editorStatus === "pass").length} verified)\n`);
