// Asks a model for JSON, validates it, and retries once. Never returns unvalidated data.
import type { z } from "zod";

export type Effort = "minimal" | "low" | "medium" | "high";
export type CompleteReq = { model: string; prompt: string; imageDataUrl?: string; effort?: Effort };
export type Complete = (req: CompleteReq) => Promise<string>;
export type JsonResult<T> = { ok: true; value: T } | { ok: false; error: string };

const ATTEMPTS = 2;

function extract(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON object in reply");
  return JSON.parse(m[0]);
}

export async function askJson<T>(schema: z.ZodType<T>, complete: Complete, req: CompleteReq): Promise<JsonResult<T>> {
  let error = "";
  for (let i = 0; i < ATTEMPTS; i += 1) {
    try {
      const parsed = schema.safeParse(extract(await complete(req)));
      if (parsed.success) return { ok: true, value: parsed.data };
      error = parsed.error.message;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: `malformed model output: ${error}` };
}
