// Drafts one game day from hand-picked clippings: the Case Writer proposes, the Editor disposes.
// A day is "published" only when every check passes.
import { z } from "zod";
import { cropUrl } from "../loc/paths";
import { askJson, type Complete } from "../pipeline/askJson";
import { CASE_WRITER_PROMPT } from "../pipeline/prompts";
import { parseDuration } from "./finale";
import { date1889ForDay } from "./schedule";
import type { Question } from "./types";

export type Clip = {
  clippingId: string;
  pageId: string;
  iiifBase: string;
  box: { x: number; y: number; w: number; h: number };
  paper: string;
  date: string;
  citationMla: string;
  text: string;
};

export type Pick = { day: number; clueClippingIds: string[]; revealClippingId: string; note: string };

type Verify = (input: {
  subjectKind: "clue" | "hint" | "context";
  subjectId: string;
  claim: string;
  sourceText: string;
  cropUrl: string;
}) => Promise<{ pass: boolean; reason: string }>;

const FINALE_DAY = 73;
const EXCERPT_CHARS = 300;

const QuestionSchema = z.union([
  z.object({ kind: z.literal("choice"), prompt: z.string().min(1), options: z.array(z.string().min(1)).min(2).max(4), answerIndex: z.number().int().min(0) }),
  z.object({ kind: z.literal("days"), prompt: z.string().min(1), answerDays: z.number().int().min(0), tolerance: z.number().int().min(0) }),
]);
const DraftSchema = z
  .object({ title: z.string().min(1), question: QuestionSchema, hints: z.array(z.string().min(1)).length(2), explanation: z.string().min(1) })
  .refine((d) => d.question.kind !== "choice" || d.question.answerIndex < d.question.options.length, "answerIndex out of range");

const answerText = (q: Question) => (q.kind === "choice" ? q.options[q.answerIndex] : `${q.answerDays} days`);

const ref = (c: Clip) => ({
  clippingId: c.clippingId,
  pageId: c.pageId,
  iiifBase: c.iiifBase,
  box: c.box,
  paper: c.paper,
  date: c.date,
  citationMla: c.citationMla,
  excerpt: c.text.slice(0, EXCERPT_CHARS),
});

export async function draftDay(pick: Pick, clips: Clip[], deps: { complete: Complete; verify: Verify; model?: string }) {
  const date1889 = date1889ForDay(pick.day);
  const byId = new Map(clips.map((c) => [c.clippingId, c]));
  const clues = pick.clueClippingIds.map((id) => byId.get(id));
  const reveal = byId.get(pick.revealClippingId);
  if (clues.some((c) => !c) || !reveal) throw new Error(`day ${pick.day}: picked clipping not found`);
  const clueClips = clues as Clip[];
  const late = clueClips.find((c) => c.date > date1889);
  if (late) throw new Error(`hindsight: day ${pick.day} (${date1889}) uses a clue printed ${late.date}`);

  const draft = await askJson(DraftSchema, deps.complete, {
    model: deps.model ?? process.env.META_MODEL_SPARK ?? "",
    prompt: CASE_WRITER_PROMPT(date1889, clueClips.map((c) => c.text), reveal.text),
  });
  if (!draft.ok) throw new Error(`day ${pick.day}: case writer failed: ${draft.error}`);
  const { title, question, hints, explanation } = draft.value;

  const id = `day${pick.day}`;
  const clueText = clueClips.map((c) => c.text).join("\n---\n");
  const checks: Array<Parameters<Verify>[0]> = [
    { subjectKind: "clue", subjectId: `${id}-solvable`, claim: `A reader on ${date1889} could reason toward an answer to this question from this clipping: ${question.prompt}`, sourceText: clueText, cropUrl: cropUrl(clueClips[0].iiifBase, clueClips[0].box) },
    { subjectKind: "clue", subjectId: `${id}-answer`, claim: `The answer to "${question.prompt}" is: ${answerText(question)}.`, sourceText: reveal.text, cropUrl: cropUrl(reveal.iiifBase, reveal.box) },
    { subjectKind: "context", subjectId: `${id}-explanation`, claim: explanation, sourceText: reveal.text, cropUrl: cropUrl(reveal.iiifBase, reveal.box) },
    ...hints.map((hint, i) => ({ subjectKind: "hint" as const, subjectId: `${id}-hint${i + 1}`, claim: `This hint does not state or directly give away the answer "${answerText(question)}": ${hint}`, sourceText: hint, cropUrl: cropUrl(reveal.iiifBase, reveal.box) })),
  ];
  const verdicts = [];
  for (const check of checks) verdicts.push(await deps.verify(check));
  const rejectReasons = verdicts.flatMap((v, i) => (v.pass ? [] : [`${checks[i].subjectId}: ${v.reason}`]));

  let finaleSeconds: number | undefined;
  if (pick.day === FINALE_DAY) {
    try {
      finaleSeconds = parseDuration(reveal.text);
    } catch {
      rejectReasons.push("finale time not found in the reveal clipping");
    }
  }

  return {
    day: pick.day,
    date1889,
    title,
    clue: ref(clueClips[0]),
    question,
    hints,
    reveal: { ...ref(reveal), explanation },
    ...(finaleSeconds !== undefined ? { finaleSeconds } : {}),
    status: rejectReasons.length ? ("rejected" as const) : ("published" as const),
    rejectReasons,
  };
}
