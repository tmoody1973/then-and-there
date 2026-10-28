# Learning Log

Dated entries. Each answers: what did we expect, what happened, what do we now believe.

---

## 2026-10-28 — Are old newspaper stories "invisible" because the OCR is broken?

**What we expected.** That the main reason nobody finds stories in Chronicling America is bad OCR (the computer-generated text behind each scanned page). If a name is garbled in that text, a search can't find it, so the product's big moment would be "repairing" pages and recovering stories search could never reach.

**What happened.** We pulled one full issue of *The Wisconsin Weekly Advocate*, Milwaukee's Black weekly, from Dec 9, 1898 (8 pages), and compared the OCR text against the actual scans.

- The OCR on these pages was mostly right. About 9–13% of words weren't in a dictionary, and many of those were just names. A Louisiana page from 1889 was far worse: 24%.
- The OCR's own "confidence" scores were misleading. They rated the Advocate as worse than the Louisiana page, but checking the words directly showed the opposite. Scores from different batches can't be compared with each other.
- On page 4 we found a real story: the editor visiting Mr. and Mrs. J. E. Ellmore at 861 College Avenue in Appleton. Ellmore had "a beautiful shaving parlor in the Commercial bank building" and was called "the smartest gentleman of our race, and we are proud of him." The OCR read it almost perfectly, and the Library's own search finds it, but only if you already know to type "Ellmore."

**What we now believe.** The barrier is mostly **discovery**, not repair. The stories are readable but unread; nobody knows the names to search for. Fixing OCR still matters on the worst pages, but the more valuable job is the editor's job: going through millions of pages, pulling out the human stories, and putting them in front of people. That changes the product's centerpiece from "we fix the text" to "we find the stories."

**Caveat.** One issue of one paper, plus one comparison page. Garble rates vary a lot from batch to batch, so this needs checking on more titles before it goes in a pitch as a number.

**In my words:**

---

## 2026-10-28 — Passing the fact-checker is not the same as being good

**What we expected.** That the Case Writer (Muse Spark) would draft a game day, the Editor (a second, independent model check) would catch any invented facts, and whatever passed would be ready to play.

**What happened.** The first draft run rejected all 5 days. Some rejections were real: the Case Writer added facts the clippings never printed ("Mojave," "the Central Pacific," Chicago train times). Others were our fault: we asked the Editor the wrong questions. We bundled the question's context into the "is the answer supported?" check, included dates the clippings don't print, made it judge OCR spelling instead of meaning, and asked "is this hint supported?" when the real question is "does this hint give the answer away?" It took four rounds of fixing *the checks* (not loosening them) before 4 of 5 days passed. One day (Day 70) stayed rejected, correctly: its clue literally says the route was "still undecided," so there was nothing to reason from. We dropped it.

Then a human read of the days that passed found problems no checker caught. Options copied raw OCR typos ("Trindad," "ten houre"), the correct option gave itself away by being longer, hints were useless trivia, and one day repeated a misprint ("twenty-five days" for a 75-day trip). A bug also stored Bly's finale time as 223 days, because the code summed every duration in the whole column. Writing rules and one human review fixed all of it.

**What we now believe.** An automated Editor is necessary but not sufficient. It reliably catches invented facts, which is its job, and only if each check asks one precise question. Quality of play (clear, fair, fun) still needs a human read. The workflow that works: the model drafts, the Editor gates facts, a human reviews feel, and any curator note goes back to the model as guidance rather than hand-edits. Editor checks this run: see `bunx convex run editorRuns:stats` for the rejection rate the submission will report.

**In my words:**
