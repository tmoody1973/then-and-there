"use client";

import { REGIONS, type Region } from "../../lib/frontpage/rules";

export const YEAR_MIN = 1770;
export const YEAR_MAX = 1963;

export function Guess({ year, region, onYear, onRegion, onLock }: { year: number; region: Region | null; onYear: (y: number) => void; onRegion: (r: Region) => void; onLock: () => void }) {
  const fill = `${((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%`;
  return (
    <form
      className="fp-guess"
      onSubmit={(e) => {
        e.preventDefault();
        if (region) onLock();
      }}
    >
      <div className="fp-when">
        <label htmlFor="fp-year" className="fp-ask">When?</label>
        <output htmlFor="fp-year" className="fp-year num">{year}</output>
      </div>
      <input id="fp-year" type="range" min={YEAR_MIN} max={YEAR_MAX} step={1} value={year} onChange={(e) => onYear(Number(e.target.value))} style={{ ["--fill" as string]: fill }} />
      <p className="fp-range num" aria-hidden="true"><span>{YEAR_MIN}</span><span>{YEAR_MAX}</span></p>
      <fieldset className="fp-where">
        <legend className="fp-ask">Where?</legend>
        <div className="fp-regions">
          {REGIONS.map((r) => (
            <label key={r} className="fp-region">
              <input type="radio" name="fp-region" value={r} checked={region === r} onChange={() => onRegion(r)} />
              <span>{r}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="file-button fp-lock" disabled={!region}>{region ? "Lock in guess" : "Pick a region first"}</button>
    </form>
  );
}
