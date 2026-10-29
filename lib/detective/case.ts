// Case 01: Nellie Bly's route, east from New York and home again (Nov 14, 1889 - Jan 25, 1890).
// "arrived" only opens the search window for a stop's clue (a report can't precede her arrival);
// the screen shows the date the paper printed, never these. Distractors are other ports of the
// day that she never called at, offered when that stop is the answer.
import type { Question } from "../game/types";

export type Stop = { name: string; place: string; arrived: string; match: RegExp; distractors: string[] };

export const STOPS: Stop[] = [
  { name: "New York", place: "New York", arrived: "1889-11-14", match: /\bNew York\b/i, distractors: [] },
  { name: "Southampton", place: "Southampton, England", arrived: "1889-11-21", match: /Southampton/i, distractors: ["Liverpool", "Le Havre", "Queenstown"] },
  { name: "Amiens", place: "Amiens, France", arrived: "1889-11-22", match: /Amiens|\bVerne\b/i, distractors: ["Paris", "Brussels", "Rouen"] },
  { name: "Brindisi", place: "Brindisi, Italy", arrived: "1889-11-24", match: /Brindisi/i, distractors: ["Marseilles", "Naples", "Genoa"] },
  { name: "Port Said", place: "Port Said, Egypt", arrived: "1889-11-27", match: /Port Said|Ismailia|\bSuez\b/i, distractors: ["Alexandria", "Malta", "Athens"] },
  { name: "Aden", place: "Aden, Arabia", arrived: "1889-12-02", match: /\bAden\b/i, distractors: ["Bombay", "Zanzibar", "Karachi"] },
  { name: "Colombo", place: "Colombo, Ceylon", arrived: "1889-12-08", match: /Colombo|Ceylon/i, distractors: ["Bombay", "Madras", "Calcutta"] },
  { name: "Penang", place: "Penang, Malaya", arrived: "1889-12-14", match: /Penang|Pinang/i, distractors: ["Bombay", "Calcutta", "Melbourne"] },
  { name: "Singapore", place: "Singapore", arrived: "1889-12-18", match: /Singapore/i, distractors: ["Batavia", "Rangoon", "Bangkok"] },
  { name: "Hong Kong", place: "Hong Kong", arrived: "1889-12-23", match: /Hong ?Kong/i, distractors: ["Manila", "Saigon", "Shanghai"] },
  { name: "Yokohama", place: "Yokohama, Japan", arrived: "1890-01-03", match: /Yokohama|\bJapan\b/i, distractors: ["Shanghai", "Manila", "Vladivostok"] },
  { name: "San Francisco", place: "San Francisco", arrived: "1890-01-21", match: /San Francisco/i, distractors: ["Vancouver", "Portland", "San Diego"] },
  { name: "New York", place: "New York", arrived: "1890-01-25", match: /\bNew York\b/i, distractors: [] },
];

const HOME = STOPS.length - 1;
const WINDOW_DAYS = 30;
const BLY = /\b(Bly|Cochrane?)\b/i;

const plusDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export const leaksNext = (text: string, i: number) => i + 1 < HOME && STOPS[i + 1].match.test(text);

// A stop's clue names Bly and the place, was printed after she got there, and doesn't name the
// next stop (the answer). Stops further ahead may appear: reading the route is the game.
export function clueEligible(c: { text: string; date: string }, i: number): boolean {
  const s = STOPS[i];
  if (!BLY.test(c.text) || !s.match.test(c.text)) return false;
  if (c.date < s.arrived || c.date > plusDays(s.arrived, WINDOW_DAYS)) return false;
  return !leaksNext(c.text, i);
}

// The question asked at stop i: where does the next dispatch come from?
export function optionsFor(i: number): Extract<Question, { kind: "choice" }> {
  const next = STOPS[i + 1];
  const slot = (i * 3 + 1) % 4;
  const options = [...next.distractors];
  options.splice(slot, 0, next.name);
  return { kind: "choice", prompt: "Where does the next dispatch come from?", options, answerIndex: slot };
}

// One built stop, as scripts/detective/build.ts writes it to data/detective/case01.json.
type Box = { x: number; y: number; w: number; h: number };
export type CaseClip = { clippingId: string; pageId: string; iiifBase: string; box: Box; focus?: Box; paper: string; date: string; citationMla: string; excerpt: string };
export type CaseStop = { n: number; name: string; place: string; clue: CaseClip; summary: string; title: string; hint?: string; hardHistory?: boolean };
