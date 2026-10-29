// One Day, Many Papers: which of a day's story clippings were shared wire copy and which a
// paper wrote for itself. Overlapping 5-word runs survive OCR noise better than whole lines.
type Box = { x: number; y: number; w: number; h: number };
export type Mark = "wire" | "own";
type Paper = { id: string; clips: Array<{ id: string; text: string; box: Box }> };

const RUN = 5;
// ponytail: fixed count of shared runs; a few OCR errors per sentence still leave plenty.
const MIN_SHARED = 6;

export function shingles(text: string, n = RUN): Set<string> {
  const words = text.toLowerCase().replace(/-\s*\n\s*/g, "").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i += 1) out.add(words.slice(i, i + n).join(" "));
  return out;
}

const overlap = (a: Set<string>, b: Set<string>) => {
  let k = 0;
  for (const s of a) if (b.has(s) && ++k >= MIN_SHARED) return true;
  return false;
};

// A clipping is on the story when its headline or opening names it. Page cutting sometimes merges a
// whole column, and a mention far down it belongs to a different story.
const LEAD_CHARS = 400;

// Marks every clipping on the day's story: "wire" if another paper printed the same text, else "own".
export function markPapers(papers: Paper[], topic: RegExp): Record<string, Mark> {
  const onStory = papers.map((p) => ({ id: p.id, clips: p.clips.filter((c) => topic.test(c.text.slice(0, LEAD_CHARS))).map((c) => ({ id: c.id, runs: shingles(c.text) })) }));
  const marks: Record<string, Mark> = {};
  for (const p of onStory) {
    const others = onStory.filter((o) => o.id !== p.id).flatMap((o) => o.clips);
    for (const c of p.clips) marks[c.id] = others.some((o) => overlap(c.runs, o.runs)) ? "wire" : "own";
  }
  return marks;
}
