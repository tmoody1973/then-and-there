---
version: 1
slug: "app-explore"
primary_target: "app/explore"
related_targets: ["app/desk","app/page.tsx"]
---

# Surface brief: Explore ("Story Finder") and Your Desk

Scope: /explore (Operate), /desk (Read), and the home page's two doors (Play, Explore). Inherits the Copy Desk world (app-play brief, docs/design/play.md); no new tokens.
Audience and job: teachers, students, history buffs and family researchers, and judges before launch. Find a verified clipping, read it on the scan, cite it, follow a name or place. Desk: see what the nightly agent did and what it found.
Tarik's calls: Explore opens on story shelves before any search (the thesis: nobody knows what to type); the Desk is its own page linked from the masthead with an unread count.
Constraints: every card shows its scan with transcription beside it; labels say "Machine-repaired text" / "Archive OCR text" and "Verified" / "Machine-sorted"; hard-history items carry the fixed calm note; works when tile.loc.gov is down; phone 375 and laptop 1440; WCAG 2.2 AA.
Memorable moment: pulling a story off the wire list onto the desk, and the blue pencil rings it.

## Direction contract

THESIS: Explore is the wire editor's desk: copy comes in as a tight, scannable list, and the one story you pull lands on the desk as a full proof you can read, cite and follow. Refuses the category default of a search engine results page and of a grid of image cards.

OWN-WORLD: Copy Desk unchanged: cool newsprint ground, ink black, gray column rules, Libre Franklin heads, Source Serif 4 reading text, one blue pencil for meaningful marks only (the pulled row's caret, Verified marks, focus). List rows are wire slugs: date, paper, place in small Franklin caps over a one-line serif lede, separated by hairline rules. Shelves are wire budget headings: a rule, a slug and a count.

STORY: A visitor arrives knowing no names, sees shelves of verified human stories, pulls one, reads it on the scan, then searches their own town or surname. They leave with a citation and a follow, believing the archive holds their people.

FIRST VIEWPORT: Laptop 1440: masthead line; search field with "Searching N processed pages" beneath; a filter row; left column (5/12) shelves with three wire rows each; right (7/12) the pulled proof (scan crop ringed, transcription, labels, Cite / Follow / Save). First shelf's first story is pulled by default. Phone 375: masthead, search, filter chip row, shelves list; tapping a row opens the proof as a full-height sheet with a back control.

FORM: Wire desk, position 1 on the ordered list of six; seed key 3e53fe27. Signature interaction: pulling a row slides the proof onto the desk (180 ms, translate only) and the blue-pencil ring draws around the clipping, reusing Play's ring; reduced motion swaps both for an instant cut.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Shelf contents are curated queries over Editor-verified clippings; exact shelves fixed at build (Milwaukee's Black press, The Bly race in the papers, German Milwaukee, Front pages Nov 1889).
