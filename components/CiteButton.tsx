"use client";

import { useState } from "react";
import { plainCitation } from "../lib/loc/cite";

type Cite = { apa: string; chicago: string; mla: string };
const STYLES = [["mla", "MLA"], ["apa", "APA"], ["chicago", "Chicago"]] as const;

// The Library's own citations, plus where on the page the clipping sits.
export function CiteButton({ cite, sequence, box }: { cite: Cite; sequence: number; box: { x: number; y: number; w: number; h: number } }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const where = `Page ${sequence}, clipping at x ${Math.round(box.x)}, y ${Math.round(box.y)} on the page scan.`;
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(`${plainCitation(text)} ${where}`);
      setCopied(`${label} citation copied.`);
    } catch {
      setCopied("Couldn't reach the clipboard; select the text instead.");
    }
  };
  return (
    <div className="cite">
      <button type="button" className="text-button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Cite
      </button>
      {open ? (
        <dl className="cite-list">
          {STYLES.map(([k, label]) => (
            <div key={k} className="cite-row">
              <dt>{label}</dt>
              <dd>
                <span>{plainCitation(cite[k])} {where}</span>
                <button type="button" className="text-button is-quiet" onClick={() => copy(label, cite[k])}>
                  Copy<span className="visually-hidden"> {label} citation</span>
                </button>
              </dd>
            </div>
          ))}
          <p className="caption" role="status">{copied}</p>
        </dl>
      ) : null}
    </div>
  );
}
