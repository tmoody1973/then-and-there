// The Editor: an independent check of one claim against its source clipping.
// Fails closed. Anything unreadable or unreachable is a fail, never a pass.
import { z } from "zod";
import type { EditorRun } from "../../convex/editorRuns";
import { askJson, type Complete } from "../pipeline/askJson";
import { EDITOR_PROMPT } from "../pipeline/prompts";

const VerdictSchema = z.object({ pass: z.boolean(), reason: z.string() });

export async function verifyClaim(
  input: { subjectKind: EditorRun["subjectKind"]; subjectId: string; claim: string; sourceText: string; cropUrl: string },
  deps: { complete: Complete; loadImage: (url: string) => Promise<string>; log: (run: EditorRun) => Promise<void> },
): Promise<{ pass: boolean; reason: string }> {
  const model = process.env.META_MODEL_EDITOR ?? "";
  let unreachable = false;
  const guarded: Complete = async (req) => {
    try {
      return await deps.complete(req);
    } catch (e) {
      unreachable = true;
      throw e;
    }
  };
  let verdict: { pass: boolean; reason: string };
  try {
    const res = await askJson(VerdictSchema, guarded, {
      model,
      prompt: EDITOR_PROMPT(input.claim, input.sourceText),
      imageDataUrl: await deps.loadImage(input.cropUrl),
    });
    verdict = res.ok ? res.value : { pass: false, reason: unreachable ? "editor-unavailable" : "unparseable" };
  } catch {
    verdict = { pass: false, reason: "editor-unavailable" };
  }
  await deps.log({
    subjectKind: input.subjectKind,
    subjectId: input.subjectId,
    claim: input.claim,
    pass: verdict.pass,
    reason: verdict.reason,
    model,
    createdAt: Date.now(),
  });
  return verdict;
}
