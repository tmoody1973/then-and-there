---
name: Then & There
description: Real historic front pages, made playable. A galley proof on the editor's desk.
colors:
  paper: "#ebe7de"
  paper-raised: "#f5f4ef"
  paper-bright: "#faf9f5"
  ink: "#15140f"
  ink-2: "#4a4740"
  ink-3: "#5c5952"
  rule: "#c9c4b9"
  rule-strong: "#8c877c"
  red: "#b1271d"
  wire: "#898375"
typography:
  masthead:
    fontFamily: "UnifrakturCook, serif"
    fontWeight: 700
  display:
    fontFamily: "Source Serif 4, Charter, Georgia, serif"
    fontSize: "clamp(1.875rem, 1.3rem + 2.4vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Source Serif 4, Charter, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  caption:
    fontFamily: "Source Serif 4, Charter, Georgia, serif"
    fontSize: "0.8125rem"
    lineHeight: 1.4
rounded:
  none: "0px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
  s8: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 24px"
  button-primary-hover:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "48px"
  button-waiting:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    height: "48px"
  slugline:
    textColor: "{colors.red}"
    typography: "{typography.label}"
  card-proof:
    backgroundColor: "{colors.paper-raised}"
    rounded: "{rounded.none}"
    padding: "16px"
---

# Design System: Then & There

## Overview

**Creative North Star: "The Proof Sheet"**

Every screen is a galley proof laid on an editor's desk: warm newsprint, black type, and red pencil wherever something was checked, marked, or chosen. The real scan is always the most important object on the page; the interface is the desk around it. Delight comes from the page itself (a 1889 ad, a front page from the morning the news broke), never from the chrome.

The mood is archival, calm and exact. This is a reading room, not an arcade: square corners, no glow, no gradients, and motion only where a clue is revealed. Hard-history content sits in this same calm register, never louder and never hidden.

**Key Characteristics:**
- Warm paper ground with three paper weights (page, raised card, bright sheet).
- One accent, editor's red, used for marks, slugs, the current state and the score; never decoration.
- Three voices of type: a blackletter nameplate, a serif for reading, a monospace for labels and numbers.
- Square corners everywhere. Newsprint has no radius.
- Real Library of Congress scans as the imagery; nothing drawn to imitate a page.

## Colors

A newsprint palette: warm off-whites, near-black ink, and one red pencil.

### Primary
- **Editor's Red** (`red`): the pencil. Slug lines, the current trail stop, chosen answers, the score, hover on a primary button, every mark on a scan, and the printed band on a forged page. Text-safe on paper (5.3:1).

### Neutral
- **Newsprint** (`paper`): the page ground behind everything.
- **Proof Card** (`paper-raised`): a card or panel laid on the page (the guess panel, find cards, the clue reader).
- **Clean Sheet** (`paper-bright`): the sheet inside a card; the board and scan backgrounds.
- **Press Black** (`ink`): headlines, body text, primary buttons, rules.
- **Second Ink** (`ink-2`): secondary text (7.9:1 on paper).
- **Third Ink** (`ink-3`): captions and citations (5.7:1 on paper). Never on a `rule`-colored fill, where it drops to 4.0:1.
- **Hairline** (`rule`) and **Column Rule** (`rule-strong`): dividers, borders, the dashed outline of anything not yet revealed.
- **Wire Grey** (`wire`): shared wire copy in One Day comparisons, always paired with a text legend.

**The One Pencil Rule.** Red marks something a person or the Editor did: checked, chosen, current, altered. If nothing was marked, it is not red.

**The Paper Never Glows Rule.** No gradients, tints or glows on the ground. Hatching (diagonal lines) is allowed in two places only: a dashed slot on the Front Page board that hides a real clipping, and a paper's own pieces in One Day (over the red, and on the legend's swatch), so "only in this paper" never rests on color alone.

## Typography

**Masthead Font:** UnifrakturCook (blackletter), the nameplate only.
**Reading Font:** Source Serif 4 (with Charter, Georgia), headlines and body.
**Label Font:** IBM Plex Mono, labels, buttons, counts, citations' metadata.

**Character:** a front page's three voices. The blackletter nameplate is identity, the serif carries every word meant to be read, and the monospace is the typesetter's slug: small, uppercase, tracked.

### Hierarchy
- **Display** (700, clamp 30–52px, line-height 1.08, -0.015em): page titles ("Front page no. 4", "April 18, 1906"). Balanced wrapping.
- **Body** (400, 17px, line-height 1.55): reading text, capped at about 65ch.
- **Label** (600, 12px, uppercase, 0.08em tracking): slug lines, nav, field labels, button text (buttons run 15px, 700).
- **Caption** (13px, line-height 1.4, Third Ink): citations under every scan.

**The Twelve-Pixel Floor.** No text below 12px (the `--step--2` size), including the tags pinned to clues on the Front Page board.

