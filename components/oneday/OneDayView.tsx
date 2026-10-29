"use client";

// One Day, Many Papers: three real front pages from one day, the story's pieces tinted by where
// they came from. Gray: wire copy another paper also ran. Red: what this paper printed on its own.
import Link from "next/link";
import { useState } from "react";
import { iiifCropUrl, pageUrl } from "../iiif";
import { ScanCrop } from "../ScanCrop";
import { useImageFailed } from "../useImageFailed";
import { DAYS, dayLabel, weekday } from "../../lib/oneday/days";

type Box = { x: number; y: number; w: number; h: number };
type Mark = { box: Box; mark: "wire" | "own"; excerpt: string };
export type DayPaper = { paper: string; city: string; state: string; date: string; pageId: string; iiifBase: string; width: number; height: number; citationMla: string; language?: string | null; share: number; marks: Mark[] };
export type DayData = { slug: string; papers: DayPaper[]; noticed?: string; question?: string };

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

function Sheet({ p, onlyOwn }: { p: DayPaper; onlyOwn: boolean }) {
  const { failed, bind } = useImageFailed();
  return (
    <div className="od-sheet" style={{ aspectRatio: `${p.width} / ${p.height}` }}>
      {failed ? (
        // Already inside the link to the page; a second link here would nest.
        <p className="od-fallback">Scan unavailable. Tap to open this page at loc.gov.</p>
      ) : (
        <img src={iiifCropUrl(p.iiifBase, { x: 0, y: 0, w: p.width, h: p.height }, 900)} alt={`Front page of the ${p.paper}, ${shortDate(p.date)}`} {...bind} />
      )}
      {p.marks.map((m, i) => (
        <span
          key={i}
          className={`od-mark is-${m.mark} ${onlyOwn && m.mark === "wire" ? "is-quiet" : ""}`}
          style={{ left: pct(m.box.x, p.width), top: pct(m.box.y, p.height), width: pct(m.box.w, p.width), height: pct(m.box.h, p.height) }}
        />
      ))}
    </div>
  );
}

export function OneDayView({ day }: { day: DayData }) {
  const [onlyOwn, setOnlyOwn] = useState(false);
  const meta = DAYS.find((d) => d.slug === day.slug)!;
  const others = DAYS.filter((d) => d.slug !== day.slug);
  return (
    <main className="od">
      <p className="dateline only-phone">
        <Link href="/">← Today</Link>
        <span>One day, many papers</span>
        <span className="od-count">{day.papers.length} papers</span>
      </p>
      <header className="od-head">
        <div>
          <p className="slugline">
            <span className="only-laptop">One day, many papers · </span>
            {weekday(day.slug)}
          </p>
          <h1>{dayLabel(day.slug)}</h1>
          <p className="od-dek">{meta.dek}</p>
        </div>
        <div className="od-toggle" role="group" aria-label="What to show">
          <button type="button" aria-pressed={!onlyOwn} onClick={() => setOnlyOwn(false)}>All coverage</button>
          <button type="button" aria-pressed={onlyOwn} onClick={() => setOnlyOwn(true)}>Only what changed</button>
        </div>
      </header>

      <div className="od-grid">
        <div className="od-papers">
          {day.papers.map((p) => {
            const own = p.marks.filter((m) => m.mark === "own");
            return (
              <figure key={p.pageId} className="od-paper">
                <figcaption>
                  <span className="od-name">{p.paper}</span>
                  <span className="od-place">{p.city}, {p.state} · {shortDate(p.date)}{p.language ? ` · in ${p.language}` : ""}</span>
                </figcaption>
                <a href={pageUrl(p.pageId)} title={p.citationMla}><Sheet p={p} onlyOwn={onlyOwn} /></a>
                <p className="od-only only-laptop">
                  {own.length ? `Only here: “${own[0].excerpt.slice(0, 90).trim()}…”` : "Nothing on the story that another paper didn’t also run."}
                </p>
              </figure>
            );
          })}
        </div>

        <aside className="od-side">
          <ul className="od-legend" role="list">
            <li><span className="od-key is-wire" /> Shared wire copy</li>
            <li><span className="od-key is-own" /> Only in this paper</li>
          </ul>
          {day.noticed ? (
            <section className="od-notice" aria-label="The Comparer noticed">
              <p className="agent-label">The Comparer noticed</p>
              <p>{day.noticed}</p>
              {day.question ? <p className="od-question">{day.question}</p> : null}
              <a className="od-jump" href="#changes">Read the changes side by side →</a>
            </section>
          ) : null}
          <nav className="od-more" aria-label="Try another day">
            <p className="agent-label">Try another day</p>
            <ul role="list">
              {others.map((d) => (
                <li key={d.slug}>
                  <Link href={`/one-day/${d.slug}`}>{shortDate(d.slug)}, {d.slug.slice(0, 4)} · {d.event.replace(/^(an?|the) /, "").replace(/^\w/, (c) => c.toUpperCase())}</Link>
                </li>
              ))}
              <li><Link className="is-any" href="/explore">Search any other date…</Link></li>
            </ul>
          </nav>
        </aside>
      </div>

      <section id="changes" className="od-changes" aria-labelledby="changes-h">
        <h2 id="changes-h">What each paper printed on its own</h2>
        <div className="od-columns">
          {day.papers.map((p) => {
            const own = p.marks.filter((m) => m.mark === "own");
            const wire = p.marks.length - own.length;
            return (
              <section key={p.pageId} aria-label={p.paper}>
                <h3>{p.paper}</h3>
                <p className="od-tally num">
                  The story took {Math.round(p.share * 100)}% of the front page · {own.length} piece{own.length === 1 ? "" : "s"} of its own · {wire} from the wire
                </p>
                {own.slice(0, 3).map((m, i) => (
                  <ScanCrop key={i} iiifBase={p.iiifBase} box={m.box} pageId={p.pageId} alt={m.excerpt} citation={p.citationMla} ringed={false} />
                ))}
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
