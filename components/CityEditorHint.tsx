"use client";

import { useState } from "react";
import { Caret } from "./Marks";

type Props = { hints: string[]; used: number; disabled: boolean; onAsk: () => void };

// The City Editor never gives answers, only questions. Each one costs a day.
export function CityEditorHint({ hints, used, disabled, onAsk }: Props) {
  const [confirming, setConfirming] = useState(false);
  const shown = hints.slice(0, used);
  const more = used < hints.length && !disabled;
  return (
    <aside className="editor" aria-label="The City Editor">
      {shown.map((h) => (
        <p key={h} className="editor-note">
          <Caret className="editor-caret" />
          <span>{h}</span>
        </p>
      ))}
      {more ? (
        confirming ? (
          <p className="editor-confirm">
            That&apos;ll cost you a day.{" "}
            <button type="button" className="text-button" onClick={() => { setConfirming(false); onAsk(); }}>
              Ask anyway
            </button>{" "}
            <button type="button" className="text-button is-quiet" onClick={() => setConfirming(false)}>
              Never mind
            </button>
          </p>
        ) : (
          <button type="button" className="text-button" onClick={() => setConfirming(true)}>
            {used === 0 ? "Ask the City Editor" : "Ask again"} <span className="cost num">(−1 day)</span>
          </button>
        )
      ) : null}
    </aside>
  );
}
