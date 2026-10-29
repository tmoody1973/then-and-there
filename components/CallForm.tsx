"use client";

import { useState } from "react";
import { isCorrect } from "../lib/game/scoring";
import type { Question } from "../lib/game/types";
import { Check, Strike } from "./Marks";

type Props = { question: Question; filed?: { correct: boolean }; onFile: (correct: boolean, answer: number) => void };

// The call: circle one in blue pencil, then file it. Once filed it can't be changed.
export function CallForm({ question, filed, onFile }: Props) {
  const [pick, setPick] = useState<number | null>(null);
  const [days, setDays] = useState("");
  const locked = Boolean(filed);
  const value = question.kind === "choice" ? pick : days === "" ? null : Number(days);

  return (
    <form
      className="call"
      onSubmit={(e) => {
        e.preventDefault();
        if (value === null || locked) return;
        onFile(isCorrect(question, value), value);
      }}
    >
      <fieldset disabled={locked}>
        <legend className="call-prompt">{question.prompt}</legend>
        {question.kind === "choice" ? (
          <ul className="choices" role="list">
            {question.options.map((opt, i) => {
              const isAnswer = locked && i === question.answerIndex;
              return (
                <li key={opt}>
                  <label className={`choice ${pick === i ? "is-picked" : ""} ${isAnswer ? "is-answer" : ""}`}>
                    <input type="radio" name="call" value={i} checked={pick === i} onChange={() => setPick(i)} />
                    <span className="choice-text">{opt}</span>
                    {isAnswer ? <Check className="choice-mark" title="What happened" /> : null}
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <label className="days-input">
            <input inputMode="numeric" pattern="[0-9]*" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} aria-describedby="days-unit" />
            <span id="days-unit">days</span>
          </label>
        )}
        {locked ? null : (
          <button type="submit" className="file-button" disabled={value === null}>
            File it
          </button>
        )}
      </fieldset>
      {filed ? (
        <p className={`verdict ${filed.correct ? "is-made" : "is-missed"}`} role="status">
          {filed.correct ? <Check /> : <Strike />}
          {filed.correct ? "You made the call." : "Missed. That cost you 3 days."}
          {question.kind === "days" && !filed.correct ? ` The papers say ${question.answerDays} days.` : null}
        </p>
      ) : null}
    </form>
  );
}
