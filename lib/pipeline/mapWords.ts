// Collects the OCR words whose centers fall inside a clipping's pixel box, in the
// ALTO file's reading order. Hyphenated words split across lines appear once, whole.
import type { AltoPage } from "../alto/parse";

type Box = { x: number; y: number; w: number; h: number };

export function wordsInBox(page: AltoPage, box: Box, scale: number): { text: string; meanWc: number; wordCount: number } {
  const inside = (x: number, y: number) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  const tokens: string[] = [];
  const confidences: number[] = [];
  let lastSubs: string | undefined;
  for (const line of page.lines) {
    for (const w of line.words) {
      if (!inside((w.x + w.w / 2) / scale, (w.y + w.h / 2) / scale)) continue;
      confidences.push(w.wc);
      if (w.subs) {
        if (w.subs !== lastSubs) tokens.push(w.subs);
        lastSubs = w.subs;
        continue;
      }
      lastSubs = undefined;
      tokens.push(w.text);
    }
  }
  const meanWc = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
  return { text: tokens.join(" "), meanWc, wordCount: tokens.length };
}
