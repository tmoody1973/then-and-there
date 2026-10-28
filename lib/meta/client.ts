// Meta Model API access (OpenAI-compatible). Thin I/O wrappers, each call cached.
import { createHash } from "node:crypto";
import OpenAI from "openai";
import type { LocClient } from "../loc/client";
import { PROMPT_VERSION } from "../pipeline/prompts";
import { cachedCall } from "./cache";
import { jpegSize, toDataUrl } from "./image";
import type { Usage } from "./pricing";
import type { Effort } from "../pipeline/askJson";

export type OnUsage = (model: string, usage: Usage) => void;
const noop: OnUsage = () => {};

type ChatUsage = { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
const chatUsage = (u?: ChatUsage): Usage => ({
  input: u?.prompt_tokens ?? 0,
  cachedInput: u?.prompt_tokens_details?.cached_tokens ?? 0,
  output: u?.completion_tokens ?? 0,
});

export function metaClient(): OpenAI {
  const apiKey = process.env.META_API_KEY;
  if (!apiKey) throw new Error("META_API_KEY is not set (put it in .env)");
  return new OpenAI({ apiKey, baseURL: process.env.META_BASE_URL ?? "https://api.meta.ai/v1" });
}

// Identify images in cache keys by content, not size: different crops can share a size.
const fingerprint = (dataUrl?: string) => (dataUrl ? createHash("sha1").update(dataUrl).digest("hex") : "");

const model = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (see .env.example)`);
  return v;
};

// The Library 403s Meta's image fetcher, so images travel inline as base64.
export function makeImageLoader(loc: LocClient) {
  return async (iiifBase: string, width: number) => {
    const bytes = await loc.getBytes(`${iiifBase}/full/${width},/0/default.jpg`);
    return { dataUrl: toDataUrl(bytes), ...jpegSize(bytes) };
  };
}

// Page layout: standard Spark, low thinking (grounding needs the stronger model; ledger Task 10).
export function makeSpark(client: OpenAI, subjectId: string, onUsage: OnUsage = noop, effort: Effort = "low") {
  const m = model("META_MODEL_SPARK");
  return (imageDataUrl: string, prompt: string) =>
    cachedCall({ model: m, promptVersion: PROMPT_VERSION, subjectId, input: { prompt, effort, image: fingerprint(imageDataUrl) } }, async () => {
      const res = await client.chat.completions.create({
        model: m,
        reasoning_effort: effort as never,
        messages: [{ role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ] }],
      });
      onUsage(m, chatUsage(res.usage as ChatUsage));
      return res.choices[0]?.message?.content ?? "";
    });
}

export function makeSam(client: OpenAI, subjectId: string, onUsage: OnUsage = noop) {
  const m = model("META_MODEL_SAM");
  return (imageDataUrl: string, text: string) =>
    cachedCall({ model: m, promptVersion: PROMPT_VERSION, subjectId, input: { text, image: fingerprint(imageDataUrl) } }, async () => {
      const res = (await client.responses.create({
        model: m,
        input: [{ type: "message", role: "user", content: [
          { type: "input_text", text },
          { type: "input_image", image_url: imageDataUrl, detail: "auto" },
        ] }],
        metadata: { include_confidence: "true" },
      } as never)) as { output_text?: string };
      onUsage(m, { images: 1 });
      return res.output_text ?? "";
    });
}

// Generic cached completion (text, optional image) for clean / classify / Editor.
export function makeComplete(client: OpenAI, subjectId: string, onUsage: OnUsage = noop) {
  return (req: { model: string; prompt: string; imageDataUrl?: string; effort?: Effort }) =>
    cachedCall(
      { model: req.model, promptVersion: PROMPT_VERSION, subjectId, input: { prompt: req.prompt, effort: req.effort, image: fingerprint(req.imageDataUrl) } },
      async () => {
        const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: "text", text: req.prompt }];
        if (req.imageDataUrl) content.push({ type: "image_url", image_url: { url: req.imageDataUrl } });
        const res = await client.chat.completions.create({
          model: req.model,
          messages: [{ role: "user", content }],
          ...(req.effort ? { reasoning_effort: req.effort as never } : {}),
        });
        onUsage(req.model, chatUsage(res.usage as ChatUsage));
        return res.choices[0]?.message?.content ?? "";
      },
    );
}
