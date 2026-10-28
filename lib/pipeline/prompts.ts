// Prompt text lives here so its version travels into every cache key.
// Bump PROMPT_VERSION whenever any prompt below changes.
export const PROMPT_VERSION = "2026-10-28.1";

// Grounding format documented by Meta for Muse Spark; coordinates are 0-1000.
export const LAYOUT_PROMPT =
  'You are an object grounding expert. This is a scanned historic newspaper page. Provide the bounding box coordinates of every "article", "advertisement", "headline", and "photograph" (photographs or illustrations) on the page. Ensure the objects accurately match the request and do not miss any objects. For each object, answer in the format {"object_name": "<name>", "bbox": [{"x_min": <int>, "y_min": <int>, "x_max": <int>, "y_max": <int>}]}. The coordinates should be in the 0-1000 range. Return a JSON array of results. If you cannot find an object, omit it from the results.';

export const CLEAN_PROMPT = (rawText: string) =>
  `This image is a clipping from a scanned historic newspaper. Below is the OCR text for it, which may contain errors. Transcribe the clipping exactly as printed, using the image as the authority and the OCR only as a guide. Keep original spelling, punctuation and wording; do not modernize, summarize or add anything. Identify the language. If it is not English, also give a faithful English translation.
Return only JSON: {"cleanedText": string, "language": string (lowercase English name, e.g. "english", "german"), "translation": string (only if not English)}.

OCR text:
${rawText}`;

export const CLASSIFY_PROMPT = (text: string) =>
  `Classify this clipping from a historic American newspaper.
- type: "person" (about named individuals), "event", "business" (a business or tradesperson described as news), "ad" (an advertisement), "notice" (legal/official notice, schedule, market prices), or "other".
- people: names of real people mentioned, as printed.
- places: places mentioned, as printed.
- humanStoryScore: 0 to 1. High when the clipping tells something specific about the life of a real, named, ordinary person (a marriage, a business, a visit, an achievement, a hardship). Low for wire politics, ads, lists and boilerplate.
- hardHistory: true if it contains racist or ethnic caricature, slurs, lynching or graphic violence coverage, or demeaning advertising. Then give hardHistoryReason in one short sentence.
Return only JSON: {"type": string, "people": string[], "places": string[], "humanStoryScore": number, "hardHistory": boolean, "hardHistoryReason"?: string}.

Clipping:
${text}`;

// The Editor sees only the claim and its source. Nothing about how the claim was produced.
export const EDITOR_PROMPT = (claim: string, sourceText: string) =>
  `You are a strict fact-checker for a history publication. The image is a clipping from a historic newspaper; its transcription is below. Decide whether the CLAIM is fully supported by what is printed in this clipping alone. Outside knowledge does not count. If any part of the claim is not supported, or the clipping is unreadable, the claim fails.
Return only JSON: {"pass": boolean, "reason": string (one sentence; quote the supporting words when it passes)}.

CLAIM:
${claim}

CLIPPING TRANSCRIPTION:
${sourceText}`;
