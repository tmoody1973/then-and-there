// A front page drawn as its parts, the way a layout editor roughs one out: hatched bands for what
// is hidden (nameplate, headline), a halftone block for a photo, ruled lines for type, empty boxes
// for ads. Pure geometry; every real page in the game is a scan, never this.
import { useId } from "react";

const lines = (x: number, y: number, w: number, n: number, gap = 6) =>
  Array.from({ length: n }, (_, i) => <line key={i} x1={x} x2={x + w} y1={y + i * gap} y2={y + i * gap} />);

export function PageSketch({ className, variant = "front" }: { className?: string; variant?: "front" | "clip" }) {
  const id = useId().replace(/:/g, "");
  const defs = (
    <defs>
      <pattern id={`h${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="var(--ink-2)" strokeWidth="1.1" />
      </pattern>
      <pattern id={`d${id}`} width="4.5" height="4.5" patternUnits="userSpaceOnUse">
        <circle cx="2.25" cy="2.25" r="1.25" fill="var(--ink)" />
      </pattern>
    </defs>
  );
  if (variant === "clip")
    return (
      <svg className={className} viewBox="0 0 80 100" aria-hidden="true">
        {defs}
        <rect x="0.75" y="0.75" width="78.5" height="98.5" fill="var(--paper-bright)" stroke="var(--ink)" strokeWidth="1.5" />
        <rect x="9" y="9" width="44" height="5" fill="var(--ink)" />
        <rect x="9" y="20" width="62" height="26" fill={`url(#d${id})`} />
        <g stroke="var(--wire)" strokeWidth="1.4">{lines(9, 54, 62, 7, 5.5)}</g>
      </svg>
    );
  return (
    <svg className={className} viewBox="0 0 250 330" aria-hidden="true">
      {defs}
      <rect x="1" y="1" width="248" height="328" fill="var(--paper-bright)" stroke="var(--ink)" strokeWidth="1.5" />
      <rect x="14" y="14" width="222" height="30" fill={`url(#h${id})`} />
      <line x1="14" x2="236" y1="51" y2="51" stroke="var(--ink)" strokeWidth="2" />
      <rect x="14" y="60" width="222" height="30" fill={`url(#h${id})`} />
      <rect x="14" y="100" width="68" height="82" fill={`url(#d${id})`} />
      <g stroke="var(--wire)" strokeWidth="1.6">
        {lines(14, 192, 68, 21)}
        {lines(91, 104, 68, 39)}
      </g>
      <rect x="168" y="100" width="68" height="50" fill="none" stroke="var(--ink)" strokeWidth="1.2" />
      <rect x="168" y="158" width="68" height="160" fill="none" stroke="var(--ink)" strokeWidth="1.8" />
      <rect x="91" y="258" width="68" height="60" fill="none" stroke="var(--ink)" strokeWidth="1.2" />
    </svg>
  );
}
