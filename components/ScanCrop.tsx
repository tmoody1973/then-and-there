"use client";

import { useState } from "react";
import { type Box, iiifCropUrl, pageUrl } from "./iiif";
import { PencilRing } from "./PencilRing";

type Props = {
  iiifBase: string;
  box: Box;
  focus?: Box;
  pageId: string;
  alt: string;
  citation: string;
  ringed?: boolean;
};

// A real scan laid on the desk. If the Library's image server fails, the citation and a
// link to the page still stand on their own.
export function ScanCrop({ iiifBase, box, focus, pageId, alt, citation, ringed = true }: Props) {
  const [failed, setFailed] = useState(false);
  const [whole, setWhole] = useState(false);
  // With a focus box, show just the lines that carry the evidence; "whole" shows the full clipping.
  const region = focus && !whole ? focus : box;
  const tall = !focus && box.h > box.w * 1.6;
  const expandable = Boolean(focus) || tall;
  return (
    <figure className="scan">
      <div className={`proof scan-proof ${tall && !whole ? "is-capped" : ""}`}>
        {failed ? (
          <p className="scan-fallback">
            Scan unavailable right now. <a href={pageUrl(pageId)}>Open this page at loc.gov</a>
          </p>
        ) : (
          <img
            src={iiifCropUrl(iiifBase, region, 1200)}
            srcSet={`${iiifCropUrl(iiifBase, region, 800)} 800w, ${iiifCropUrl(iiifBase, region, 1600)} 1600w`}
            sizes="(min-width: 960px) 50vw, 100vw"
            alt={alt}
            loading="eager"
            onError={() => setFailed(true)}
          />
        )}
        {ringed && !failed && !whole ? <PencilRing /> : null}
      </div>
      {expandable && !failed ? (
        <button type="button" className="text-button" onClick={() => setWhole((w) => !w)} aria-expanded={whole}>
          {whole ? "Show less" : "Read the whole clipping"}
        </button>
      ) : null}
      <figcaption className="caption">
        {citation} <a href={pageUrl(pageId)}>See the full page</a>
      </figcaption>
    </figure>
  );
}
