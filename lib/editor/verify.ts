// The Editor: an independent check of one claim against its source clipping.
// Fails closed. Anything unreadable or unreachable is a fail, never a pass.
import { z } from "zod";
import type { EditorRun } from "../../convex/editorRuns";
import { askJson, type Complete } from "../pipeline/askJson";
import { EDITOR_HINT_PROMPT, EDITOR_PROMPT, EDITOR_SOLVABLE_PROMPT } from "../pipeline/prompts";

const VerdictSchema = z.object({ pass: z.boolean(), reason: z.string() });

export async function verifyClaim(
  input: { subjectKind: EditorRun["subjectKind"]; subjectId: string; claim: string; sourceText: string; cropUrl?: string },
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
      effort: "low",
      prompt: EDITOR_PROMPT(input.claim, input.sourceText),
      // No crop = the claim spans clippings; check against the transcriptions only.
      ...(input.cropUrl ? { imageDataUrl: await deps.loadImage(input.cropUrl) } : {}),
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

// Text-only Editor questions (no image). Fail closed like every Editor check.
async function textCheck(
  run: { subjectKind: EditorRun["subjectKind"]; subjectId: string; claim: string; prompt: string },
  deps: { complete: Complete; log: (run: EditorRun) => Promise<void> },
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
  const res = await askJson(VerdictSchema, guarded, { model, effort: "low", prompt: run.prompt });
  const verdict = res.ok ? res.value : { pass: false, reason: unreachable ? "editor-unavailable" : "unparseable" };
  await deps.log({ subjectKind: run.subjectKind, subjectId: run.subjectId, claim: run.claim, pass: verdict.pass, reason: verdict.reason, model, createdAt: Date.now() });
  return verdict;
}

// Does a hint give the answer away?
export const verifyHint = (
  input: { subjectId: string; hint: string; answer: string },
  deps: { complete: Complete; log: (run: EditorRun) => Promise<void> },
) =>
  textCheck(
    { subjectKind: "hint", subjectId: input.subjectId, claim: `Hint does not give away "${input.answer}": ${input.hint}`, prompt: EDITOR_HINT_PROMPT(input.hint, input.answer) },
    deps,
  );

// Does the clue give a reader real evidence to reason with?
export const verifySolvable = (
  input: { subjectId: string; question: string; clueText: string },
  deps: { complete: Complete; log: (run: EditorRun) => Promise<void> },
) =>
  textCheck(
    { subjectKind: "clue", subjectId: input.subjectId, claim: `The clue gives evidence to reason about: ${input.question}`, prompt: EDITOR_SOLVABLE_PROMPT(input.question, input.clueText) },
    deps,
  );
