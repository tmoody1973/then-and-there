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
  `You are a strict fact-checker for a history publication. The clipping (an image, when one is attached) is from an 1889-90 newspaper; its transcription is below and may contain OCR misspellings (e.g. "Nelle" for "Nellie"). Judge meaning, not spelling: the image is the authority. Decide whether the CLAIM is supported by what this clipping prints. Outside knowledge does not count; dates the clipping does not print do not need to appear. If any fact in the claim (a name, place, number, time or event) is not printed in the clipping, the claim fails.
Return only JSON: {"pass": boolean, "reason": string (one sentence; quote the supporting words when it passes)}.

CLAIM:
${claim}

CLIPPING TRANSCRIPTION:
${sourceText}`;

// Explore's "Verified" badge: is the machine label right for this clipping (any year, 1887–1930)?
export const EDITOR_LABEL_PROMPT = (claim: string, sourceText: string) =>
  `You are a strict fact-checker for a history archive. The clipping (an image, when one is attached) is from a historic American newspaper; its transcription is below and may contain OCR misspellings. Judge meaning, not spelling: the image is the authority. Story types: "person" = about named individuals; "event" = something that happened; "business" = a business or tradesperson described as news; an advertisement is paid promotion. Decide whether the CLAIM describes this clipping correctly: the type must fit, and every person it names must be printed in the clipping.
Return only JSON: {"pass": boolean, "reason": string (one sentence; quote the supporting words when it passes)}.

CLAIM:
${claim}

CLIPPING TRANSCRIPTION:
${sourceText}`;

// The agent's finds: does this clipping (any year before 1931) print what the claim says?
export const EDITOR_FIND_PROMPT = (claim: string, sourceText: string) =>
  `You are a strict fact-checker for a history archive. The clipping (an image, when one is attached) is from a historic American newspaper; its transcription is below and may contain OCR misspellings. Judge meaning, not spelling: the image is the authority. Decide whether the CLAIM is supported by what this clipping prints. Outside knowledge does not count. If the claim names a person, story type, or fact the clipping does not print, it fails.
Return only JSON: {"pass": boolean, "reason": string (one sentence; quote the supporting words when it passes)}.

CLAIM:
${claim}

CLIPPING TRANSCRIPTION:
${sourceText}`;

// Solvability: could a reader of the clue reason toward an answer? Future events are fine.
export const EDITOR_SOLVABLE_PROMPT = (question: string, clueText: string) =>
  `A history game shows players this newspaper clue, then asks a question about what happens next. The question may mention places or events the clue doesn't print yet; that's expected. Decide whether the clue gives a careful reader relevant evidence (schedules, positions, pace, plans, delays) to reason toward an answer, rather than making it a blind guess.
Return only JSON: {"pass": boolean, "reason": string (one sentence)}.

QUESTION:
${question}

CLUE:
${clueText}`;

// Morgue relevance: is this earlier clipping useful background for the day's question?
export const EDITOR_RELEVANT_PROMPT = (question: string, clippingText: string) =>
  `A history game lets players consult earlier newspaper clippings as background before answering a question about Nellie Bly's 1889-90 race around the world (or her rival Elizabeth Bisland's). Decide whether this clipping gives a player relevant background: her route, schedule, steamers or trains, connections, pace, plans, or her rival. It does not need to answer the question by itself.
Return only JSON: {"pass": boolean, "reason": string (one sentence)}.

QUESTION:
${question}

CLIPPING:
${clippingText}`;

// Hint check: a different question from fact support. Does the hint give the answer away?
export const EDITOR_HINT_PROMPT = (hint: string, answer: string) =>
  `A history game asks players a question whose correct answer is: "${answer}". Below is a hint the game will show before they answer. A good hint is a question that nudges reasoning. It fails if it states the answer, names it, or makes it obvious without thinking.
Return only JSON: {"pass": boolean (true = the hint does NOT give the answer away), "reason": string (one sentence)}.

HINT:
${hint}`;

// Case Writer: drafts one game day. The Editor checks every claim it makes before publication.
export const CASE_WRITER_PROMPT = (dateLabel: string, clueTexts: string[], revealText: string) =>
  `You are writing one day of a history game: players race Nellie Bly around the world (Nov 14, 1889 - Jan 25, 1890) using only what newspapers printed. Today is ${dateLabel}. Readers that day saw the CLUE clipping(s). A later REVEAL clipping shows what happened.
Write a "will she make it?" question that a careful reader on ${dateLabel} could weigh from the clue alone. Good questions ask whether she will be ahead of, on, or behind her schedule; which way she or her rival will go; whether she will make a connection; or roughly how many days something will take. Do not ask for a specific town, hour or minute the clue gives no basis to guess. Take the answer ONLY from the reveal. Use multiple choice (3-4 options) or a number of days.
Also write exactly 2 hints. Each hint is in the voice of a gruff-but-kind 1889 city editor, at most 20 words, and points the player at one specific piece of evidence in the clue, asking how it bears on the question (e.g. "Two days to the good at last report. Does a lead like that hold up across the China Sea?"). A hint must never name, quote or describe any option or the answer.
WRITING RULES (the game's readers are on phones):
- Question: plain modern English, at most 25 words, no OCR misspellings. If the clipping has an obvious misprint (a number that contradicts the rest of the story), don't repeat it.
- Options: 2-4 options, each at most 8 words, parallel in form, plain modern English. No option may be longer, more specific or more detailed than the others, and the correct option must not reuse the reveal's wording.
- Title: a headline of at most 6 words.
- Explanation: 2-3 sentences in plain modern English that quote the clipping (quotes may keep the original spelling).
Also write "answerStatement": one declarative sentence stating what happened, using ONLY facts printed in the REVEAL.
Return only JSON: {"title": string, "answerStatement": string, "question": {"kind":"choice","prompt":string,"options":string[],"answerIndex":number} | {"kind":"days","prompt":string,"answerDays":number,"tolerance":number}, "hints": [string, string], "explanation": string}.

CLUE:
${clueTexts.join("\n---\n")}

REVEAL:
${revealText}`;
