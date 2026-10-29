"use client";

// After the guess: the score, the real page with every clue ringed where it sat, and the Game
// Master's "how you could have known" for each clue, each line checked against its scan.
import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { plainCitation } from "../../lib/loc/cite";
import type { Region } from "../../lib/frontpage/rules";
import { shareText } from "../../lib/frontpage/share";
import { titleCase } from "../../lib/game/format";
import type { BoardClue } from "./Board";
import { PageNote } from "../PageNote";

const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const locPage = (pageId: string) => pageId.replace(/^http:/, "https:");

export function Result({ no, count, clues, revealed, guess }: { no: number; count: number; clues: BoardClue[]; revealed: number; guess: { year: number; region: Region } }) {
  const r = useQuery(api.frontPages.reveal, { no, revealed, year: guess.year, region: guess.region });
  const [imgFailed, setImgFailed] = useState(false);
  const [shared, setShared] = useState("");
  if (r === undefined) return <p className="caption">Checking your guess against the page…</p>;
  if (r === null) return <p className="caption">This page isn&apos;t in the rotation any more.</p>;
  const { answer: a, score: s } = r;
  const share = async () => {
    const text = shareText({ no, revealed, total: clues.length, ...s });
    const canShare = typeof navigator.share === "function";
    try {
      if (canShare) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(canShare ? "" : "Copied. Paste it anywhere.");
    } catch {
      setShared("");
    }
  };

  return (
    <section className="fp-result" aria-labelledby="fp-result-h">
      <p className="slugline">Front page no. {no} · The answer</p>
      <h2 id="fp-result-h" className="fp-answer">
        {a.paper}, {titleCase(a.city)}, {titleCase(a.state)}
      </h2>
      <p className="fp-answer-date">{longDate(a.date)} · {a.region}</p>

      <dl className="fp-score">
        <div><dt>Points</dt><dd className="num">{s.points.toLocaleString("en-US")}</dd></div>
        <div><dt>Your year</dt><dd className="num">{guess.year}<span className="fp-off">{s.yearsOff === 0 ? "exact" : `${s.yearsOff} off`}</span></dd></div>
        <div><dt>Your region</dt><dd>{guess.region}<span className={`fp-off${s.regionRight ? " is-right" : ""}`}>{s.regionRight ? "right" : "wrong"}</span></dd></div>
        <div><dt>Clues used</dt><dd className="num">{revealed} of {clues.length}</dd></div>
      </dl>
      <p className="fp-share-row">
        <button type="button" className="file-button" onClick={share}>Share your score</button>
        <span className="caption" role="status">{shared}</span>
      </p>

      <div className="fp-result-grid">
        <figure className="fp-page">
          <PageNote pageId={a.pageId} />
          {imgFailed ? (
            <p className="scan-fallback">The Library&apos;s image server didn&apos;t answer. <a href={locPage(a.pageId)}>Open this page at loc.gov</a>.</p>
          ) : (
            <div className="fp-page-sheet" style={{ aspectRatio: String(a.imageWidth / a.imageHeight) }}>
              <img src={`${a.iiifBase}/full/900,/0/default.jpg`} alt={`The front page of ${a.paper}, ${longDate(a.date)}.`} onError={() => setImgFailed(true)} />
              {clues.map((c, n) => (
                <span key={n} className="fp-ring" style={{ left: pct(c.box.x), top: pct(c.box.y), width: pct(c.box.w), height: pct(c.box.h) }}>
                  <span className="fp-ring-no">{n + 1}</span>
                </span>
              ))}
            </div>
          )}
          <figcaption className="caption">{plainCitation(a.citeThis.mla)} <a href={locPage(a.pageId)}>Open at loc.gov</a></figcaption>
        </figure>

        <div>
          <h3 className="agent-label"><span>How you could have known</span></h3>
          <ol className="fp-known">
            {r.clues.map((c, n) => (
              <li key={n}>
                <span className="fp-known-no num">{n + 1}</span>
                <div>
                  <p className="fp-known-label">{c.label}{n >= revealed ? <span className="fp-unseen"> · you didn&apos;t open this one</span> : null}</p>
                  <p>{c.prints} {c.why}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="caption">Each line was checked against its scan by the Editor, a separate Meta model, before it reached you.</p>
          <p className="fp-next">
            A new page at midnight Central.{" "}
            {count > 1 ? <Link href={`/front-page/${(no % count) + 1}`}>Play page no. {(no % count) + 1} now →</Link> : null}
          </p>
        </div>
      </div>
    </section>
  );
}
