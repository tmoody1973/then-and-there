"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FindCard, NightLog, WatchList } from "../../components/AgentDigest";
import { ScanCrop } from "../../components/ScanCrop";
import { PLACES } from "../../lib/agent/places";
import { markSeen, useAgent } from "../../lib/agent/useAgent";
import { titleCase } from "../../lib/game/format";
import "../play/play.css";
import "../agent.css";
import "./desk.css";

const day = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });

export default function MyAgentPage() {
  const agent = useAgent();
  const { mine, saved, markDeskRead } = agent;
  const [kind, setKind] = useState<"name" | "place">("name");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => setNow(Date.now()), []);
  // Opening the page reads its notes.
  useEffect(() => {
    if (mine) {
      markDeskRead();
      for (const n of mine.notes) markSeen(n.clippingId);
    }
  }, [mine, markDeskRead]);

  const follows = mine?.follows ?? [];
  const notes = mine?.notes ?? [];

  return (
    <main className="agent-page">
      <header className="agent-head double-rule">
        <p className="slugline">My Agent</p>
        <h1>Digging while you&apos;re away</h1>
        <p className="agent-sub">Quiet by default. It only writes when it finds something real.</p>
      </header>

      <div className="agent-columns">
        <div>
          <section id="finds-sec" aria-labelledby="finds-h" className="agent-section">
            <h2 id="finds-h" className="visually-hidden">Finds</h2>
            {mine === undefined ? (
              <p className="agent-empty">Opening your agent…</p>
            ) : notes.length ? (
              <div className="find-stack">
                {notes.map((n) => (
                  <FindCard key={n.clippingId} note={n} onDismiss={() => agent.dismiss(n.clippingId)} />
                ))}
              </div>
            ) : (
              <p className="agent-empty find-none">
                No finds yet. Each night the agent reads the pages the Library of Congress has just added. A note lands here
                only when the Editor confirms the find against the scan.
              </p>
            )}
          </section>

          <section id="log-sec" aria-labelledby="log-h" className="agent-section">
            <h2 id="log-h" className="visually-hidden">The night log</h2>
            <NightLog activity={mine?.activity ?? []} now={now} />
          </section>
        </div>

        <div>
          <section id="watch-sec" aria-labelledby="watch-h" className="agent-section">
            <h2 id="watch-h" className="agent-label"><span>Watching for you</span></h2>
            <WatchList follows={follows} onRemove={agent.unfollow} />
            <form
              id="add"
              className="follow-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                try {
                  await agent.follow(kind, value);
                  setValue("");
                } catch (err) {
                  setError(err instanceof Error ? err.message.replace(/^.*Uncaught Error: /s, "").split("\n")[0] : "Couldn't add that right now.");
                }
              }}
            >
              <label>
                <span className="visually-hidden">Watch for a</span>
                <select value={kind} onChange={(e) => { setKind(e.target.value as "name" | "place"); setValue(""); }}>
                  <option value="name">Name</option>
                  <option value="place">Place</option>
                </select>
              </label>
              {kind === "name" ? (
                <label className="grow">
                  <span className="visually-hidden">Name to watch for</span>
                  <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="A family name" maxLength={60} />
                </label>
              ) : (
                <label className="grow">
                  <span className="visually-hidden">Place to watch for</span>
                  <select value={value} onChange={(e) => setValue(e.target.value)}>
                    <option value="">Choose a place</option>
                    {PLACES.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
                  </select>
                </label>
              )}
              <button type="submit" className="file-button" disabled={!value.trim()}>+ Add</button>
            </form>
            {error ? <p className="caption" role="alert">{error}</p> : null}
          </section>

          <section id="remembers-sec" aria-labelledby="remembers-h" className="agent-section">
            <h2 id="remembers-h" className="agent-label"><span>What it remembers</span></h2>
            <p className="agent-privacy">
              The names and places above, the finds you&apos;ve kept, and the clippings you save. Your names are matched in our
              own code and are never sent to an AI model; the Editor sees only the clipping it is checking.
            </p>
            {confirming ? (
              <p>
                This deletes what you watch for, your finds and your saved clippings, here and on our server.{" "}
                <button type="button" className="text-button" onClick={async () => { await agent.forgetEverything(); setConfirming(false); }}>
                  Delete everything
                </button>{" "}
                <button type="button" className="text-button is-quiet" onClick={() => setConfirming(false)}>Keep it</button>
              </p>
            ) : (
              <button type="button" className="text-button is-quiet" onClick={() => setConfirming(true)}>Forget everything</button>
            )}
          </section>

          <section id="saved-sec" aria-labelledby="saved-h" className="agent-section">
            <h2 id="saved-h" className="agent-label"><span>Saved clippings</span></h2>
            {saved.length ? (
              <ol className="saved-list">
                {saved.map((c) => (
                  <li key={c.clippingId} className="desk-clip">
                    <p className="find-cite"><time dateTime={c.date}>{day(c.date)}</time> · {c.paper}</p>
                    <ScanCrop iiifBase={c.iiifBase} box={c.box} pageId={c.pageId} alt={c.excerpt} citation={c.citationMla} ringed={false} />
                    <button type="button" className="text-button is-quiet" onClick={() => agent.unsave(c.clippingId)}>
                      Remove from your desk
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="agent-empty">Save any story from <Link href="/explore">the archive search</Link> to keep it here.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
