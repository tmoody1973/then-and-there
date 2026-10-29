// Explore opens on shelves of stories before any search (Tarik's call): nobody knows the names
// to type, so the first screen shows what the archive holds. Built by scripts/explore/shelves.ts.
import { BLACK_PRESS_LCCNS } from "./communities";

const PER_SHELF = 6;
const MIN_SCORE = 0.5; // unverified stories need at least this human-story score to be shelved
const STORY_TYPES = new Set(["person", "event", "business"]);

type Box = { x: number; y: number; w: number; h: number };
export type ShelfCard = {
  clippingId: string; pageId: string; iiifBase: string; box: Box; paper: string; city: string; state: string; date: string;
  sequence: number; language: string[]; lccn: string; type?: string; people: string[]; textKind: "repaired" | "archive";
  text: string; archiveText?: string; editorStatus: string; hardHistory: boolean; humanStoryScore: number; citeThis: { apa: string; chicago: string; mla: string };
};
export type Shelf = { slug: string; title: string; blurb: string; order: number; select: (c: ShelfCard) => boolean };

export const SHELVES: Shelf[] = [
  {
    slug: "black-press", order: 1, title: "The Black press",
    blurb: "The Wisconsin Weekly Advocate (Milwaukee) and The Plaindealer (Detroit), in their own pages.",
    select: (c) => BLACK_PRESS_LCCNS.includes(c.lccn),
  },
  {
    slug: "bly-race", order: 2, title: "The race in the papers",
    blurb: "What readers saw of Nellie Bly and Elizabeth Bisland, November 1889 to January 1890.",
    select: (c) => c.date >= "1889-11-14" && c.date <= "1890-01-31" && /\b(Bly|Bisland)\b/i.test(c.text),
  },
  {
    slug: "german-milwaukee", order: 3, title: "German Milwaukee",
    blurb: "Stories from the city's German-language press.",
    select: (c) => c.city === "milwaukee" && c.language.includes("german"),
  },
  {
    slug: "front-1889", order: 4, title: "Front pages, November 1889",
    blurb: "Page one, the month Nellie Bly set out.",
    select: (c) => c.sequence === 1 && c.date.startsWith("1889-11"),
  },
];

export function buildShelf(shelf: Shelf, pool: ShelfCard[]): ShelfCard[] {
  return pool
    .filter((c) => shelf.select(c) && !c.hardHistory && STORY_TYPES.has(c.type ?? "") && (c.editorStatus === "pass" || c.humanStoryScore >= MIN_SCORE))
    .sort((a, b) => Number(b.editorStatus === "pass") - Number(a.editorStatus === "pass") || b.humanStoryScore - a.humanStoryScore)
    .slice(0, PER_SHELF);
}
