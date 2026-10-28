"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Check, Pending, Strike } from "../../components/Marks";
import { monthDay, shortDate } from "../../lib/game/format";
import { anniversaryForDay, isUnlocked } from "../../lib/game/schedule";
import { beatNellie, daysLeft } from "../../lib/game/scoring";
import { streak } from "../../lib/game/progress";
import { usePlayer } from "../../lib/game/usePlayer";

type Listed = { day: number; date1889: string; title: string };

// The race board: one line per dispatch, set like a steamship timetable.
export default function RaceBoard() {
  const p = usePlayer();
  const days = useQuery(api.gameDays.listPublished, {}) as Listed[] | undefined;
  const left = daysLeft(p.progress);
  return (
    <main className="column">
      <p className="dateline">
        <span>THEN &amp; THERE</span>
        <span className="num">{left} days left · streak {streak(p.progress, p.today)}</span>
      </p>
      <h1>The race</h1>
      <p>
        Nellie Bly left Hoboken on November 14, 1889, to beat Phileas Fogg&apos;s 80 days. You have the same 80. Every
        missed call costs 3; every question to the City Editor costs 1.{" "}
        {beatNellie(p.progress) ? "Right now you're ahead of her." : "Right now she's ahead of you."}
      </p>
      <ol className="board" role="list">
        {days === undefined ? <li className="caption">Pulling the board…</li> : null}
        {days?.map((d) => {
          const open = p.ready && isUnlocked(d.day, p.today, p.demo);
          const r = p.progress.days[d.day];
          return (
            <li key={d.day} className={`board-row ${open ? "" : "is-locked"}`}>
              <span className="board-day num">Day {d.day}</span>
              <span className="board-date num">{monthDay(d.date1889)}, {d.date1889.slice(0, 4)}</span>
              <span className="board-title">
                {open ? <Link href={`/play/${d.day}`}>{d.title}</Link> : <>Arrives {shortDate(anniversaryForDay(d.day))}</>}
              </span>
              <span className="board-mark" aria-label={r ? (r.correct ? "Made the call" : "Missed the call") : "Not yet filed"}>
                {r ? r.correct ? <Check /> : <Strike /> : <Pending />}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="demo-toggle">
        <label>
          <input type="checkbox" checked={p.demo} onChange={(e) => p.setDemo(e.target.checked)} /> Preview mode: open every
          dispatch now, without waiting for its anniversary
        </label>
      </p>
      <p><Link href="/play/finale">The finale: guess her exact time</Link></p>
    </main>
  );
}
