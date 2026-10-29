"use client";

// The case notebook: every clipping you've read on the trail, each linked to its real page.
import { useState } from "react";
import { iiifCropUrl, pageUrl } from "../iiif";
import { PageSketch } from "../PageSketch";
import type { CaseStop } from "../../lib/detective/case";
import { monthDay } from "../../lib/game/format";

function Thumb({ stop }: { stop: CaseStop }) {
  const [failed, setFailed] = useState(false);
  const c = stop.clue;
  if (failed) return <PageSketch variant="clip" className="nb-thumb" />;
  return <img className="nb-thumb" src={iiifCropUrl(c.iiifBase, c.focus ?? c.box, 160)} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

export function Notebook({ read }: { read: CaseStop[] }) {
  return (
    <>
      <ol className="nb-list">
        {read.map((s) => (
          <li key={s.n}>
            <a className="nb-card" href={pageUrl(s.clue.pageId)} title={s.clue.citationMla}>
              <Thumb stop={s} />
              <span>
                <span className="nb-title">{s.title}</span>
                <span className="nb-cite num">
                  {s.clue.paper} · {monthDay(s.clue.date)}, {s.clue.date.slice(0, 4)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
      <p className="nb-note">Every clue links to its real page at the Library of Congress.</p>
    </>
  );
}
