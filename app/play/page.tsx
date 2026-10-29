"use client";

// Detective, Case 01: follow Nellie Bly's 1889-90 race from the dispatches the papers printed.
// At each stop you read one real clipping and call where the next dispatch comes from.
import Link from "next/link";
import caseData from "../../data/detective/case01.json";
import { Notebook } from "../../components/detective/Notebook";
import { Trail } from "../../components/detective/Trail";
import { ScanCrop } from "../../components/ScanCrop";
import { type CaseStop, optionsFor, STOPS } from "../../lib/detective/case";
import { advance, answer, askEditor, left } from "../../lib/detective/progress";
import { useCase } from "../../lib/detective/useCase";
import { monthDay } from "../../lib/game/format";
import "./case.css";

const built = caseData.stops as CaseStop[];
const pageNo = (pageId: string) => pageId.match(/[?&]sp=(\d+)/)?.[1] ?? "1";
const today = () => new Date().toLocaleDateString("en-CA");

export default function CasePage() {
  const { state, ready, update, reset } = useCase();
  const at = Math.min(state.at, built.length - 1);
  const stop = built[at];
  const n = stop.n;
  const result = state.results[n];
  const asks = Boolean(stop.hint);
  const q = asks ? optionsFor(n) : null;
  const next = STOPS[n + 1];
  const daysLeft = left(state);
  const read = built.slice(0, at + 1);
  const nextBuilt = built[at + 1];

  return (
    <main className="case">
      <p className="dateline only-phone">
        <Link href="/">← Today</Link>
        <span>Case 01</span>
        <span className="case-left num">{daysLeft} days left</span>
      </p>
      <header className="case-head">
        <p className="slugline">
          <span>Detective · <span className="only-laptop">Case 01 · </span>Nov. 1889 – Jan. 1890</span>
          <span className="case-left only-laptop num">{daysLeft} days left</span>
        </p>
        <h1>The race around the world</h1>
        <p className="case-dek">
          A reporter set out to beat the 80-day record from a famous novel, and papers everywhere tracked every stop. Follow
          her trail from the clues they printed.
        </p>
      </header>

      <div className="case-grid">
        <Trail built={built} here={n} />

        <section className="case-main" aria-label={`Stop ${n + 1}: ${stop.place}`}>
          <article className="clue-card">
            <p className="clue-slug">
              <span>Clue · Dispatch from {stop.place.split(", ").at(-1)}</span>
              <span className="clue-real">real page</span>
            </p>
            <ScanCrop
              iiifBase={stop.clue.iiifBase}
              box={stop.clue.box}
              focus={stop.clue.focus}
              pageId={stop.clue.pageId}
              alt={stop.clue.excerpt}
              citation={`From ${stop.clue.paper} · ${monthDay(stop.clue.date)}, ${stop.clue.date.slice(0, 4)} · p. ${pageNo(stop.clue.pageId)}.`}
              ringed={false}
            />
            <p className="clue-summary">{stop.summary}</p>
          </article>

          {q && next ? (
            <>
              <h2 className="case-q">{q.prompt}</h2>
              <ul className="case-options" role="list">
                {q.options.map((opt, i) => (
                  <li key={opt}>
                    <button
                      type="button"
                      className={`case-option ${result && i === q.answerIndex ? "is-answer" : ""}`}
                      disabled={!ready || Boolean(result)}
                      onClick={() => update(answer(state, n, i === q.answerIndex, today()))}
                    >
                      {opt}
                    </button>
                  </li>
                ))}
              </ul>
              {result ? (
                <div className="case-verdict" role="status">
                  <p>
                    {result.correct ? (
                      <>Right. The next dispatch came from {next.place}.</>
                    ) : (
                      <>Not this time. The next dispatch came from {next.place}. That cost 3 days.</>
                    )}
                  </p>
                  {nextBuilt ? (
                    <button type="button" className="file-button" onClick={() => update(advance(state, built.length))}>
                      Follow her to {nextBuilt.name} →
                    </button>
                  ) : null}
                </div>
              ) : null}
              <aside className="editor-box" aria-label="The City Editor">
                <p className="agent-label">The City Editor says</p>
                {state.asked[n] || result ? (
                  <p className="editor-text">{stop.hint}</p>
                ) : (
                  <button type="button" className="text-button" disabled={!ready} onClick={() => update(askEditor(state, n))}>
                    Ask the City Editor · costs 1 day
                  </button>
                )}
              </aside>
            </>
          ) : (
            <section className="case-finish" aria-labelledby="finish-h">
              <h2 id="finish-h" className="case-q">One leg left: the train home</h2>
              <p>
                From here she crossed the country by rail. In 1890 The World asked its readers to guess her exact time,
                door to door. File your own guess.
              </p>
              <p className="case-finish-actions">
                <Link className="file-button" href="/play/finale">Guess her exact time</Link>
                <button type="button" className="text-button" onClick={reset}>Start the case again</button>
              </p>
            </section>
          )}

          <details className="notebook only-phone">
            <summary className="file-button is-outline">Open case notebook</summary>
            <Notebook read={read} />
          </details>
        </section>

        <aside className="notebook-side only-laptop" aria-label="Case notebook">
          <p className="agent-label">
            Case notebook · {read.length} clipping{read.length === 1 ? "" : "s"}
          </p>
          <Notebook read={read} />
        </aside>
      </div>
    </main>
  );
}
