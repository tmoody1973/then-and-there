"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { HARD_HISTORY_NOTE } from "../../../../components/ExploreCard";
import { ScanCrop } from "../../../../components/ScanCrop";
import type { PackItem } from "../../../../lib/explore/packs";
import "../../../play/play.css";
import "./pack.css";

type Pack = { slug: string; title: string; theme: string; items: PackItem[]; hardItems: PackItem[]; questions: string[] };
const day = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });

// A printable teacher pack: verified clippings with scans and citations, then the questions.
export default function PackPage() {
  const slug = useParams<{ slug: string }>().slug;
  const pack = useQuery(api.packs.bySlug, { slug }) as Pack | null | undefined;
  const [withHard, setWithHard] = useState(false);
  if (pack === undefined) return <main className="column pack"><p className="caption">Assembling the pack…</p></main>;
  if (pack === null) return <main className="column pack"><h1>No such pack.</h1><p><Link href="/explore">Back to Explore</Link></p></main>;
  const items = withHard ? [...pack.items, ...pack.hardItems] : pack.items;
  const hard = new Set(pack.hardItems.map((i) => i.clippingId));
  return (
    <main className="column pack">
      <p className="dateline no-print">
        <Link href="/explore">← Search the archive</Link>
        <span>Teacher pack</span>
      </p>
      <h1>{pack.title}</h1>
      <p className="pack-theme">{pack.theme}. Every clipping below was checked by an independent Editor model against its scan.</p>
      <div className="pack-tools no-print">
        <button type="button" className="file-button" onClick={() => window.print()}>Print this pack</button>
        {pack.hardItems.length ? (
          <label className="filter-check">
            <input type="checkbox" checked={withHard} onChange={(e) => setWithHard(e.target.checked)} />
            <span>Include {pack.hardItems.length} clipping{pack.hardItems.length === 1 ? "" : "s"} with hard history (shown with a content note)</span>
          </label>
        ) : null}
      </div>
      <ol className="pack-items">
        {items.map((it, n) => (
          <li key={it.clippingId}>
            <h2>
              {n + 1}. {it.paper}, {day(it.date)}
            </h2>
            {hard.has(it.clippingId) ? <p className="content-note">{HARD_HISTORY_NOTE}</p> : null}
            <ScanCrop iiifBase={it.iiifBase} box={it.box} pageId={it.pageId} alt={it.excerpt} citation={it.citationMla} ringed={false} />
            <blockquote className="transcript">{it.excerpt}{it.excerpt.length >= 700 ? "…" : ""}</blockquote>
          </li>
        ))}
      </ol>
      <section className="pack-questions" aria-labelledby="q-h">
        <h2 id="q-h">Questions for discussion</h2>
        <ol>{pack.questions.map((q) => <li key={q}>{q}</li>)}</ol>
        <p className="caption">Written by Muse Spark from these clippings; each question passed the Editor&apos;s check that the clippings alone support it.</p>
      </section>
    </main>
  );
}
