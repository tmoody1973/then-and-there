"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { DeskLink } from "../../components/DeskLink";
import { type Card, clipRefOf, ExploreCard, longDay, marked, paperName } from "../../components/ExploreCard";
import { Caret, Check } from "../../components/Marks";
import { markSeen, useAgent } from "../../lib/agent/useAgent";
import { titleCase } from "../../lib/game/format";
import "../play/play.css";
import "./explore.css";

type Shelf = { slug: string; title: string; blurb: string; cards: Card[] };
type Stats = { pages: number; states: string[]; languages: string[] };
type Filters = { state: string; language: string; from: string; to: string; blackPress: boolean; frontOnly: boolean; peopleOnly: boolean; verifiedOnly: boolean };
const NO_FILTERS: Filters = { state: "", language: "", from: "", to: "", blackPress: false, frontOnly: false, peopleOnly: false, verifiedOnly: false };
const LEDE = 150;

function searchArgs(q: string, f: Filters) {
  return {
    q,
    ...(f.state ? { state: f.state } : {}),
    ...(f.language ? { language: f.language } : {}),
    ...(/^\d{4}$/.test(f.from) ? { from: `${f.from}-01-01` } : {}),
    ...(/^\d{4}$/.test(f.to) ? { to: `${f.to}-12-31` } : {}),
    ...(f.blackPress ? { community: "black-press" as const } : {}),
    ...(f.frontOnly ? { frontOnly: true } : {}),
    ...(f.peopleOnly ? { peopleOnly: true } : {}),
    ...(f.verifiedOnly ? { verifiedOnly: true } : {}),
  };
}

function WireRow({ card, q, pulled, onPull }: { card: Card; q: string; pulled: boolean; onPull: () => void }) {
  return (
    <li>
      <button type="button" className="wire-row" aria-current={pulled ? "true" : undefined} onClick={onPull}>
        <span className="wire-mark" aria-hidden>{pulled ? <Caret /> : null}</span>
        <span className="slug">
          <time dateTime={card.date}>{longDay(card.date)}</time> · {paperName(card.paper, card.citeThis.mla)} · {titleCase(card.city)}
          {card.editorStatus === "pass" ? (
            <span className="wire-verified">
              <Check /> <span className="visually-hidden">Editor-verified</span>
            </span>
          ) : null}
        </span>
        <span className="wire-lede">{marked(card.text.replace(/\s+/g, " ").slice(0, LEDE), q)}…</span>
      </button>
    </li>
  );
}

