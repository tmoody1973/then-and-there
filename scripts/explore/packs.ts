// Builds the printable teacher packs: verified clippings plus 3 Editor-checked discussion questions.
// Usage: bun scripts/explore/packs.ts [--budget 1]
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { z } from "zod";
import { verifyClaim } from "../../lib/editor/verify";
import { buildPack, checkQuestions, PACKS, QUESTIONS } from "../../lib/explore/packs";
import { loadPool } from "../../lib/explore/pool";
import { convexUrl, writeSecret } from "../../lib/game/load";
import { makeComplete, metaClient } from "../../lib/meta/client";
import { costOf, type Usage } from "../../lib/meta/pricing";
import { askJson } from "../../lib/pipeline/askJson";
import { EDITOR_FIND_PROMPT, PACK_QUESTIONS_PROMPT } from "../../lib/pipeline/prompts";
import { withRetry } from "../../lib/util/retry";

const i = process.argv.indexOf("--budget");
const budget = Number(i >= 0 ? process.argv[i + 1] : 1);
const convex = new ConvexHttpClient(convexUrl());
const secret = writeSecret();
const meta = metaClient();
let spent = 0;
const onUsage = (model: string, u: Usage) => void (spent += costOf(model, u));
const log = async (run: unknown) => void (await withRetry(() => convex.mutation(anyApi.editorRuns.log, { secret, run })));
const Questions = z.object({ questions: z.array(z.string().min(10)) });
const model = process.env.META_MODEL_SPARK ?? "";

const pool = await loadPool(convex, secret);
const packs: Array<ReturnType<typeof buildPack> & { slug: string; title: string; theme: string; questions: string[] }> = [];
for (const def of PACKS) {
  const { items, hardItems } = buildPack(def, pool);
  if (!items.length || spent >= budget) {
    process.stdout.write(`${def.slug}: skipped (${items.length ? "budget" : "no verified clippings"})\n`);
    continue;
  }
  const excerpts = items.map((x) => x.excerpt);
  const complete = makeComplete(meta, `pack-${def.slug}`, onUsage);
  const ask = async (count: number, avoid: string[] = []) => {
    const res = await askJson(Questions, complete, { model, effort: "low", prompt: PACK_QUESTIONS_PROMPT(def.theme, excerpts, count, avoid) });
    return res.ok ? res.value.questions.slice(0, count) : [];
  };
  const drafted = await ask(QUESTIONS);
  let n = 0;
  const questions = await checkQuestions(drafted, {
    verify: async (q) =>
      (await verifyClaim(
        { subjectKind: "question", subjectId: `pack-${def.slug}-q${(n += 1)}`, claim: `Students can answer or discuss this from these clippings alone: ${q}`, sourceText: excerpts.join("\n\n"), prompt: EDITOR_FIND_PROMPT },
        { complete, loadImage: async () => "", log },
      )).pass,
    replace: async (q) => (await ask(1, [...drafted, q]))[0] ?? "",
  });
  packs.push({ slug: def.slug, title: def.title, theme: def.theme, items, hardItems, questions });
  process.stdout.write(`${def.slug}: ${items.length} clippings (+${hardItems.length} flagged, opt-in), ${questions.length}/${QUESTIONS} questions passed the Editor\n`);
}
await withRetry(() => convex.mutation(anyApi.packs.replacePacks, { secret, packs }));
process.stdout.write(`spent $${spent.toFixed(4)} of $${budget}\n`);
