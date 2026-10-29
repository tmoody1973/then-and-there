// Share of word-like tokens that aren't English dictionary words: a cheap garble signal
// used to decide which clippings need model cleanup. Names count as "not in dictionary",
// so clean text with many names scores above zero; thresholds account for that.
import words from "an-array-of-english-words";

const DICT = new Set<string>(words as string[]);
const SUFFIXES = ["s", "ed", "ing"];

const known = (t: string) => DICT.has(t) || SUFFIXES.some((s) => t.endsWith(s) && DICT.has(t.slice(0, -s.length)));

export function nonDictionaryRate(text: string): number {
  const tokens = text
    .split(/\s+/)
    .map((t) => t.replace(/[^A-Za-z]/g, "").toLowerCase())
    .filter((t) => t.length >= 3);
  if (!tokens.length) return 0;
  return tokens.filter((t) => !known(t)).length / tokens.length;
}
