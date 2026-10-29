"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import { frontPageNo, LAUNCH } from "../lib/frontpage/rules";
import { FindCard, NightLog, WatchList } from "../components/AgentDigest";
import { PageSketch } from "../components/PageSketch";
import { useAgent } from "../lib/agent/useAgent";
import "./home.css";

const WAYS = [
  { href: "/play", slug: "Detective · Case 01", phoneSlug: "Detective", title: "Nellie Bly's race around the world", phoneTitle: "Nellie Bly's race", blurb: "Follow her 1889–90 trail stop by stop, using only what the papers printed.", phoneBlurb: "Case 01 · 1889–90" },
  { href: "/one-day", slug: "One day, many papers", phoneSlug: "One day, many papers", title: "August 26, 1920", phoneTitle: "August 26, 1920", blurb: "The 19th Amendment is certified. See how papers across the country told it.", phoneBlurb: "Suffrage, coast to coast" },
  { href: "/quests", slug: "Quest · 4 chapters", phoneSlug: "Quest", title: "The Great Migration through the Black press", phoneTitle: "The Great Migration", blurb: "A guided journey through primary sources, one question at a time.", phoneBlurb: "Through the Black press" },
  { href: "/forgery", slug: "Spot the forgery", phoneSlug: "Spot the forgery", title: "One thing on this page was never printed", phoneTitle: "One page is lying", blurb: "Find the anachronism planted on a real page from 1889–90.", phoneBlurb: "Round 1 · an 1889–90 page" },
];

const monthYear = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });

export default function Today() {
  const agent = useAgent();
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);
  // Today's number in the rotation, the same one /front-page opens (read after mount: it depends on the clock).
  const count = useQuery(api.frontPages.count, {});
  const frontNo = now && count ? frontPageNo(new Date(now), LAUNCH, count) : null;
  const note = agent.mine?.notes[0];
  const follows = agent.mine?.follows ?? [];

  return (
    <main className="today">
      <div className="today-main">
        <section className="front-hero" aria-labelledby="fp-h">
          <PageSketch className="front-hero-sketch" />
          <div className="front-hero-copy">
            <p className="slugline">Today&apos;s front page{frontNo ? ` · No. ${frontNo}` : ""}</p>
            <h1 id="fp-h">Where and when was this printed?</h1>
            <p className="front-hero-lede only-laptop">
              Everyone in the country gets the same real page today. Reveal it one piece at a time, from ads and news items
              to a picture, with the masthead last. The fewer clues you need, the higher you score.
            </p>
            <p className="front-hero-lede only-phone">Same real page for everyone. Six clues, one at a time.</p>
            <p className="front-hero-meta only-laptop">
              <span>6 clues</span>
              <span>1 guess</span>
              <span>New page at midnight</span>
            </p>
            <Link className="file-button front-hero-go" href="/front-page">Play today&apos;s page</Link>
          </div>
        </section>

        <section className="agent-flash only-phone" aria-labelledby="flash-h">
          {note ? (
            <>
              <p className="slugline" id="flash-h">Your agent found something</p>
              <p className="agent-flash-text">
                A name you&apos;re watching, {note.matched}, appears in {note.clip.paper} from {monthYear(note.clip.date)}.
                {note.replay ? " (A replay, to show the agent at work.)" : ""}
              </p>
              <Link href={`/desk#find-${note.clippingId}`}>See the clipping →</Link>
            </>
          ) : (
            <>
              <p className="slugline" id="flash-h">Your agent</p>
              <p className="agent-flash-text">Give it a family name or a town. Each night it checks the pages the Library of Congress just added.</p>
              <Link href="/desk#add">Set it up →</Link>
            </>
          )}
        </section>

        <section className="ways" aria-labelledby="ways-h">
          <h2 id="ways-h" className="rule-head">
            <span className="only-laptop">Ways to play and learn</span>
            <span className="only-phone">Ways to play</span>
          </h2>
          <ul className="ways-grid">
            {WAYS.map((w) => (
              <li key={w.href}>
                <Link className="way" href={w.href}>
                  <span className="slugline">
                    <span className="only-laptop">{w.slug}</span>
                    <span className="only-phone">{w.phoneSlug}</span>
                  </span>
                  <span className="way-title">
                    <span className="only-laptop">{w.title}</span>
                    <span className="only-phone">{w.phoneTitle}</span>
                  </span>
                  <span className="way-blurb">
                    <span className="only-laptop">{w.blurb}</span>
                    <span className="only-phone">{w.phoneBlurb}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="today-agent only-laptop" aria-labelledby="agent-h">
        <p className="slugline">My Agent</p>
        <h2 id="agent-h">Digging while you&apos;re away</h2>
        <p className="agent-sub">Quiet by default. It only writes when it finds something real.</p>
        {agent.mine === undefined ? (
          <p className="agent-empty">Opening your agent…</p>
        ) : note ? (
          <FindCard note={note} href={`/desk#find-${note.clippingId}`} onDismiss={() => agent.dismiss(note.clippingId)} />
        ) : (
          <p className="agent-empty">Nothing found yet. A note appears here only when the Editor confirms a find against the scan.</p>
        )}
        <p className="agent-label"><span>Watching for you</span></p>
        <WatchList follows={follows} addHref="/desk#add" />
        <NightLog activity={agent.mine?.activity ?? []} now={now} />
        <p className="agent-more">
          <Link href="/desk">Read and edit what it remembers →</Link>
        </p>
      </aside>
    </main>
  );
}
