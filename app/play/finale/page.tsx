"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { ScanCrop } from "../../../components/ScanCrop";
import { FINALE_DAY, finaleResult } from "../../../lib/game/finale";
import { longDate } from "../../../lib/game/format";
import { anniversaryForDay, isUnlocked } from "../../../lib/game/schedule";
import { usePlayer } from "../../../lib/game/usePlayer";

// The World's own contest, Nov 29, 1889 (verified on the scan): the reason this ballot exists.
const CONTEST = {
  pageId: "http://www.loc.gov/resource/sn83030193/1889-11-29/ed-2/?sp=1",
  iiifBase: "https://tile.loc.gov/image-services/iiif/service:ndnp:nn:batch_nn_hanyu_ver01:data:sn83030193:00206539525:1889112902:0708",
  box: { x: 0, y: 770, w: 4905, h: 945 },
  citation: "The Evening World (New York), November 29, 1889, page 1. Library of Congress, Chronicling America.",
};

type Box = { x: number; y: number; w: number; h: number };
type Reveal = { pageId: string; iiifBase: string; box: Box; focus?: Box; citationMla: string; excerpt: string };

const UNITS = [
  ["days", 86400],
  ["hours", 3600],
  ["minutes", 60],
  ["seconds", 1],
] as const;

export default function FinalePage() {
  const p = usePlayer();
  const unlocked = p.ready && isUnlocked(FINALE_DAY, p.today, p.demo);
  const row = useQuery(api.gameDays.getPublished, unlocked ? { day: FINALE_DAY } : "skip") as
    | { finaleSeconds?: number; reveal: Reveal }
    | null
    | undefined;
  const [parts, setParts] = useState<Record<string, string>>({ days: "", hours: "", minutes: "", seconds: "" });
  const guess = UNITS.reduce((sum, [k, mult]) => sum + (Number(parts[k]) || 0) * mult, 0);
  const filed = p.progress.finale;

  return (
    <main className="column">
      <p className="dateline">
        <Link href="/play">← The race</Link>
        <span className="num">The finale</span>
      </p>
      <h1>Guess her exact time.</h1>
      <p>
        In 1889 The World offered a free trip to Europe to the reader with the nearest guess. Fill in your own ballot:
        days, hours, minutes and seconds from Hoboken back to New York.
      </p>
      <ScanCrop iiifBase={CONTEST.iiifBase} box={CONTEST.box} pageId={CONTEST.pageId} alt="The Evening World's banner: A free trip to Europe for the nearest guess as to the exact time of Nellie Bly's tour." citation={CONTEST.citation} />

      {!p.ready ? null : !unlocked ? (
        <p className="ballot-closed">
          The ballot box opens <time dateTime={anniversaryForDay(FINALE_DAY)}>{longDate(anniversaryForDay(FINALE_DAY))}</time>.{" "}
          <Link href="/play">Back to the race</Link>
        </p>
      ) : row === undefined ? (
        <p className="caption">Opening the ballot box…</p>
      ) : !row?.finaleSeconds ? (
        <p>No finale has been filed yet. <Link href="/play">Back to the race</Link></p>
      ) : filed ? (
        <section className="reveal" aria-labelledby="finale-result">
          <h2 id="finale-result">{finaleResult(filed.guessSeconds, row.finaleSeconds).label}.</h2>
          <p>What the papers printed the next day:</p>
          <ScanCrop iiifBase={row.reveal.iiifBase} box={row.reveal.box} focus={row.reveal.focus} pageId={row.reveal.pageId} alt={row.reveal.excerpt} citation={row.reveal.citationMla} />
        </section>
      ) : (
        <form
          className="ballot"
          onSubmit={(e) => {
            e.preventDefault();
            if (guess > 0) p.guessFinale(guess);
          }}
        >
          <fieldset>
            <legend className="call-prompt">Your ballot</legend>
            <div className="ballot-fields">
              {UNITS.map(([k]) => (
                <label key={k} className="ballot-field">
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={parts[k]}
                    onChange={(e) => setParts({ ...parts, [k]: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                  />
                  <span>{k}</span>
                </label>
              ))}
            </div>
            <button type="submit" className="file-button" disabled={guess === 0}>
              Cast your ballot
            </button>
            <p className="caption">One ballot per reader. It can&apos;t be changed once it&apos;s cast.</p>
          </fieldset>
        </form>
      )}
    </main>
  );
}
