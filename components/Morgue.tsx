"use client";

import { ScanCrop } from "./ScanCrop";

type Box = { x: number; y: number; w: number; h: number };
type Item = { clippingId: string; pageId: string; iiifBase: string; box: Box; focus?: Box; paper: string; date: string; citationMla: string; excerpt: string };

const when = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });

// The Morgue: the newsroom's clippings library. Earlier pages, free to consult before the call.
export function Morgue({ items }: { items: Item[] }) {
  if (!items.length) return null;
  return (
    <details className="morgue">
      <summary>
        <span className="morgue-title">Check the morgue</span>
        <span className="caption">
          {items.length} clipping{items.length === 1 ? "" : "s"} from the files · free
        </span>
      </summary>
      <p className="caption">What the papers had already printed by this day. Looking things up costs nothing.</p>
      <ol className="morgue-list" role="list">
        {items.map((m) => (
          <li key={m.clippingId}>
            <p className="morgue-source">
              <span>{m.paper}</span> <time dateTime={m.date} className="num">{when(m.date)}</time>
            </p>
            <p className="morgue-text">{m.excerpt}…</p>
            <ScanCrop iiifBase={m.iiifBase} box={m.box} focus={m.focus} pageId={m.pageId} alt={m.excerpt} citation={m.citationMla} ringed={false} />
          </li>
        ))}
      </ol>
    </details>
  );
}
