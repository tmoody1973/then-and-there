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

// Teacher packs: discussion questions a class can answer from these clippings alone.
export const PACK_QUESTIONS_PROMPT = (theme: string, excerpts: string[], count: number, avoid: string[] = []) =>
  `You are helping a history teacher. Below are ${excerpts.length} transcribed clippings from historic American newspapers on the theme: ${theme}. The transcriptions may contain OCR misspellings.
Write ${count} open discussion question${count === 1 ? "" : "s"} for students aged 13 to 18. Each question must be answerable or discussable from what these clippings print, not outside knowledge. Ask students to compare, notice language and point of view, or reason from evidence. Plain modern English, one sentence each, no answers.${avoid.length ? `\nDo not repeat these questions: ${avoid.join(" | ")}` : ""}
Return only JSON: {"questions": string[]}.

CLIPPINGS:
${excerpts.map((e, i) => `[${i + 1}] ${e}`).join("\n\n")}`;

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

// The daily front page's Game Master: picks four clue clippings and says how each could tip a
// player off. It knows the answer; players see its lines only after they guess.
export const FRONT_PAGE_GM_PROMPT = (answer: string, listing: string) =>
  `You are the Game Master for a daily guessing game. Players see one clue at a time from a real American newspaper front page and guess the YEAR and the U.S. REGION (Northeast, South, Midwest, West) it was printed in. The answer is: ${answer}.
From the numbered clippings below (OCR text; it may contain misspellings; each is tagged with what the page layout tool thought it was), choose exactly 4 clues and give each a kind:
- "ad": a real paid advertisement (a product, a seller, a price); only clippings tagged advertisement
- "weather": a weather report or forecast (not a story that merely mentions weather)
- "prices": market prices, quotations, or a price list
- "item": a short news item or dispatch, local or from elsewhere
- "notice": a legal or official notice, or a schedule
- "headline": the page's lead headline; only clippings tagged headline
Order the 4 from least to most revealing: the first should be a fair puzzle, the last should narrow it down. Prefer a mix of kinds, and clippings with a readable, telling detail: a price, a product, a technology, a named place, a style of language. Never pick a clipping you cannot read.
For each, write:
- "prints": one sentence on a detail the clipping actually prints, quoting a few words exactly when you can.
- "why": one sentence on how that detail points toward the year or the region, using only well-established general history. Do not invent specifics.
Return only JSON: {"clues": [{"i": number, "kind": string, "prints": string, "why": string}, ... 4 items]}.

CLIPPINGS:
${listing}`;

// The same Game Master on the page's one picture (the vision call sees the crop).
export const FRONT_PAGE_PHOTO_PROMPT = (answer: string, caption: string) =>
  `You are the Game Master for a daily guessing game about real American newspaper front pages. The answer is: ${answer}. Attached is the page's picture${caption ? `; its caption reads: "${caption}"` : ""}.
Write "prints": one sentence on what the picture shows (and its caption, if any). Write "why": one sentence on how it points toward the year or region, using only well-established general history (printing technique, clothing, technology). Do not invent specifics.
Return only JSON: {"prints": string, "why": string}.`;

// The Editor on a front-page clue: is it the kind of clipping it claims, does it print what
// "prints" says, and does "why" hold without invented specifics?
export const EDITOR_CLUE_PROMPT = (claim: string, sourceText: string) =>
  `You are a strict fact-checker for a history game. The clipping (an image, when one is attached) is from a historic American newspaper; its transcription is below and may contain OCR misspellings. The image is the authority. The CLAIM has three parts:
KIND: the clipping must really be this kind of item.
PRINTS: must be supported by what the clipping prints or shows. Outside knowledge does not count here.
WHY: may rely on well-established general history, but must not contradict the clipping or assert invented specifics.
Fail the claim if any part fails.
Return only JSON: {"pass": boolean, "reason": string (one sentence)}.

CLAIM:
${claim}

CLIPPING TRANSCRIPTION:
${sourceText}`;

// Detective's Game Master: picks the clipping that reports Bly at one stop of her route and
// writes the clue card. It knows the next stop; players must work it out, so it never names it.
export const DETECTIVE_GM_PROMPT = (place: string, next: string | null, listing: string) =>
  `You run a history detective game. Players follow Nellie Bly's 1889-90 race around the world using only what newspapers printed. This stop: ${place}.${next ? ` Her NEXT stop is ${next}; players must work it out, so never name it or spell it out.` : ""}
Below are numbered clippings that mention her and ${place}. Pick the ONE that best reports her at ${place} (arriving, waiting or leaving) as news. Prefer a clipping that says something specific: a delay, a ship, a meeting, time gained or lost.
Then write, in plain modern English for readers on phones:
- "summary": one sentence, at most 22 words, present tense, saying only what that clipping prints about her at ${place}.
- "title": a notebook headline, at most 5 words (e.g. "Stuck in Colombo").${next ? `
- "hint": the city editor's nudge, at most 22 words, in the voice of a gruff-but-kind 1889 city editor. Point at direction of travel or geography so a player can reason toward the next stop. Never name it.` : ""}
Return only JSON: {"i": number, "summary": string, "title": string${next ? ', "hint": string' : ""}}.

CLIPPINGS:
${listing}`;

// One Day, Many Papers: the Comparer reads computed facts about how three papers ran one story
// and says what a reader should notice. The Editor checks the note against the same facts.
export const COMPARER_PROMPT = (event: string, facts: string) =>
  `You help readers compare how three American newspapers covered one story: ${event}. Below are FACTS computed from their real front pages: how much of each front page the story took, how many of its pieces were shared wire copy (the same text another paper ran) and how many the paper wrote or chose for itself, with excerpts of its own pieces.
Write, in plain modern English for readers on phones:
- "noticed": 2 sentences, at most 45 words in all, saying what stands out in the comparison. Use only the FACTS; never invent a number, a ranking or a reason.
- "question": one open question, at most 20 words, that sends the reader to look at the pages (e.g. "Which paper gave the news the most room, and why might that be?").
Return only JSON: {"noticed": string, "question": string}.

FACTS:
${facts}`;

export const EDITOR_COMPARE_PROMPT = (claim: string, facts: string) =>
  `You are a strict fact-checker. Decide whether the NOTE is supported by the FACTS, which were computed from three newspapers' front pages. Fail it if it states any number, ranking, comparison or event the FACTS do not support. A question is not a claim.
Return only JSON: {"pass": boolean, "reason": string (one sentence)}.

NOTE:
${claim}

FACTS:
${facts}`;

// Spot the Forgery: the Editor looks at Muse Image's redrawn ad before a round ships.
export const EDITOR_FORGERY_PROMPT = (claim: string, _sourceText: string) =>
  `You check images for a history game. The image is an advertisement redrawn to look like it was printed in an 1889 newspaper. Pass only if the CLAIM is plainly true from the image alone: a player looking at it would clearly recognize the product named, from the picture or the large lettering. Fail if the product is unclear, the main lettering is garbled nonsense, or the image is not an advertisement.
Return only JSON: {"pass": boolean, "reason": string (one sentence)}.

CLAIM:
${claim}`;
