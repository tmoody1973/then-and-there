// The trail: every port on Bly's real route. Passed stops are filled, where you are is red,
// ports ahead are blank until you reach them. Phone draws it as a line of dots; laptop as a list.
import { monthDay } from "../../lib/game/format";
import { type CaseStop, STOPS } from "../../lib/detective/case";

type Props = { built: CaseStop[]; here: number /* index into STOPS */ };

export function Trail({ built, here }: Props) {
  const byN = new Map(built.map((s) => [s.n, s]));
  const home = STOPS.length - 1;
  const state = (n: number) => (n < here ? "is-past" : n === here ? "is-here" : "is-ahead");
  const now = STOPS[here];
  return (
    <>
      <div className="trail-dots only-phone">
        <ol aria-label={`The trail: stop ${here + 1} of ${STOPS.length}`}>
          {STOPS.map((s, n) => (
            <li key={n} className={state(n)} />
          ))}
        </ol>
        <p>
          <span>Left New York, Nov. 14</span>
          <span className="trail-now">Now: {now.place}</span>
        </p>
      </div>
      <nav className="trail-list only-laptop" aria-label="The trail">
        <p className="agent-label">The trail</p>
        <ol>
          {STOPS.map((s, n) => {
            const card = byN.get(n);
            const known = n <= here || n === home;
            return (
              <li key={n} className={`${state(n)} ${n === home ? "is-home" : ""}`} aria-current={n === here ? "step" : undefined}>
                <span className="trail-name">{known ? s.place : "?"}</span>
                {n === home ? (
                  <span className="trail-note">The finish line</span>
                ) : n === 0 ? (
                  <span className="trail-note num">Left Nov. 14, 1889</span>
                ) : n <= here && card ? (
                  <span className="trail-note num">
                    In print {monthDay(card.clue.date)}
                    {n === here ? " · you are here" : ""}
                  </span>
                ) : n < here ? (
                  <span className="trail-note">No dispatch in our files</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
