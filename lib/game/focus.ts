// Frames the evidence: from the OCR file's word positions, the lines around the first mention
// inside a clipping, so the pencil ring circles what the player needs to read.
import type { AltoPage } from "../alto/parse";

type Box = { x: number; y: number; w: number; h: number };
const LINES_BEFORE = 2;
const LINES_AFTER = 4;
const PAD = 12;

export function focusBox(page: AltoPage, scale: number, clip: Box, mention: RegExp): Box | undefined {
  const inClip = page.lines
    .map((l) => ({ l, x: l.x / scale, y: l.y / scale, w: l.w / scale, h: l.h / scale }))
    .filter((b) => {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      return cx >= clip.x && cx <= clip.x + clip.w && cy >= clip.y && cy <= clip.y + clip.h;
    })
    .sort((a, b) => a.y - b.y);
  const hit = inClip.findIndex((b) => mention.test(b.l.words.map((w) => w.subs ?? w.text).join(" ")));
  if (hit < 0) return undefined;
  const window = inClip.slice(Math.max(0, hit - LINES_BEFORE), hit + LINES_AFTER + 1);
  const top = Math.max(clip.y, Math.min(...window.map((b) => b.y)) - PAD);
  const bottom = Math.min(clip.y + clip.h, Math.max(...window.map((b) => b.y + b.h)) + PAD);
  return { x: clip.x, y: top, w: clip.w, h: bottom - top };
}
