// Quest: the Great Migration through the Black press, 1916-1925. Four chapters; each holds up to
// five real sources, and each source asks the reader one open question. Progress lives in the browser.

export type Chapter = { n: number; title: string; focus: string; terms: RegExp };

export const CHAPTERS: Chapter[] = [
  { n: 1, title: "Why people left", focus: "what pushed Black families to leave the South", terms: /leav|exodus|south|cotton|boll weevil|wages|lynch|mob|condition|crop|planter|labor/i },
  { n: 2, title: "The journey north", focus: "how people traveled north and what the trip was like", terms: /train|railroad|ticket|station|excursion|fare|journey|travel|depot|coach/i },
  { n: 3, title: "Work up north", focus: "the jobs and wages waiting in northern cities", terms: /job|work|wage|factory|plant|mill|packing|steel|employ|labor|industr/i },
  { n: 4, title: "A new life", focus: "building homes, churches and community in the North", terms: /church|home|housing|newcomer|welcome|league|club|school|neighbor|vote|communit/i },
];

export const ANSWER_MAX = 2000;
type Source = { chapter: number; key: string };
export type Answers = Record<string, string>;

// Where the reader stands: the first source not yet answered.
export function position(sources: Source[], answers: Answers) {
  const at = sources.findIndex((s) => !answers[s.key]);
  const index = at < 0 ? sources.length - 1 : at;
  const chapter = sources[index].chapter;
  const inChapter = sources.filter((s) => s.chapter === chapter);
  return { index, chapter, ofChapter: inChapter.findIndex((s) => s.key === sources[index].key) + 1, inChapter: inChapter.length, done: at < 0 };
}

export function chapterStates(sources: Source[], answers: Answers): Array<"done" | "now" | "ahead"> {
  const { chapter, done } = position(sources, answers);
  return CHAPTERS.map((c) => {
    const mine = sources.filter((s) => s.chapter === c.n);
    if (done || (mine.length && mine.every((s) => answers[s.key]))) return "done";
    return c.n === chapter ? "now" : "ahead";
  });
}

export function recordAnswer(answers: Answers, key: string, text: string): Answers {
  const clean = text.trim().slice(0, ANSWER_MAX);
  return clean ? { ...answers, [key]: clean } : answers;
}
