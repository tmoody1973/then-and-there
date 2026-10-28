// Loads reviewed content into Convex: days.json (all statuses; only "published" is ever served)
// and meanwhile.json.
import { readFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { convexUrl, writeSecret } from "../../lib/game/load";

const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const days = JSON.parse(readFileSync("data/game/days.json", "utf8")) as Array<{ day: number; status: string }>;
for (const row of days) await convex.mutation(anyApi.gameDays.upsert, { secret, row });
const meanwhile = JSON.parse(readFileSync("data/game/meanwhile.json", "utf8")) as Array<{ date1889: string; rows: unknown[] }>;
for (const m of meanwhile) await convex.mutation(anyApi.meanwhile.replaceForDate, { secret, ...m });
process.stdout.write(`imported ${days.length} days (${days.filter((d) => d.status === "published").length} published), ${meanwhile.length} meanwhile dates\n`);
