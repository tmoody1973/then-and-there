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

type VerifySolvable = (input: { subjectId: string; question: string; clueText: string }) => Promise<{ pass: boolean; reason: string }>;
type VerifyHint = (input: { subjectId: string; hint: string; answer: string }) => Promise<{ pass: boolean; reason: string }>;

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
  .object({
    title: z.string().min(1),
    answerStatement: z.string().min(1),
    question: QuestionSchema,
    hints: z.array(z.string().min(1)).length(2),
    explanation: z.string().min(1),
  })
  .refine((d) => d.question.kind !== "choice" || d.question.answerIndex < d.question.options.length, "answerIndex out of range");

const answerText = (q: Question) => (q.kind === "choice" ? q.options[q.answerIndex] : `${q.answerDays} days`);

// Many clippings are whole wire columns; start the teaser a little before the first mention.
const MENTION = /\b(Bly|Bisland|Cochrane?)\b/i;
const LEAD_IN = 60;
// What both models see: the stretch of a (often mixed) column around the mentions.
const PASSAGE_CHARS = 1400;
const PASSAGE_LEAD = 300;
export function passage(text: string): string {
  if (text.length <= PASSAGE_CHARS) return text;
  const at = text.search(MENTION);
  if (at < 0) return text.slice(0, PASSAGE_CHARS);
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, at - PASSAGE_LEAD)) + 1);
  return text.slice(start, start + PASSAGE_CHARS);
}

export function excerptAround(text: string): string {
  const at = text.search(MENTION);
  if (at <= LEAD_IN) return text.slice(0, EXCERPT_CHARS);
  const start = text.lastIndexOf(" ", at - LEAD_IN) + 1;
  return text.slice(start, start + EXCERPT_CHARS);
}

const ref = (c: Clip) => ({
  clippingId: c.clippingId,
  pageId: c.pageId,
  iiifBase: c.iiifBase,
  box: c.box,
  paper: c.paper,
  date: c.date,
  citationMla: c.citationMla,
  excerpt: excerptAround(c.text),
});

export async function draftDay(pick: Pick, clips: Clip[], deps: { complete: Complete; verify: Verify; verifySolvable: VerifySolvable; verifyHint: VerifyHint; model?: string }) {
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
    prompt: CASE_WRITER_PROMPT(date1889, clueClips.map((c) => passage(c.text)), passage(reveal.text)),
  });
  if (!draft.ok) throw new Error(`day ${pick.day}: case writer failed: ${draft.error}`);
  const { title, answerStatement, question, hints, explanation } = draft.value;

  const id = `day${pick.day}`;
  const clueText = clueClips.map((c) => passage(c.text)).join("\n---\n");
  const revealText = passage(reveal.text);
  const questionText = question.kind === "choice" ? `${question.prompt} Options: ${question.options.join(" / ")}` : question.prompt;
  const rejectReasons: string[] = [];
  const solvable = await deps.verifySolvable({ subjectId: `${id}-solvable`, question: questionText, clueText });
  if (!solvable.pass) rejectReasons.push(`${id}-solvable: ${solvable.reason}`);
  const revealCrop = cropUrl(reveal.iiifBase, reveal.box);
  const checks: Array<Parameters<Verify>[0]> = [
    // The answer, stated with reveal facts only, must be printed in the reveal.
    { subjectKind: "clue", subjectId: `${id}-answer`, claim: answerStatement, sourceText: revealText, cropUrl: revealCrop },
    // A good explanation draws on both what readers saw and what came next.
    { subjectKind: "context", subjectId: `${id}-explanation`, claim: explanation, sourceText: `CLUE (printed ${clueClips[0].date}):\n${clueText}\n\nLATER REPORT:\n${revealText}`, cropUrl: revealCrop },
  ];
  for (const check of checks) {
    const v = await deps.verify(check);
    if (!v.pass) rejectReasons.push(`${check.subjectId}: ${v.reason}`);
  }
  for (const [i, hint] of hints.entries()) {
    const v = await deps.verifyHint({ subjectId: `${id}-hint${i + 1}`, hint, answer: answerText(question) });
    if (!v.pass) rejectReasons.push(`${id}-hint${i + 1}: ${v.reason}`);
  }

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
