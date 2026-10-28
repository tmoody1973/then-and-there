# Play: design direction ("Copy Desk")

Chosen 2026-10-28 by Tarik through `/impeccable` (roll-assigned direction; seed 2172cf11). The full contract lives in `.impeccable/surfaces/app-play.md`.

**The idea.** You're working the 1889 city desk. The real newspaper page is the proof in front of you. The editor's blue pencil is the only color, and it only marks things that matter: Bly's route, your circled call, the City Editor's notes in the margin.

**What it refuses.** A quiz app (bright cards, confetti, badges). Fake vintage (sepia, parchment, old-timey fonts). Museum gray. Clutter on a phone. (Tarik's anti-goals.)

**The pieces.**
- Ground: cool newsprint white `#f3f4f1`, never cream. Ink `#15171a`. Rules in gray, like column rules.
- One accent: blue pencil `#1d4ec4` (6.8:1 contrast on the page, safe for text).
- Headlines: Libre Franklin (the Franklin Gothic newspaper tradition). Reading text: Source Serif 4. Both self-hosted, so every phone sees the same faces.
- Controls are proofreader's marks: circle to choose, caret for an inserted hint, a strike for a missed call.
- Scans are shown flat and unfiltered, as "proofs" laid on the desk with a soft lift.
- Signature moment: the blue-pencil ring draws itself around the clipping when a dispatch loads, and around your choice when you file it. One stroke, under 400 ms; reduced motion turns it off.

**Why light, not dark.** Players read real, light newsprint scans; a dark interface would box the page in a costume.

**Accessibility.** WCAG 2.2 AA: text contrast ≥ 4.5:1 (secondary 7.6:1, captions 5.5:1), a visible 2.5 px blue focus ring, and every scan crop paired with its transcribed text.

**Known next steps.** On desktop, the dispatch screen should use the width as a desk (proof on the left, the call on the right) rather than one narrow column. That's decided in the screen build (Plan 2, Task 6).
