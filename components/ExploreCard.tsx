"use client";

import { type ReactNode, useState } from "react";
import { PLACES } from "../lib/agent/places";
import type { ClipRef } from "../lib/agent/useAgent";
import { titleCase } from "../lib/game/format";
import { paperFromCite, plainCitation } from "../lib/loc/cite";
import { CiteButton } from "./CiteButton";
import { FollowButton } from "./FollowButton";
import { Check } from "./Marks";
import { pageUrl } from "./iiif";
import { ScanCrop } from "./ScanCrop";

export type Card = {
  clippingId: string; pageId: string; iiifBase: string; box: { x: number; y: number; w: number; h: number }; paper: string; city: string; state: string;
  date: string; sequence: number; language: string[]; type?: string; people: string[]; textKind: "repaired" | "archive"; text: string; archiveText?: string;
  editorStatus: string; hardHistory: boolean; citeThis: { apa: string; chicago: string; mla: string };
};

const TYPE: Record<string, string> = { person: "person story", event: "event", business: "business story", ad: "advertisement", notice: "notice", other: "clipping" };
// Fixed copy, never model-written (decision 009): calm, and it explains why the item is shown.
export const HARD_HISTORY_NOTE = "This item reflects attitudes or language of its time. It is shown as printed, as a historical record.";
export const HARD_HISTORY_PAGE_NOTE = "Something on this page reflects attitudes or language of its time. It is shown as printed, as a historical record.";

export const paperName = (title: string, mla = "") => paperFromCite(mla, titleCase(title.replace(/\s*\(.*$/, "")));
export const longDay = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
export const clipRefOf = (c: Card): ClipRef => ({
  clippingId: c.clippingId, pageId: c.pageId, iiifBase: c.iiifBase, box: c.box, paper: paperName(c.paper, c.citeThis.mla), date: c.date, citationMla: plainCitation(c.citeThis.mla), excerpt: c.text.slice(0, 300),
});

// Marks the searched words with the editor's highlighter.
export function marked(text: string, q: string): ReactNode {
  const words = q.split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return text;
  const re = new RegExp(`(${words.join("|")})`, "gi");
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

type Props = {
  card: Card;
  q: string;
  follows: Array<{ kind: string; value: string }>;
  onFollow: (kind: "name" | "place", value: string) => Promise<void>;
  saved: boolean;
  onSave: () => void;
};

// The pulled proof: the scan first, then the text, what the machine and the Editor said about it,
// and what the reader can do with it.
export function ExploreCard({ card, q, follows, onFollow, saved, onSave }: Props) {
  const [compare, setCompare] = useState(false);
  const verified = card.editorStatus === "pass";
  const place = PLACES.includes(card.city) ? card.city : PLACES.includes(card.state) ? card.state : null;
  const isFollowing = (kind: string, value: string) => follows.some((f) => f.kind === kind && f.value.toLowerCase() === value.toLowerCase());
  const people = verified ? card.people.slice(0, 2) : [];
  return (
    <article className="pulled" aria-labelledby={`pulled-${card.clippingId}`}>
      <p className="slug" id={`pulled-${card.clippingId}`}>
        <time dateTime={card.date}>{longDay(card.date)}</time> · {paperName(card.paper, card.citeThis.mla)} · {titleCase(card.city)}
      </p>
      <ScanCrop iiifBase={card.iiifBase} box={card.box} pageId={card.pageId} alt={card.text.slice(0, 300)} citation={plainCitation(card.citeThis.mla)} />
      <p className="labels">
        {verified ? (
          <span className="label is-verified">
            <Check /> Verified: {TYPE[card.type ?? "other"]}
          </span>
        ) : card.type ? (
          <span className="label">Machine-sorted: {TYPE[card.type]}</span>
        ) : null}
        <span className="label">{card.textKind === "repaired" ? "Machine-repaired text" : "Archive OCR text"}</span>
      </p>
      {card.hardHistory ? <p className="content-note">{HARD_HISTORY_NOTE}</p> : null}
      <blockquote className="transcript">{marked(compare && card.archiveText ? card.archiveText : card.text, q)}</blockquote>
      {card.archiveText ? (
        <button type="button" className="text-button is-quiet" aria-pressed={compare} onClick={() => setCompare((c) => !c)}>
          {compare ? "Show the repaired text" : "Compare with the archive's OCR"}
        </button>
      ) : null}
      <div className="pulled-actions">
        <CiteButton cite={card.citeThis} sequence={card.sequence} box={card.box} />
        <a className="text-button" href={pageUrl(card.pageId)}>Open scan at loc.gov</a>
        <button type="button" className="text-button" aria-pressed={saved} onClick={onSave} disabled={saved}>
          {saved ? "Saved to your desk" : "Save to your desk"}
        </button>
        {place ? <FollowButton kind="place" value={place} label={titleCase(place)} following={isFollowing("place", place)} onFollow={onFollow} /> : null}
        {people.map((p) => (
          <FollowButton key={p} kind="name" value={p} label={p} following={isFollowing("name", p)} onFollow={onFollow} />
        ))}
      </div>
    </article>
  );
}
