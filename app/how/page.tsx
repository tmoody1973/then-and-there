"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { iiifCropUrl } from "../../components/iiif";
import "./how.css";

// A recorded run of the pipeline on one real page. Every number here is read from the database.
const PAGE_ID = "http://www.loc.gov/resource/sn83030193/1889-11-29/ed-2/?sp=1";

type Box = { x: number; y: number; w: number; h: number };
type Clip = { _id: string; box: Box; segLabel: string; segSource: string; rawText: string; cleanedText?: string; type?: string; humanStoryScore?: number; status: string };
type Page = { iiifBase: string; imageWidth: number; imageHeight: number; title: string; date: string };

const STEPS: Array<[string, string]> = [
  ["Fetch", "A worker downloads the page scan and its machine-read text (OCR) from the Library of Congress, politely, once."],
  ["Find the layout · Muse Spark", "Muse Spark looks at the whole page and boxes every story, ad, headline and picture."],
  ["Trace each piece · SAM 3.1", "Meta's Segment Anything Model takes those boxes and traces each piece precisely, with a confidence score."],
  ["Repair the text · Muse Spark", "Only where the OCR is badly garbled, Muse Spark reads the clipping image and transcribes what's printed."],
  ["Tag the stories", "Each clipping is labeled: person, event, business, ad. Each gets a score for how much of a human story it holds."],
  ["Check every claim · the Editor", "Before anything reaches a player, an independent model check compares each clue and explanation to the scan. Anything it can't confirm is rejected."],
];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export default function HowItWorks() {
  const page = useQuery(api.pages.byPageId, { pageId: PAGE_ID }) as Page | null | undefined;
  const clips = useQuery(api.clippings.byPage, { pageId: PAGE_ID }) as Clip[] | undefined;
  const stats = useQuery(api.editorRuns.stats, {}) as { total: number; passed: number; failed: number } | undefined;
  const banner = clips?.find((c) => /IllyM/.test(c.rawText));
  const repaired = clips?.filter((c) => c.cleanedText).length ?? 0;
  // Quote the stored text exactly, never retyped: a window around the bad and the repaired words.
  const around = (text: string, word: string, before = 28, after = 22) => {
    const i = text.indexOf(word);
    return i < 0 ? null : { pre: text.slice(Math.max(0, i - before), i), word, post: text.slice(i + word.length, i + word.length + after) };
  };
  const bad = banner ? around(banner.rawText.replace(/\s+/g, " "), "IllyM") : null;
  const good = banner?.cleanedText ? around(banner.cleanedText.replace(/\s+/g, " "), "Bly's") : null;

  return (
    <main className="column how">
      <p className="dateline">
        <Link href="/">THEN &amp; THERE</Link>
        <span>How it works</span>
      </p>
      <h1>How a page from 1889 becomes a clue.</h1>
      <p>
        A recorded run of the pipeline on one real page: The Evening World, New York, November 29, 1889, the day it
        announced the contest to guess Nellie Bly&apos;s time.
      </p>

      {page && clips ? (
        <figure className="how-page">
          <div className="how-scan" style={{ aspectRatio: `${page.imageWidth} / ${page.imageHeight}` }}>
            <img src={`${page.iiifBase}/full/1200,/0/default.jpg`} alt="The Evening World front page, November 29, 1889, with every clipping the pipeline found outlined." />
            {clips.map((c) => (
              <span
                key={c._id}
                className={`how-box is-${c.segSource} is-${c.segLabel}`}
                style={{ left: pct(c.box.x, page.imageWidth), top: pct(c.box.y, page.imageHeight), width: pct(c.box.w, page.imageWidth), height: pct(c.box.h, page.imageHeight) }}
                title={`${c.segLabel} · traced by ${c.segSource === "sam" ? "SAM 3.1" : "Muse Spark"}`}
              />
            ))}
          </div>
          <figcaption className="caption">
            <span className="how-key is-sam" /> traced by SAM 3.1 <span className="how-key is-spark" /> boxed by Muse Spark ·{" "}
            <span className="num">{clips.length}</span> clippings found, <span className="num">{repaired}</span> repaired
          </figcaption>
        </figure>
      ) : (
        <p className="caption">Loading the recorded run…</p>
      )}

      <ol className="how-steps">
        {STEPS.map(([title, body]) => (
          <li key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </li>
        ))}
      </ol>

      {banner && page && bad && good ? (
        <section aria-labelledby="repair-h">
          <h2 id="repair-h">One repair, up close</h2>
          <img className="how-crop" src={iiifCropUrl(page.iiifBase, banner.box, 1200)} alt="The contest banner as printed." />
          <div className="how-compare">
            <div>
              <p className="label-line">The archive&apos;s OCR</p>
              <p className="ocr">…{bad.pre}<mark className="is-bad">{bad.word}</mark>{bad.post}…</p>
            </div>
            <div>
              <p className="label-line">After Muse Spark read the image</p>
              <p className="ocr">…{good.pre}<mark className="is-good">{good.word}</mark>{good.post}…</p>
            </div>
          </div>
        </section>
      ) : null}

      {stats ? (
        <p className="how-stats">
          The Editor has run <span className="num">{stats.total}</span> checks so far and rejected{" "}
          <span className="num">{stats.failed}</span> (<span className="num">{Math.round((stats.failed / Math.max(1, stats.total)) * 100)}%</span>).
          Nothing it rejects reaches a player.
        </p>
      ) : null}

      <p>
        <Link href="/play">Race Nellie Bly</Link>
      </p>
    </main>
  );
}
