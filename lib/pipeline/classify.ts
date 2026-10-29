// Tags a clipping: what kind it is, who and where it names, how much of a human
// story it holds, and whether it carries hard-history content needing a note.
import { z } from "zod";
import { askJson, type Complete, type JsonResult } from "./askJson";
import { CLASSIFY_PROMPT } from "./prompts";

export const ClassificationSchema = z.object({
  type: z.enum(["person", "event", "business", "ad", "notice", "other"]),
  people: z.array(z.string()),
  places: z.array(z.string()),
  humanStoryScore: z.number().min(0).max(1),
  hardHistory: z.boolean(),
  hardHistoryReason: z.string().optional(),
});
export type Classification = z.infer<typeof ClassificationSchema>;

export function classifyClipping(
  c: { clippingId: string; text: string },
  deps: { complete: Complete; model?: string },
): Promise<JsonResult<Classification>> {
  const model = deps.model ?? process.env.META_MODEL_BULK ?? "";
  return askJson(ClassificationSchema, deps.complete, { model, effort: "minimal", prompt: CLASSIFY_PROMPT(c.text) });
}
