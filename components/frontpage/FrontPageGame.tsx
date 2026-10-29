"use client";

// Front Page no. N: reveal clues one at a time, guess when and where, lock it in. Progress lives
// in this browser; the answer stays on the server until the guess is locked.
import { useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { cluePool, type Region } from "../../lib/frontpage/rules";
import { Board } from "./Board";
import { Guess } from "./Guess";
import { Result } from "./Result";

type Saved = { revealed: number; guess?: { year: number; region: Region } };
const keyOf = (no: number) => `tt.fp.v1.${no}`;
function load(no: number): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(keyOf(no)) ?? "null") as Saved | null;
    return v && typeof v.revealed === "number" ? v : { revealed: 1 };
  } catch {
    return { revealed: 1 };
  }
}

export function FrontPageGame({ no }: { no: number }) {
  const board = useQuery(api.frontPages.board, { no });
  const [saved, setSaved] = useState<Saved>({ revealed: 1 });
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(0);
  const [year, setYear] = useState(1900);
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    const s = load(no);
    setSaved(s);
    setSelected(s.revealed - 1);
    setReady(true);
  }, [no]);
  const save = (next: Saved) => {
    setSaved(next);
    try {
      localStorage.setItem(keyOf(no), JSON.stringify(next));
    } catch {
      // private mode: the round still plays, it just won't survive a reload
    }
  };

  const total = board?.clues.length ?? 6;
  const pts = cluePool(saved.revealed);
  const bar = (
    <p className="dateline only-phone">
      <Link href="/">← Today</Link>
      <span>Front page no. {no}</span>
      <span className="fp-pts num">{saved.guess ? "Locked" : `${pts.toLocaleString("en-US")} pts`}</span>
    </p>
  );
  if (board === undefined || !ready) return <main className="fp">{bar}<p className="caption">Laying out today&apos;s page…</p></main>;
  if (board === null) return <main className="fp">{bar}<p>There&apos;s no front page no. {no}. <Link href="/front-page">Play today&apos;s page</Link>.</p></main>;

  const current = board.clues[selected];
  const reveal = () => {
    const next = Math.min(saved.revealed + 1, total);
    save({ ...saved, revealed: next });
    setSelected(next - 1);
  };

  return (
    <main className="fp">
      {bar}
      <header className="fp-head only-laptop">
        <h1>Front page no. {no}</h1>
        <p className="fp-head-meta">
          Same page for everyone · <span className="num">{saved.revealed} of {total}</span> clues showing
        </p>
      </header>
      <h1 className="visually-hidden only-phone">Front page no. {no}: where and when was this printed?</h1>

      <div className="fp-grid">
        <div className="fp-left">
          <Board clues={board.clues} aspect={board.aspect} revealed={saved.guess ? total : saved.revealed} selected={selected} onSelect={setSelected} />
          {current && selected < (saved.guess ? total : saved.revealed) ? (
            <figure className="fp-reader" aria-live="polite">
              <figcaption className="slugline">Clue {selected + 1} · {current.label}</figcaption>
              <img src={current.url} alt={`Clue ${selected + 1}: ${current.label}, cut from the real page.`} />
            </figure>
          ) : null}
        </div>

        <aside className="fp-side">
          <h2 className="agent-label"><span>Clues</span></h2>
          <ol className="fp-clues">
            {board.clues.map((c, n) => {
              const shown = n < saved.revealed || Boolean(saved.guess);
              return (
                <li key={n} className={shown ? "is-shown" : undefined}>
                  <span className="fp-clue-no num">{n + 1}</span>
                  {shown ? (
                    <button type="button" className="fp-clue-name" onClick={() => setSelected(n)} aria-current={selected === n ? "true" : undefined}>{c.label}</button>
                  ) : (
                    <span className="fp-clue-name">{c.label}</span>
                  )}
                  <span className="fp-clue-state">{shown ? "Showing" : "Hidden"}</span>
                </li>
              );
            })}
          </ol>
          {!saved.guess ? (
            <>
              <button type="button" className="file-button is-outline fp-next-clue" onClick={reveal} disabled={saved.revealed >= total}>
                {saved.revealed >= total ? "Every clue is showing" : "Reveal next clue · −150 pts"}
              </button>
              <div className="fp-guess-wrap">
                <p className="fp-pool only-laptop"><span className="num">{pts.toLocaleString("en-US")}</span> points on the table</p>
                <Guess year={year} region={region} onYear={setYear} onRegion={setRegion} onLock={() => region && save({ ...saved, guess: { year, region } })} />
              </div>
            </>
          ) : null}
        </aside>
      </div>

      {saved.guess ? <Result no={no} count={board.count} clues={board.clues} revealed={saved.revealed} guess={saved.guess} /> : null}
    </main>
  );
}
