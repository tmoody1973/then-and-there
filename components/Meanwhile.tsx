"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import { ANCHOR_CITIES } from "../lib/agent/places";
import { markSeen, seenIds, useAgent } from "../lib/agent/useAgent";
import { MIDWEST_STATES } from "../lib/game/pickMeanwhile";
import { titleCase } from "../lib/game/format";
import { ScanCrop } from "./ScanCrop";

type Clip = { pageId: string; iiifBase: string; box: { x: number; y: number; w: number; h: number }; paper: string; citationMla: string; excerpt: string; date: string; translatedFrom?: string };
type Result = { clip: Clip & { clippingId: string }; scope: string; fellBackFrom?: string } | null | undefined;

// Each 1889 date keeps the story it first showed this reader; other dates skip stories already seen.
const SHOWN_KEY = "tt.mw.v1";
function shownFor(): Record<string, string> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SHOWN_KEY) ?? "{}");
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

// Meanwhile, back home: what a paper in the player's state printed the same day.
export function Meanwhile({ date1889, state, onState }: { date1889: string; state: string; onState: (s: string) => void }) {
  const { mine } = useAgent();
  const city = mine?.follows.find((f) => f.kind === "place" && ANCHOR_CITIES.includes(f.value))?.value;
  const [exclude, setExclude] = useState<string[] | null>(null);
  useEffect(() => {
    const keep = shownFor()[date1889];
    setExclude(seenIds().filter((id) => id !== keep).slice(0, 50));
  }, [date1889]);
  const res = useQuery(api.meanwhile.forDay, exclude ? { date1889, state, exclude, ...(city ? { city } : {}) } : "skip") as Result;
  useEffect(() => {
    if (!res) return;
    try {
      localStorage.setItem(SHOWN_KEY, JSON.stringify({ ...shownFor(), [date1889]: res.clip.clippingId }));
    } catch {
      // private mode
    }
    markSeen(res.clip.clippingId);
  }, [res, date1889]);
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
            <p className="caption">
              No {titleCase(res.fellBackFrom)} papers survive in the archive for this day.{" "}
              {res.scope === "national" ? "From papers elsewhere in the country:" : res.scope === "midwest" ? "From elsewhere in the Midwest:" : `From ${titleCase(res.scope)}:`}
            </p>
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
