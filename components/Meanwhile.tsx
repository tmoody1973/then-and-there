"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { MIDWEST_STATES } from "../lib/game/pickMeanwhile";
import { titleCase } from "../lib/game/format";
import { ScanCrop } from "./ScanCrop";

type Clip = { pageId: string; iiifBase: string; box: { x: number; y: number; w: number; h: number }; paper: string; citationMla: string; excerpt: string; date: string; translatedFrom?: string };
type Result = { clip: Clip; scope: string; fellBackFrom?: string } | null | undefined;

// Meanwhile, back home: what a paper in the player's state printed the same day.
export function Meanwhile({ date1889, state, onState }: { date1889: string; state: string; onState: (s: string) => void }) {
  const res = useQuery(api.meanwhile.forDay, { date1889, state }) as Result;
  return (
    <section className="meanwhile" aria-labelledby="meanwhile-h">
      <div className="meanwhile-head">
        <h2 id="meanwhile-h">Meanwhile, back home</h2>
        <label className="state-pick">
          <span className="visually-hidden">Your state</span>
          <select value={state} onChange={(e) => onState(e.target.value)}>
            {MIDWEST_STATES.map((s) => (
              <option key={s} value={s}>{titleCase(s)}</option>
            ))}
          </select>
        </label>
      </div>
      {res === undefined ? <p className="caption">Checking the exchanges…</p> : null}
      {res === null ? <p className="caption">No Midwest papers in the archive carried a story for this day.</p> : null}
      {res ? (
        <>
          {res.fellBackFrom ? (
            <p className="caption">No {titleCase(res.fellBackFrom)} papers survive in the archive for this day. From elsewhere in the Midwest:</p>
          ) : null}
          <p className="meanwhile-text">{res.clip.excerpt}…</p>
          {res.clip.translatedFrom ? (
            <p className="caption">Translated from {titleCase(res.clip.translatedFrom)} by the pipeline; the original is below.</p>
          ) : null}
          <ScanCrop iiifBase={res.clip.iiifBase} box={res.clip.box} pageId={res.clip.pageId} alt={res.clip.excerpt} citation={res.clip.citationMla} ringed={false} />
        </>
      ) : null}
    </section>
  );
}
