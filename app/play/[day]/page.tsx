"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CallForm } from "../../../components/CallForm";
import { CityEditorHint } from "../../../components/CityEditorHint";
import { Meanwhile } from "../../../components/Meanwhile";
import { Morgue } from "../../../components/Morgue";
import { ScanCrop } from "../../../components/ScanCrop";
import { revealWaitsForBallot } from "../../../lib/game/finale";
import { longDate } from "../../../lib/game/format";
import { anniversaryForDay, isUnlocked } from "../../../lib/game/schedule";
import { daysLeft } from "../../../lib/game/scoring";
import { shareText } from "../../../lib/game/share";
import type { Question } from "../../../lib/game/types";
import { usePlayer } from "../../../lib/game/usePlayer";

type Box = { x: number; y: number; w: number; h: number };
type Clip = { pageId: string; iiifBase: string; box: Box; focus?: Box; paper: string; date: string; citationMla: string; excerpt: string };
type Day = { day: number; date1889: string; title: string; clue: Clip; question: Question; hints: string[]; reveal: Clip & { explanation: string }; morgue?: Array<Clip & { clippingId: string }> };

export default function DispatchPage() {
  const day = Number(useParams<{ day: string }>().day);
  const p = usePlayer();
  const unlocked = p.ready && Number.isInteger(day) && isUnlocked(day, p.today, p.demo);
  // Locked days never fetch content, so the answer can't reach the browser early.
  const row = useQuery(api.gameDays.getPublished, unlocked ? { day } : "skip") as Day | null | undefined;
  const result = p.progress.days[day];
  const left = daysLeft(p.progress);
  const [shared, setShared] = useState("");

  const dateline = (
    <p className="dateline">
      <Link href="/play">THEN &amp; THERE</Link>
      <span className="num">Day {day} · {left} days left</span>
    </p>
  );

  if (!p.ready) return <main className="column">{dateline}</main>;

  if (!unlocked) {
    return (
      <main className="column">
        {dateline}
        <h1>This dispatch hasn&apos;t come over the wire yet.</h1>
        <p>
          It arrives <time dateTime={anniversaryForDay(day)}>{longDate(anniversaryForDay(day))}</time>, 137 years to the
          day after 1889 readers saw it.
        </p>
        <p><Link href="/play">Back to the race</Link></p>
      </main>
    );
  }

  if (row === undefined) return <main className="column">{dateline}<p className="caption">Pulling the proof…</p></main>;
  if (row === null) {
    return (
      <main className="column">
        {dateline}
        <h1>No dispatch filed for Day {day}.</h1>
        <p><Link href="/play">Back to the race</Link></p>
      </main>
    );
  }

  const share = async () => {
    if (!result) return;
    const text = shareText(day, result, p.progress);
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setShared("Copied to your clipboard.");
      }
    } catch {
      setShared("");
    }
  };

  return (
    <main className="desk">
      <div className="column desk-dateline">{dateline}</div>
      <div className="desk-grid">
        <section className="desk-proof" aria-label="Today's dispatch">
          <ScanCrop iiifBase={row.clue.iiifBase} box={row.clue.box} focus={row.clue.focus} pageId={row.clue.pageId} alt={row.clue.excerpt} citation={row.clue.citationMla} />
        </section>
        <section className="desk-copy">
          <h1>{row.title}</h1>
          <p className="caption">
            What readers saw on <time dateTime={row.date1889}>{longDate(row.date1889)}</time>
          </p>
          <blockquote className="transcript">{row.clue.excerpt}…</blockquote>
          <Morgue items={row.morgue ?? []} />
          <CallForm question={row.question} filed={result} onFile={(correct) => p.answer(day, correct)} />
          <CityEditorHint hints={row.hints} used={result ? result.hintsUsed : p.hintsUsed[day] ?? 0} disabled={Boolean(result)} onAsk={() => p.useHint(day)} />
          {result && revealWaitsForBallot(day, p.progress) ? (
            <section className="reveal" aria-labelledby="reveal-h">
              <h2 id="reveal-h">Cast your ballot first</h2>
              <p>
                The papers that came next printed her exact time. File your guess for the finale, then come back for
                the reveal.
              </p>
              <p><Link href="/play/finale">Fill in your ballot</Link></p>
            </section>
          ) : result ? (
            <>
              <section className="reveal" aria-labelledby="reveal-h">
                <h2 id="reveal-h">What the papers said next</h2>
                <ScanCrop iiifBase={row.reveal.iiifBase} box={row.reveal.box} focus={row.reveal.focus} pageId={row.reveal.pageId} alt={row.reveal.excerpt} citation={row.reveal.citationMla} />
                <p>{row.reveal.explanation}</p>
              </section>
              <Meanwhile date1889={row.date1889} state={p.state} onState={p.setState} />
              <p className="share-row">
                <button type="button" className="file-button" onClick={share}>Share today&apos;s call</button>
                <span className="caption" role="status">{shared}</span>
              </p>
            </>
          ) : null}
          <nav className="day-nav" aria-label="Other days">
            <Link href="/play">All dispatches</Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
