"use client";

// The agent's morning report, in the three parts both Today and My Agent show: what it found,
// what it's watching for, and what it did overnight. Every line comes from stored data; an empty
// part says so plainly rather than showing a sample.
import Link from "next/link";
import { useState } from "react";
import type { Note } from "../lib/agent/useAgent";
import { titleCase } from "../lib/game/format";
import { Cross } from "./Marks";
import { PageSketch } from "./PageSketch";
import { ScanCrop } from "./ScanCrop";

type Follow = { id: string; kind: "name" | "place"; value: string };
type Line = { line: string; replay: boolean; createdAt: number };

const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const shortDay = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const monthYear = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
const longDay = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
const pageNo = (pageId: string) => pageId.match(/[?&]sp=(\d+)/)?.[1];
const SIX_HOURS = 6 * 3600_000;

function Thumb({ note }: { note: Note }) {
  const [failed, setFailed] = useState(false);
  const { iiifBase, box } = note.clip;
  if (failed) return <PageSketch variant="clip" className="find-thumb" />;
  return (
    <img
      className="find-thumb"
      src={`${iiifBase}/${box.x},${box.y},${box.w},${box.h}/${Math.min(box.w, 240)},/0/default.jpg`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function FindCard({ note, onDismiss, href }: { note: Note; onDismiss: () => void; href?: string }) {
  const [open, setOpen] = useState(false);
  const { clip } = note;
  const p = pageNo(clip.pageId);
  return (
    <article className="find-card" id={`find-${note.clippingId}`}>
      <p className="slugline">
        {note.replay ? "Replay find" : "New find"} · <time className="num">{clock(note.createdAt)}</time>
      </p>
      <div className="find-body">
        <Thumb note={note} />
        <div>
          <h3>
            “{note.matched}” in {clip.paper}, {monthYear(clip.date)}
          </h3>
          <p>
            {note.replay
              ? "Found by replaying a batch the Library of Congress added earlier, to show the agent at work. The Editor checked it against the page."
              : "Found in a batch the Library of Congress added recently. The Editor checked it against the page."}
          </p>
          <p className="find-cite num">
            {clip.paper} · {longDay(clip.date)}
            {p ? ` · p. ${p}` : ""}
          </p>
        </div>
      </div>
      <div className="find-actions">
        {href ? (
          <Link className="file-button" href={href}>Open clipping</Link>
        ) : (
          <button type="button" className="file-button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Close clipping" : "Open clipping"}
          </button>
        )}
        <button type="button" className="file-button is-outline" onClick={onDismiss}>
          Not my family
        </button>
      </div>
      {open ? (
        <div className="find-scan">
          <ScanCrop iiifBase={clip.iiifBase} box={clip.box} pageId={clip.pageId} alt={clip.excerpt} citation={clip.citationMla} />
        </div>
      ) : null}
    </article>
  );
}

export function WatchList({ follows, onRemove, addHref }: { follows: Follow[]; onRemove?: (id: string) => void; addHref?: string }) {
  return (
    <ul className="watch-list">
      {follows.map((f) => (
        <li key={f.id} className="watch-chip">
          <span>{f.kind === "place" ? titleCase(f.value) : f.value}</span>
          {onRemove ? (
            <button type="button" onClick={() => onRemove(f.id)} aria-label={`Stop watching ${f.value}`}>
              <Cross />
            </button>
          ) : null}
        </li>
      ))}
      {addHref ? (
        <li>
          <Link className="watch-chip is-add" href={addHref}>+ Add</Link>
        </li>
      ) : null}
    </ul>
  );
}

// The latest run's lines, timed like a night desk's log. Older runs are dated, never passed off as last night.
export function NightLog({ activity, now }: { activity: Line[]; now: number }) {
  if (!activity.length) return <p className="agent-empty">The agent hasn&apos;t run since you arrived. Its first line appears after tonight&apos;s run, at about 2 a.m. Central.</p>;
  const latest = activity[0].createdAt;
  const run = activity.filter((a) => latest - a.createdAt < SIX_HOURS);
  const recent = now - latest < 36 * 3600_000;
  return (
    <>
      <p className="agent-label">
        <span>{recent ? "Last night's work" : `Latest run · ${shortDay(latest)}`}</span>
      </p>
      <ol className="night-log">
        {run.map((a, i) => (
          <li key={`${a.createdAt}-${i}`}>
            <time className="num">{clock(a.createdAt)}</time>
            <span>{a.line}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