**The Slug, Not the Kicker Rule.** A red uppercase slug above a headline is a newspaper convention and stays (mockup authority). It names the section; it never repeats the headline.

## Layout

A single column for reading (`40rem`) and a wide frame (`80rem`) for play, on an 8-step spacing scale from 4px to 64px.

- **Laptop (960px and up):** the nameplate, section nav and date on one line over a double rule. Games use two columns: the page or board on the left, a sticky side panel (clues, guess, guide) on the right.
- **Phone (under 960px):** a top bar with back link, section slug and the one number that matters (points, days left), over a double rule; a bottom tab bar on Today, Quests and My Agent. Inside a game (Front Page, Detective, One Day, Forgery) a "← Today" bar replaces it (mockup p-02, p-04 to p-06). The primary action belongs on the first screen: on Front Page the board shrinks to a locator beside the clue so the guess fits; on Detective the clue crop is capped so the question follows close behind.
- Comparisons stay side by side even on phone (One Day's three sheets), with anything long (content notes) moved full-width below the row so the sheets start level.

**The First Screen Rule.** On a phone, the screen a player lands on must show the thing to look at and the way to answer it.

## Elevation & Depth

Mostly flat, like paper on paper. Depth comes from paper weight (page, raised card, bright sheet) and from rules, not shadows.

### Shadow Vocabulary
- **Lift** (`0 1px 2px rgb(21 20 15 / 0.06), 0 6px 18px -8px rgb(21 20 15 / 0.18)`): a real scan laid on the desk. Scans only.
- **Ink Line** (an inset 1.5px ink outline): cards, the board, options and outline buttons. This is a printed border, not elevation.

**The Scan Lifts, Nothing Else Rule.** Only a real scan casts a shadow. Cards and panels sit flat and are separated by a 3px top rule (red for a live item, ink for a panel, dashed grey for a sample).

## Shapes

Square corners everywhere (0px radius). Range slider thumbs and the trail's stop markers are the only circles; they are instruments, not decoration.

## Components

### Buttons
- **Primary:** Press Black fill, Newsprint text, Label font at 15px/700, 48px tall, square. Hover turns it Editor's Red.
- **Outline:** transparent with a 1.5px ink outline; hover fills Proof Card.
- **Waiting (disabled):** transparent with a dashed Column Rule outline and Second Ink text (7.9:1). It reads as "not yet", like the board's unrevealed slots, never as broken. Its label says what to do first ("Pick a region first").
- **Focus:** a 2.5px red pencil outline, offset 3px, on every control.

### Cards / Containers
- **Proof card:** Proof Card fill, 16px padding, a 3px top rule. Red rule for a live item (a find, the clue being read), ink rule for a panel (the guess), dashed grey for a labelled sample.
- **Clue card:** Clean Sheet fill inside a 1.5px ink line; a slug row with "real page" at right, the scan crop, then an italic summary.

### Inputs / Fields
- **Text area:** Clean Sheet fill, 1.5px ink line, serif text, italic placeholder. A line under it says where the text goes ("Your answers stay in this browser.").
- **Region choice:** four square tiles; the chosen one fills Press Black.
- **Year slider:** a thin track filled red up to a red thumb, the year set large in Display beside the label.

### Navigation
- **Laptop:** uppercase mono links centered under the nameplate; the current section is red with a 2px red underline.
- **Phone:** a bottom tab bar with drawn line icons; the current tab is red.

### Scan Proof (signature component)
A real Library of Congress crop, always with its citation and a "See the full page" link. Tall crops open with "Read the whole clipping". If the image server fails, the text and citation stand alone.

### Content Note (signature component)
Fixed copy, italic, Second Ink, between two hairlines, at caption size. Placed before the item it covers, or under a row of whole pages with the paper's name. Never hidden, never decorated, never red.

### Forgery Band (signature component)
A red band with "ALTERED FOR A GAME · NOT A REAL PAGE" in Clean Sheet mono, printed under every forged page and repeated on any crop of one.

## Do's and Don'ts

### Do:
- **Do** put the real scan first and give it the most space on the screen.
- **Do** show a citation and a way to the full page with every scan.
- **Do** keep the content note's fixed copy calm and visible wherever hard history appears, whole pages included.
- **Do** label a sample as a sample ("Example · what a find looks like") and style it apart from the real thing.
- **Do** keep every forged image labelled, cropped or not.
- **Do** say what is happening in plain words: "No new pages from the Library of Congress last night", not a row of zeros.

### Don't:
- **Don't** round corners, add gradients, glows, or glass.
- **Don't** use red for decoration; red means marked.
- **Don't** set any text below 12px.
- **Don't** draw imitation newspapers or illustrations; use real scans.
- **Don't** resemble or reference Carmen Sandiego in any name, character, look or structure. The guide is "the City Editor".
- **Don't** let a button promise what doesn't happen ("Send" when nothing is sent).
