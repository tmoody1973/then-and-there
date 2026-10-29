// Teacher packs (spec 5): a printable set of up to 8 Editor-verified clippings with scans, citations
// and 3 discussion questions (written by Muse Spark, each checked by the Editor). Hard-history
// clippings are kept apart and shown only when the teacher opts in.
import { plainCitation, paperFromCite } from "../loc/cite";
import { BLACK_PRESS_LCCNS } from "./communities";
import type { ShelfCard } from "./shelves";

const PER_PACK = 8;
const EXCERPT = 700;
export const QUESTIONS = 3;

export type PackItem = { clippingId: string; pageId: string; iiifBase: string; box: ShelfCard["box"]; paper: string; date: string; citationMla: string; excerpt: string };
export type PackDef = { slug: string; title: string; theme: string; select: (c: ShelfCard) => boolean };

export const PACKS: PackDef[] = [
  {
    slug: "racing-nellie-bly", title: "Racing Nellie Bly (1889–90)",
    theme: "How American newspapers covered Nellie Bly's and Elizabeth Bisland's race around the world as it happened",
    select: (c) => c.date >= "1889-11-14" && c.date <= "1890-01-31" && /\b(Bly|Bisland)\b/i.test(c.text),
  },
  {
    slug: "black-press-milwaukee", title: "Milwaukee's Black press",
    theme: "Everyday life, work and community in Milwaukee's Black newspaper, The Wisconsin Weekly Advocate",
    select: (c) => c.lccn === BLACK_PRESS_LCCNS[0],
  },
  {
    slug: "german-milwaukee", title: "German Milwaukee",
    theme: "Stories from Milwaukee's German-language newspapers",
    select: (c) => c.city === "milwaukee" && c.language.includes("german"),
  },
];

const item = (c: ShelfCard): PackItem => ({
  clippingId: c.clippingId, pageId: c.pageId, iiifBase: c.iiifBase, box: c.box, paper: paperFromCite(c.citeThis.mla, c.paper), date: c.date,
  citationMla: plainCitation(c.citeThis.mla), excerpt: c.text.replace(/\s+/g, " ").slice(0, EXCERPT),
});

export function buildPack(def: PackDef, pool: ShelfCard[]): { items: PackItem[]; hardItems: PackItem[] } {
  const verified = pool.filter((c) => def.select(c) && c.editorStatus === "pass").sort((a, b) => b.humanStoryScore - a.humanStoryScore);
  return {
    items: verified.filter((c) => !c.hardHistory).slice(0, PER_PACK).map(item),
    hardItems: verified.filter((c) => c.hardHistory).slice(0, PER_PACK).map(item),
  };
}

// Each question must pass the Editor; a failed one gets one replacement, then it's dropped.
export async function checkQuestions(questions: string[], deps: { verify(q: string): Promise<boolean>; replace(q: string): Promise<string> }): Promise<string[]> {
  const kept: string[] = [];
  for (const q of questions) {
    if (await deps.verify(q)) {
      kept.push(q);
      continue;
    }
    const second = await deps.replace(q);
    if (await deps.verify(second)) kept.push(second);
  }
  return kept;
}
