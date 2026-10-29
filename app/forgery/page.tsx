"use client";

// Spot the Forgery: a real 1889 front page with one ad redrawn by Muse Image as something from the
// future. Tap the part you think was added; the real page is one tap away after you answer.
import Link from "next/link";
import { useEffect, useState } from "react";
import data from "../../data/forgery/rounds.json";
import { iiifCropUrl, pageUrl } from "../../components/iiif";
import "./forgery.css";

type Box = { x: number; y: number; w: number; h: number };
type Round = { round: number; image: string; width: number; height: number; pageId: string; iiifBase: string; paper: string; place: string; date: string; citationMla: string; product: string; why: string; parts: Array<{ n: number; forged: boolean; box: Box }>; originalBox: Box };
type Saved = { at: number; picks: Record<number, number> };

const rounds = data.rounds as Round[];
const KEY = "tt.forgery.v1";
const LABEL_H = 56; // the printed "altered" band under every forged page
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const longDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "") as Saved;
    return Number.isInteger(s.at) && typeof s.picks === "object" ? s : { at: 0, picks: {} };
  } catch {
    return { at: 0, picks: {} };
  }
}

// One region of the forged page, cut out with CSS so the altered pixels never leave the round's own file.
function ForgedCut({ r, box }: { r: Round; box: Box }) {
  const H = r.height + LABEL_H;
  return (
    <div
      className="fg-cut"
      role="img"
      aria-label={`The redrawn ad: ${r.product}`}
      style={{
        aspectRatio: `${box.w} / ${box.h}`,
        backgroundImage: `url(${r.image})`,
        backgroundSize: `${(r.width / box.w) * 100}% auto`,
        backgroundPosition: `${(box.x / (r.width - box.w)) * 100}% ${(box.y / (H - box.h)) * 100}%`,
      }}
    />
  );
}

export default function ForgeryPage() {
  const [saved, setSaved] = useState<Saved>({ at: 0, picks: {} });
  const [pick, setPick] = useState<number | null>(null);
  useEffect(() => setSaved(load()), []);
  const save = (s: Saved) => {
    setSaved(s);
    setPick(null);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // private mode: keep playing
    }
  };
  const r = rounds[Math.min(saved.at, rounds.length - 1)];
  const locked = saved.picks[r.round];
  const chosen = locked ?? pick;
  const forged = r.parts.find((p) => p.forged)!;
  const H = r.height + LABEL_H;
  const score = rounds.filter((x) => saved.picks[x.round] === x.parts.find((p) => p.forged)!.n).length;
  const played = rounds.filter((x) => saved.picks[x.round]).length;

  return (
    <main className="fg">
      <p className="dateline only-phone">
        <Link href="/">← Today</Link>
        <span>Spot the forgery</span>
        <span className="fg-round num">Round {r.round}</span>
      </p>
      <div className="fg-grid">
        <figure className="fg-page">
          <div className="fg-sheet" style={{ aspectRatio: `${r.width} / ${H}` }}>
            <img src={r.image} alt={`A front page of the ${r.paper}, altered for this game: one part was never printed.`} />
            {r.parts.map((p) => (
              <button
                key={p.n}
                type="button"
                className={`fg-part ${chosen === p.n ? "is-picked" : ""} ${locked && p.forged ? "is-forged" : ""}`}
                style={{ left: pct(p.box.x, r.width), top: pct(p.box.y, H), width: pct(p.box.w, r.width), height: pct(p.box.h, H) }}
                aria-label={`Part ${p.n}`}
                aria-pressed={chosen === p.n}
                disabled={Boolean(locked)}
                onClick={() => setPick(p.n)}
              >
                <span className="fg-no num">{p.n}</span>
              </button>
            ))}
          </div>
        </figure>

        <section className="fg-side" aria-labelledby="fg-h">
          <p className="slugline only-laptop">
            <span>Spot the forgery · Round {r.round} of {rounds.length}</span>
          </p>
          <h1 id="fg-h">One thing on this {r.date.slice(0, 4)} page was never printed.</h1>
          <p className="fg-dek">Tap the part you think was added.</p>
          <div className="fg-picks" role="group" aria-label="Parts of the page">
            {r.parts.map((p) => (
              <button
                key={p.n}
                type="button"
                className={`fg-pick ${chosen === p.n ? "is-picked" : ""} ${locked && p.forged ? "is-forged" : ""}`}
                aria-pressed={chosen === p.n}
                disabled={Boolean(locked)}
                onClick={() => setPick(p.n)}
              >
                {p.n}
              </button>
            ))}
          </div>
          <p className="fg-note">
            Muse Image changed one thing on this real page, for this round only. The untouched original is one tap away
            after you answer.
          </p>
          {!locked ? (
            <button type="button" className="file-button fg-lock" disabled={pick === null} onClick={() => pick !== null && save({ ...saved, picks: { ...saved.picks, [r.round]: pick } })}>
              {pick === null ? "Pick a part first" : `Lock in part ${pick}`}
            </button>
          ) : (
            <section className="fg-result" aria-live="polite">
              <h2>{locked === forged.n ? "You found it." : `Not that one. Part ${forged.n} was the forgery.`}</h2>
              <div className="fg-compare">
                <figure>
                  <ForgedCut r={r} box={forged.box} />
                  <figcaption>What Muse Image drew: {r.product}</figcaption>
                </figure>
                <figure>
                  <img src={iiifCropUrl(r.iiifBase, r.originalBox, 600)} style={{ aspectRatio: `${r.originalBox.w} / ${r.originalBox.h}` }} alt="The advertisement as the paper really printed it" />
                  <figcaption>What the paper really printed</figcaption>
                </figure>
              </div>
              <p className="fg-why">{r.why}</p>
              <p className="fg-cite">
                {r.paper}, {r.place}, {longDate(r.date)}. <a href={pageUrl(r.pageId)}>See the real page</a>
              </p>
              {saved.at < rounds.length - 1 ? (
                <button type="button" className="file-button" onClick={() => save({ ...saved, at: saved.at + 1 })}>
                  Next round →
                </button>
              ) : (
                <p className="fg-done">
                  {score} of {played} found. <button type="button" className="text-button" onClick={() => save({ at: 0, picks: {} })}>Play again</button>
                </p>
              )}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
