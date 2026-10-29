"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScanCrop } from "../../components/ScanCrop";
import { PLACES } from "../../lib/agent/places";
import { type ClipRef, markSeen, useAgent } from "../../lib/agent/useAgent";
import { titleCase } from "../../lib/game/format";
import "../play/play.css";
import "./desk.css";

const when = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const day1889 = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });

function Clip({ clip, children }: { clip: ClipRef; children?: React.ReactNode }) {
  return (
    <li className="desk-clip">
      <p className="slug">
        <time dateTime={clip.date}>{day1889(clip.date)}</time> · {clip.paper}
      </p>
      {children}
      <ScanCrop iiifBase={clip.iiifBase} box={clip.box} pageId={clip.pageId} alt={clip.excerpt} citation={clip.citationMla} ringed={false} />
    </li>
  );
}

export default function DeskPage() {
  const agent = useAgent();
  const { mine, saved, markDeskRead } = agent;
  const [kind, setKind] = useState<"name" | "place">("name");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Visiting the desk reads its notes.
  useEffect(() => {
    if (mine) {
      markDeskRead();
      for (const n of mine.notes) markSeen(n.clippingId);
    }
  }, [mine, markDeskRead]);

  const follows = mine?.follows ?? [];
  const notes = mine?.notes ?? [];
  const empty = mine && !follows.length && !notes.length && !saved.length;

  return (
    <main className="column desk-page">
      <p className="dateline">
        <Link href="/">THEN &amp; THERE</Link>
        <span>
          <Link href="/explore">Explore</Link> · Your desk
        </span>
      </p>
      <h1>Your desk</h1>
      <p className="desk-lede">
        Your agent works overnight. Follow a name or a place, and each night it checks the pages the Library of Congress
        has newly added. When the Editor confirms a find against the scan, one note lands here. Your follows are matched in
        our own code and are never sent to an AI model.
      </p>

      {mine === undefined ? <p className="caption">Opening your desk…</p> : null}

      <section aria-labelledby="notes-h">
        <h2 id="notes-h">Notes from your agent</h2>
        {notes.length ? (
          <ol className="desk-list">
            {notes.map((n) => (
              <Clip key={n.clippingId} clip={n.clip}>
                <p className="desk-find">
                  {n.replay ? <span className="replay">Replay</span> : null}
                  Found “{n.matched}” · <span className="caption">{when(n.createdAt)}</span>
                </p>
              </Clip>
            ))}
          </ol>
        ) : (
          <p className="desk-empty">{empty ? "Nothing yet. Follow a name or a place below, or from any story in Explore." : "No notes yet. A note arrives only when the Editor confirms a find."}</p>
        )}
      </section>

      <section aria-labelledby="follows-h">
        <h2 id="follows-h">Following</h2>
        {follows.length ? (
          <ul className="follow-list">
            {follows.map((f) => (
              <li key={f.id}>
                <span>
                  {f.kind === "place" ? titleCase(f.value) : f.value} <span className="caption">{f.kind === "place" ? "place" : "name"}</span>
                </span>
                <button type="button" className="text-button is-quiet" onClick={() => agent.unfollow(f.id)}>
                  Remove<span className="visually-hidden"> {f.value}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="follow-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await agent.follow(kind, value);
              setValue("");
            } catch (err) {
              setError(err instanceof Error ? err.message.replace(/^.*Uncaught Error: /s, "").split("\n")[0] : "Couldn't follow that right now.");
            }
          }}
        >
          <label>
            <span className="visually-hidden">Follow a</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as "name" | "place")}>
              <option value="name">Name</option>
              <option value="place">Place</option>
            </select>
          </label>
          {kind === "name" ? (
            <label className="grow">
              <span className="visually-hidden">Name to follow</span>
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="A surname or full name" maxLength={60} />
            </label>
          ) : (
            <label className="grow">
              <span className="visually-hidden">Place to follow</span>
              <select value={value} onChange={(e) => setValue(e.target.value)}>
                <option value="">Choose a place</option>
                {PLACES.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
              </select>
            </label>
          )}
          <button type="submit" className="file-button" disabled={!value.trim()}>Follow</button>
        </form>
        {error ? <p className="caption" role="alert">{error}</p> : null}
      </section>

      <section aria-labelledby="saved-h">
        <h2 id="saved-h">Saved clippings</h2>
        {saved.length ? (
          <ol className="desk-list">
            {saved.map((c) => (
              <Clip key={c.clippingId} clip={c}>
                <button type="button" className="text-button is-quiet" onClick={() => agent.unsave(c.clippingId)}>
                  Remove from your desk
                </button>
              </Clip>
            ))}
          </ol>
        ) : (
          <p className="desk-empty">Save any story from <Link href="/explore">Explore</Link> to keep it here.</p>
        )}
      </section>

      <section aria-labelledby="log-h">
        <h2 id="log-h">The nightly log</h2>
        {mine?.activity.length ? (
          <ol className="log">
            {mine.activity.map((a, i) => (
              <li key={`${a.createdAt}-${i}`}>
                <time className="caption num">{when(a.createdAt)}</time> {a.line}
              </li>
            ))}
          </ol>
        ) : (
          <p className="desk-empty">The agent hasn't run since you arrived. Its first line appears after tonight's run.</p>
        )}
      </section>

      <section className="forget" aria-labelledby="forget-h">
        <h2 id="forget-h" className="visually-hidden">Forget everything</h2>
        {confirming ? (
          <p>
            This deletes your follows, notes and saved clippings, here and on our server.{" "}
            <button type="button" className="text-button" onClick={async () => { await agent.forgetEverything(); setConfirming(false); }}>
              Delete everything
            </button>{" "}
            <button type="button" className="text-button is-quiet" onClick={() => setConfirming(false)}>Keep it</button>
          </p>
        ) : (
          <button type="button" className="text-button is-quiet" onClick={() => setConfirming(true)}>Forget everything</button>
        )}
      </section>
    </main>
  );
}
