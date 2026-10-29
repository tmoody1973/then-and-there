// Repairs a clipping's OCR text using its image, only when the text is bad enough to need it.
import { z } from "zod";
import { askJson, type Complete } from "./askJson";
import { CLEAN_PROMPT } from "./prompts";

const MIN_MEAN_WC = 0.8;
const MAX_NON_DICT = 0.12;

export const needsCleanup = (m: { meanWc: number; nonDictRate: number }) =>
  m.meanWc < MIN_MEAN_WC || m.nonDictRate > MAX_NON_DICT;

const CleanSchema = z.object({
  cleanedText: z.string().min(1),
  language: z.string().min(1),
  translation: z.string().optional(),
});
export type Cleaned = z.infer<typeof CleanSchema>;

export async function cleanClipping(
  c: { clippingId: string; cropUrl: string; rawText: string; nonDictRate: number },
  deps: { complete: Complete; loadImage: (url: string) => Promise<string> },
): Promise<Cleaned> {
  // Transcription is a direct task: cheap tier, minimal thinking (decision: cost control, ledger Task 10).
  const model = process.env.META_MODEL_BULK;
  if (!model) throw new Error("META_MODEL_BULK not set");
  const res = await askJson(CleanSchema, deps.complete, {
    model,
    effort: "minimal",
    prompt: CLEAN_PROMPT(c.rawText),
    imageDataUrl: await deps.loadImage(c.cropUrl),
  });
  if (!res.ok) throw new Error(`clean ${c.clippingId}: ${res.error}`);
  const language = res.value.language.toLowerCase();
  return {
    cleanedText: res.value.cleanedText,
    language,
    ...(language !== "english" && res.value.translation ? { translation: res.value.translation } : {}),
  };
}
