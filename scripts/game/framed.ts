// Node-only: frames a clipping's evidence lines from its page's cached OCR file.
import { readFileSync } from "node:fs";
import { altoScale, parseAlto } from "../../lib/alto/parse";
import { safeId } from "../../worker/fetch";
import { focusBox } from "../../lib/game/focus";

export function framed<T extends { pageId: string; box: { x: number; y: number; w: number; h: number } }>(c: T, mention: RegExp): T {
  const dir = `cache/pages/${safeId(c.pageId)}`;
  const page = parseAlto(readFileSync(`${dir}/alto.xml`, "utf8"));
  const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8")) as { imageWidth: number };
  const focus = focusBox(page, altoScale(page.width, meta.imageWidth), c.box, mention);
  return focus ? { ...c, focus } : c;
}
