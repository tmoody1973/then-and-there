# 007 — How pages get cut into stories: Muse Spark finds the layout, SAM traces it

**Decision.** Muse Spark looks at each page and boxes the ads, pictures, headlines and article columns. Columns are then split into individual stories at their headlines. SAM 3.1 traces each box precisely (using the boxes as prompts, 16 per request), adds a confidence score, and separately finds illustrations by name.

**Why this came up.** The product is built on individual stories ("clippings"), so cutting pages up correctly is the foundation. The original plan assumed SAM alone could find "advertisement," "headline" and "article" from those words. That was untested. If it failed, every feature downstream would be built on the wrong pieces.

**What we tested** (2026-10-28, 5 pages: The Evening World 1889-11-29, Homer Guardian 1889-11-29, Wisconsin Weekly Advocate 1898-12-09 p4, Der Sonntagsbote 1909-07-11, Kenosha Telegraph-Courier 1889-12-05; about 37 model calls):

| Approach | What happened |
|---|---|
| SAM, described in words ("advertisement", "headline", "article", "photograph") | Found essentially nothing: 0 boxes for most words; "article" returned 1 box per page (the whole page) |
| SAM, concrete words ("illustration", "portrait", "column of text", "ornamental border", "printed text block") | Only "illustration" worked (2 per page). Text-like words found nothing |
| Muse Spark, asked for boxes of articles, ads, headlines, photographs | Ads, pictures and mastheads boxed well on all 5 pages (graded by eye, not counted box by box). **Articles come back as whole columns** on dense pages, not as separate stories. Small in-column headlines are often missed |
| Spark's boxes handed to SAM as box prompts | SAM traced all 16 of 16 boxes, confidence 0.49–0.91 (most about 0.8), outlines on the same objects, sometimes tighter |

Meta's own SAM docs say the same thing: concept prompts work for "concrete nouns," and objects "another model found" should be sent as boxes.

**Options.**
1. **SAM only.** Fails on newspaper layout (above).
2. **Muse Spark only.** Gets layout; no precise outlines or confidence; one model doing everything.
3. **Spark for layout, split columns at headlines, SAM to trace each piece and find illustrations.** Each model does what it's good at. About 3 extra SAM calls per page ($2.50 per 1,000 images, so a fraction of a cent).

**What we chose and why.** Option 3. Claude ran the test; the call follows the rule set in the plan before the test (SAM had to catch ≥70% of visible ads and headlines to go alone; it caught about none). Also stronger for the judging's "Use of Meta AI Tooling" score (25%): two Meta models chained, not one used once.

**What we gave up.** Simplicity: one more step (splitting columns into stories), and it's unproven. Splitting at headlines will miss stories whose headline Spark didn't box. Fallback if that's poor: a second Spark pass on each column crop asking for story boundaries (about 6–8 more calls per page).

**Other finding.** The Library's image server returns 403 to Meta's image fetcher and to Python's default downloader, but serves curl and Bun. So: (a) the worker downloads images and sends them to Meta inline (base64), and (b) every Library request should send a clear User-Agent.

**Bonus find.** The Homer Guardian of Nov 29, 1889 has a column headlined "Two Girls to Go Around the World in Less Than Eighty Days," about Nellie Bly and Elizabeth Bisland. It's a game clipping and the first page evidence for the rival story.

**How we'll know if this was right.** In Task 10's real run, at least 80% of stored text clippings are a single story (spot check 20), and the Ellmore paragraph and the Evening World contest paragraph each land in their own clipping.

**What actually happened.**
