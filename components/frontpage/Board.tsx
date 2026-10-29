"use client";

// The page as a layout editor would rough it out: hatched blocks where clues still hide, the real
// crop where one has been revealed, ruled lines for the type in between. Positions are the
// clippings' true places on the page.
import { useId } from "react";

export type BoardClue = { kind: string; label: string; box: { x: number; y: number; w: number; h: number }; url: string };
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const SHORT: Record<string, string> = { ad: "Ad", weather: "Weather", prices: "Prices", item: "Local item", notice: "Notice", headline: "Headline", photo: "Picture", masthead: "Masthead" };
export const shortLabel = (kind: string) => SHORT[kind] ?? kind;

export function Board({ clues, aspect, revealed, selected, onSelect }: { clues: BoardClue[]; aspect: number; revealed: number; selected: number; onSelect: (n: number) => void }) {
  const id = useId().replace(/:/g, "");
  // The masthead band sits underneath everything it overlaps.
  const order = clues.map((c, n) => ({ c, n })).sort((a, b) => (a.c.kind === "masthead" ? -1 : b.c.kind === "masthead" ? 1 : a.n - b.n));
  return (
    <div className="fp-board" style={{ aspectRatio: String(aspect), ["--aspect" as string]: String(aspect) }}>
      <svg className="fp-type" aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <pattern id={`t${id}`} width="12" height="7" patternUnits="userSpaceOnUse">
            <line x1="0" x2="12" y1="3.5" y2="3.5" stroke="var(--wire)" strokeWidth="1.3" strokeOpacity="0.55" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#t${id})`} />
      </svg>
      {order.map(({ c, n }) => {
        const shown = n < revealed;
        const style = { left: pct(c.box.x), top: pct(c.box.y), width: pct(c.box.w), height: pct(c.box.h) };
        return shown ? (
          <button
            key={n}
            type="button"
            className={`fp-slot is-shown${selected === n ? " is-selected" : ""}`}
            style={style}
            onClick={() => onSelect(n)}
            aria-label={`Clue ${n + 1}, ${c.label}: show it larger`}
          >
            <img src={c.url} alt="" />
            <span className="fp-tag">Clue {n + 1}{c.kind === "ad" ? " · Ad" : ""}</span>
          </button>
        ) : (
          <div key={n} className="fp-slot is-hidden" style={style} aria-hidden="true">
            <span className="fp-q">? {shortLabel(c.kind)}</span>
          </div>
        );
      })}
    </div>
  );
}
