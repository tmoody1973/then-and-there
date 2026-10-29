// Reads an ALTO OCR file (the Library's per-page text with word positions) into
// plain lines and words. Coordinates stay in ALTO units; altoScale converts to pixels.
import { XMLParser } from "fast-xml-parser";

export type AltoWord = { text: string; subs?: string; x: number; y: number; w: number; h: number; wc: number };
export type AltoLine = { x: number; y: number; w: number; h: number; words: AltoWord[] };
export type AltoPage = { width: number; height: number; lines: AltoLine[] };

type Node = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  parseAttributeValue: false,
  isArray: (name) => ["TextBlock", "TextLine", "String", "ComposedBlock"].includes(name),
});

const num = (v: unknown): number => Number(v ?? 0);

function toWord(s: Node): AltoWord {
  const subs = s.SUBS_CONTENT as string | undefined;
  return {
    text: String(s.CONTENT ?? ""),
    ...(subs ? { subs } : {}),
    x: num(s.HPOS),
    y: num(s.VPOS),
    w: num(s.WIDTH),
    h: num(s.HEIGHT),
    wc: s.WC === undefined ? 1 : num(s.WC),
  };
}

// TextLines can sit inside TextBlocks nested in ComposedBlocks, so walk the tree.
function collectLines(node: unknown): AltoLine[] {
  if (Array.isArray(node)) return node.flatMap(collectLines);
  if (!node || typeof node !== "object") return [];
  const n = node as Node;
  const here = ((n.TextLine as Node[] | undefined) ?? []).map((l) => ({
    x: num(l.HPOS),
    y: num(l.VPOS),
    w: num(l.WIDTH),
    h: num(l.HEIGHT),
    words: ((l.String as Node[] | undefined) ?? []).map(toWord),
  }));
  const nested = Object.entries(n)
    .filter(([k]) => k !== "TextLine")
    .flatMap(([, v]) => collectLines(v));
  return [...here, ...nested];
}

export function parseAlto(xml: string): AltoPage {
  const doc = parser.parse(xml) as Node;
  const page = ((doc.alto as Node)?.Layout as Node)?.Page as Node | undefined;
  if (!page) throw new Error("ALTO file has no Layout/Page element");
  return { width: num(page.WIDTH), height: num(page.HEIGHT), lines: collectLines(page) };
}

export function altoScale(altoWidth: number, imageWidth: number): number {
  return altoWidth / imageWidth;
}