export default function ExplorePage() {
  const agent = useAgent();
  const stats = useQuery(api.explore.stats, {}) as Stats | undefined;
  const shelves = useQuery(api.explore.shelves, {}) as Shelf[] | undefined;
  const packs = useQuery(api.packs.list, {}) as Array<{ slug: string; title: string; count: number }> | undefined;
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [pulled, setPulled] = useState<string | null>(null);
  const proofRef = useRef<HTMLElement>(null);
  const results = useQuery(api.explore.search, q ? searchArgs(q, filters) : "skip") as Card[] | undefined;

  // A search lives in the address bar, so it can be shared.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("q") ?? "";
    setInput(fromUrl);
    setQ(fromUrl.trim());
  }, []);
  useEffect(() => {
    const url = q ? `?q=${encodeURIComponent(q)}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [q]);

  const cards = q ? (results ?? []) : (shelves ?? []).flatMap((s) => s.cards);
  const shown = cards.find((c) => c.clippingId === pulled) ?? cards[0];
  const pull = (c: Card) => {
    setPulled(c.clippingId);
    markSeen(c.clippingId);
    // On a phone the proof replaces the list; bring its top into view.
    requestAnimationFrame(() => proofRef.current?.scrollIntoView({ block: "start" }));
  };
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const activeFilters = Object.entries(filters).filter(([, v]) => v !== "" && v !== false).length;
  const follows = agent.mine?.follows ?? [];

  return (
    <main className="wire-page">
      <header className="wire-head">
        <p className="dateline">
          <Link href="/">← Today</Link>
          <span>
            Explore · <DeskLink />
          </span>
        </p>
        <h1>Find the stories nobody knew to search for.</h1>
        <form
          role="search"
          className="wire-search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(input.trim().slice(0, 200));
            setPulled(null);
          }}
        >
          <label htmlFor="q" className="visually-hidden">Search the processed pages</label>
          <input id="q" type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="A surname, a town, a street" autoComplete="off" />
          <button type="submit" className="file-button">Search</button>
        </form>
        <p className="caption">
          {stats ? (
            <>Searching <span className="num">{stats.pages.toLocaleString("en-US")}</span> processed pages from <span className="num">{stats.states.length}</span> states, all printed before 1931.</>
          ) : (
            "Counting the processed pages…"
          )}
        </p>
        <details className="filters">
          <summary>Filters{activeFilters ? <span className="num"> ({activeFilters} on)</span> : null}</summary>
          <div className="filter-grid">
            <label>
              <span>State</span>
              <select value={filters.state} onChange={(e) => set("state", e.target.value)}>
                <option value="">Any state</option>
                {stats?.states.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
              </select>
            </label>
            <label>
              <span>Language</span>
              <select value={filters.language} onChange={(e) => set("language", e.target.value)}>
                <option value="">Any language</option>
                {stats?.languages.map((l) => <option key={l} value={l}>{titleCase(l)}</option>)}
              </select>
            </label>
            <label>
              <span>From year</span>
              <input inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="1887" value={filters.from} onChange={(e) => set("from", e.target.value.replace(/\D/g, ""))} />
            </label>
            <label>
              <span>To year</span>
              <input inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="1930" value={filters.to} onChange={(e) => set("to", e.target.value.replace(/\D/g, ""))} />
            </label>
            {([["blackPress", "Black press"], ["frontOnly", "Front pages"], ["peopleOnly", "People only"], ["verifiedOnly", "Editor-verified only"]] as const).map(([k, label]) => (
              <label key={k} className="filter-check">
                <input type="checkbox" checked={filters[k]} onChange={(e) => set(k, e.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {!q && activeFilters ? <p className="caption">Filters apply when you search.</p> : null}
        </details>
      </header>

      <div className="wire" data-pulled={pulled ? "" : undefined}>
        <section className="wire-list" aria-label={q ? "Search results" : "Story shelves"}>
          {q ? (
            results === undefined ? (
              <p className="caption">Searching the wire…</p>
            ) : results.length ? (
              <>
                <p className="wire-count">
                  <span className="num">{results.length}</span> {results.length === 1 ? "story" : "stories"} for “{q}”
                  {results.length === 30 ? <span className="caption"> (the first 30; narrow with filters)</span> : null}
                </p>
                <ol className="wire-rows">
                  {results.map((c) => <WireRow key={c.clippingId} card={c} q={q} pulled={c.clippingId === shown?.clippingId} onPull={() => pull(c)} />)}
                </ol>
              </>
            ) : (
              <p className="wire-empty">No stories match “{q}”. Try another spelling of the name, the town, or fewer filters. The archive's own OCR misreads names, so a near spelling can find what an exact one misses.</p>
            )
          ) : shelves === undefined ? (
            <p className="caption">Laying out the shelves…</p>
          ) : (
            shelves.map((s) => (
              <section key={s.slug} className="shelf" aria-labelledby={`shelf-${s.slug}`}>
                <h2 id={`shelf-${s.slug}`}>{s.title}</h2>
                <p className="shelf-blurb">{s.blurb}</p>
                <ol className="wire-rows">
                  {s.cards.map((c) => <WireRow key={c.clippingId} card={c} q="" pulled={c.clippingId === shown?.clippingId} onPull={() => pull(c)} />)}
                </ol>
              </section>
            ))
          )}
          {!q && packs?.length ? (
            <section className="shelf packs-shelf" aria-labelledby="packs-h">
              <h2 id="packs-h">Teacher packs</h2>
              <p className="shelf-blurb">Printable sets of verified clippings with discussion questions.</p>
              <ul className="pack-links">
                {packs.map((p) => (
                  <li key={p.slug}><Link href={`/explore/pack/${p.slug}`}>{p.title}</Link> <span className="caption">({p.count} clippings)</span></li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>

        <section className="wire-proof" ref={proofRef} aria-label="The pulled story">
          {pulled ? (
            <button type="button" className="text-button wire-back" onClick={() => setPulled(null)}>
              Back to the list
            </button>
          ) : null}
          {shown ? (
            <div className="proof-slide" key={shown.clippingId}>
              <ExploreCard
                card={shown}
                q={q}
                follows={follows}
                onFollow={agent.follow}
                saved={agent.saved.some((s) => s.clippingId === shown.clippingId)}
                onSave={() => agent.save(clipRefOf(shown))}
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
