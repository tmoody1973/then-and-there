// Matches readers' follows against a page's OCR text, in our own code (follows never go to a model).
import type { Follow } from "./types";

export const MAX_CANDIDATE_PAGES = 5;
const CUTOFF = "1931-01-01";
const FUZZY_MIN = 6; // names this long may differ by one character (OCR error, a stray space)

export type Hit = { pageId: string; owner: string; followId: string; matched: string; kind: "name" | "place" };

// "Bly's" → "bly", "J." → "j": compare words without case, periods or possessives.
const keyOf = (w: string) => w.toLowerCase().replace(/['’]s$/, "").replace(/[.'’]/g, "");

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

// Returns the name as printed (whitespace collapsed), or null. Consecutive words are joined before
// comparing, so "J. E. Ellmore", "JE ELLMORE" and a name split across lines ("Cum mins") all match.
export function matchName(text: string, name: string): string | null {
  const target = name.split(/\s+/).map(keyOf).join("");
  if (!target) return null;
  const fuzzy = target.length >= FUZZY_MIN;
  const joined = text.replace(/-\s*\n\s*/g, ""); // "Ell-\nmore" → "Ellmore"
  const words = [...joined.matchAll(/[\p{L}\p{N}'’.]+/gu)]
    .map((m) => ({ key: keyOf(m[0]), start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
    .filter((w) => w.key);
  // Exact anywhere on the page beats a near miss ("E. Ellmore" is one edit from "Ellmore").
  for (const tolerant of fuzzy ? [false, true] : [false]) {
    for (let i = 0; i < words.length; i += 1) {
      let acc = "";
      for (let j = i; j < words.length; j += 1) {
        acc += words[j].key;
        if (acc.length > target.length + (tolerant ? 1 : 0)) break;
        // A near miss counts only when printed with a capital, like a name ("Turnor"), never a
        // common word ("turned" for Turner).
        const nearName = tolerant && /^\p{Lu}/u.test(joined.slice(words[i].start, words[i].start + 1)) && withinOneEdit(acc, target);
        if (acc === target || nearName) {
          return joined.slice(words[i].start, words[j].end).replace(/\s+/g, " ");
        }
      }
    }
  }
  return null;
}

export function matchPage(page: { pageId: string; date: string; state: string; city: string; text: string }, follows: Follow[]): Hit[] {
  if (page.date >= CUTOFF) return [];
  const byName = new Map<string, string | null>();
  const hits: Hit[] = [];
  for (const f of follows) {
    let matched: string | null;
    if (f.kind === "place") matched = page.city === f.value || page.state === f.value ? f.value : null;
    else {
      const k = f.value.toLowerCase();
      if (!byName.has(k)) byName.set(k, matchName(page.text, f.value));
      matched = byName.get(k) ?? null;
    }
    if (matched) hits.push({ pageId: page.pageId, owner: f.owner, followId: f.id, matched, kind: f.kind });
  }
  return hits;
}

// At most MAX_CANDIDATE_PAGES pages a night. A reader with a name hit counts double: a place follow
// matches every page from that state, so names must not be crowded out.
export function pickCandidates(hits: Hit[]): { pages: Array<{ pageId: string; hits: Hit[] }>; capped: number } {
  const byPage = new Map<string, Hit[]>();
  for (const h of hits) byPage.set(h.pageId, [...(byPage.get(h.pageId) ?? []), h]);
  const ranked = [...byPage.entries()].map(([pageId, hs], order) => {
    const owners = new Set(hs.map((h) => h.owner));
    const named = new Set(hs.filter((h) => h.kind === "name").map((h) => h.owner));
    return { pageId, hits: hs, score: owners.size + named.size, owners: owners.size, order };
  });
  ranked.sort((a, b) => b.score - a.score || b.owners - a.owners || a.order - b.order);
  return { pages: ranked.slice(0, MAX_CANDIDATE_PAGES).map(({ pageId, hits: hs }) => ({ pageId, hits: hs })), capped: Math.max(0, ranked.length - MAX_CANDIDATE_PAGES) };
}
