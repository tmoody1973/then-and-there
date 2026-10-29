"use client";

// A quest: one real source at a time, an open question from the guide, the reader's own answer,
// then what the guide noticed. Answers stay in this browser; nothing is sent anywhere.
import Link from "next/link";
import { useEffect, useState } from "react";
import { HARD_HISTORY_NOTE } from "../ExploreCard";
import { ScanCrop } from "../ScanCrop";
import { type Answers, ANSWER_MAX, CHAPTERS, chapterStates, position, recordAnswer } from "../../lib/quests/quest";

type Box = { x: number; y: number; w: number; h: number };
export type QuestSource = {
  chapter: number;
  key: string;
  clip: { pageId: string; iiifBase: string; box: Box; focus?: Box; paper: string; date: string; citationMla: string; excerpt: string; city: string; state: string };
  caption: string;
  question: string;
  notice: string;
  hardHistory: boolean;
};

const KEY = "tt.quest.migration.v1";
const pageNo = (pageId: string) => pageId.match(/[?&]sp=(\d+)/)?.[1] ?? "1";
const when = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function QuestView({ sources }: { sources: QuestSource[] }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [draft, setDraft] = useState("");
  const [viewing, setViewing] = useState<number | null>(null);
  useEffect(() => {
    try {
      setAnswers(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Answers);
    } catch {
      // unreadable: start fresh
    }
  }, []);
  const save = (next: Answers) => {
    setAnswers(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // private mode: keep going
    }
  };

  const pos = position(sources, answers);
  const states = chapterStates(sources, answers);
  // After answering, the reader stays on that source to read the guide's note until they move on.
  const index = viewing ?? pos.index;
  const s = sources[index];
  const answered = answers[s.key];
  const chapter = CHAPTERS.find((c) => c.n === s.chapter)!;
  const inChapter = sources.filter((x) => x.chapter === s.chapter);
  const done = CHAPTERS.filter((_, i) => states[i] === "done").map((c) => c.title);

  return (
    <main className="qs">
      <p className="dateline only-phone">
        <Link href="/">← Today</Link>
        <span>Quest</span>
        <span className="qs-ch num">Ch. {s.chapter} of {CHAPTERS.length}</span>
      </p>
      <header className="qs-head">
        <p className="slugline">Quest · Chapter {s.chapter} of {CHAPTERS.length}</p>
        <h1>The Great Migration through the Black press</h1>
        <ol className="qs-bar" aria-label="Chapters">
          {CHAPTERS.map((c, i) => (
            <li key={c.n} className={`is-${states[i]}`} title={c.title}>
              <span className="visually-hidden">{c.title}: {states[i]}</span>
            </li>
          ))}
        </ol>
        <p className="qs-where">
          {done.length ? `Done: ${done.join(", ")} · ` : ""}Now: {chapter.title}
        </p>
      </header>

      <div className="qs-grid">
        <article className="qs-card" aria-label={`Source ${inChapter.indexOf(s) + 1} of ${inChapter.length}`}>
          <p className="qs-slug">
            <span>Source {inChapter.indexOf(s) + 1} of {inChapter.length}</span>
            <span className="qs-zoom">real page</span>
          </p>
          {s.hardHistory ? <p className="content-note">{HARD_HISTORY_NOTE}</p> : null}
          <ScanCrop
            iiifBase={s.clip.iiifBase}
            box={s.clip.box}
            focus={s.clip.focus}
            pageId={s.clip.pageId}
            alt={s.clip.excerpt}
            citation={`From ${s.clip.paper} · ${titleCase(s.clip.city)} · ${when(s.clip.date)} · p. ${pageNo(s.clip.pageId)}.`}
            ringed={false}
          />
          <p className="qs-caption">{s.caption}</p>
        </article>

        <section className="qs-guide" aria-labelledby="qs-ask">
          <p className="agent-label" id="qs-ask">The guide asks</p>
          <p className="qs-question">{s.question}</p>
          {answered ? (
            <>
              <p className="agent-label">Your answer</p>
              <p className="qs-yours">{answered}</p>
              <p className="agent-label">What the guide noticed</p>
              <p className="qs-notice">{s.notice}</p>
              {pos.done ? (
                <p className="qs-end">
                  You finished the quest. <button type="button" className="text-button" onClick={() => { save({}); setViewing(null); }}>Start again</button>
                </p>
              ) : (
                <button type="button" className="file-button" onClick={() => { setViewing(null); setDraft(""); }}>
                  Next source →
                </button>
              )}
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const next = recordAnswer(answers, s.key, draft);
                if (next === answers) return;
                save(next);
                setViewing(index);
              }}
            >
              <label className="agent-label" htmlFor="qs-answer">Your answer</label>
              <textarea id="qs-answer" rows={4} maxLength={ANSWER_MAX} placeholder="Write a sentence or two…" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button type="submit" className="file-button qs-send" disabled={!draft.trim()}>
                Send answer
              </button>
              <p className="qs-private">Your answers stay in this browser.</p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
