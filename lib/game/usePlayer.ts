"use client";

import { useCallback, useEffect, useState } from "react";
import { loadProgress, recordAnswer, recordFinale, saveProgress } from "./progress";
import type { DayResult, Progress } from "./types";

const DEMO_KEY = "tt.demo";
const STATE_KEY = "tt.state";
const HINTS_KEY = "tt.hints.v1";
const DEFAULT_STATE = "wisconsin";

const store = () => (typeof window === "undefined" ? null : window.localStorage);
const safeGet = (k: string) => {
  try {
    return store()?.getItem(k) ?? null;
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string) => {
  try {
    store()?.setItem(k, v);
  } catch {
    // private mode: keep playing, just don't remember
  }
};
const localToday = () => new Date().toLocaleDateString("en-CA");

export function usePlayer() {
  const [progress, setProgress] = useState<Progress>({ days: {} });
  const [demo, setDemoState] = useState(false);
  const [state, setStateName] = useState(DEFAULT_STATE);
  const [hints, setHints] = useState<Record<number, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = store();
    setProgress(s ? loadProgress(s) : { days: {} });
    const urlDemo = new URLSearchParams(window.location.search).get("demo") === "1";
    if (urlDemo) safeSet(DEMO_KEY, "1");
    setDemoState(urlDemo || safeGet(DEMO_KEY) === "1");
    setStateName(safeGet(STATE_KEY) ?? DEFAULT_STATE);
    try {
      setHints(JSON.parse(safeGet(HINTS_KEY) ?? "{}"));
    } catch {
      setHints({});
    }
    setReady(true);
  }, []);

  const setDemo = useCallback((on: boolean) => {
    safeSet(DEMO_KEY, on ? "1" : "0");
    setDemoState(on);
  }, []);

  const setState = useCallback((name: string) => {
    safeSet(STATE_KEY, name);
    setStateName(name);
  }, []);

  const useHint = useCallback((day: number) => {
    setHints((h) => {
      const next = { ...h, [day]: (h[day] ?? 0) + 1 };
      safeSet(HINTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const answer = useCallback(
    (day: number, correct: boolean) => {
      setProgress((p) => {
        const r: DayResult = { correct, hintsUsed: hints[day] ?? 0, answeredOn: localToday() };
        const next = recordAnswer(p, day, r);
        const s = store();
        if (s && next !== p) saveProgress(s, next);
        return next;
      });
    },
    [hints],
  );

  const guessFinale = useCallback((guessSeconds: number) => {
    setProgress((p) => {
      const next = recordFinale(p, guessSeconds, localToday());
      const s = store();
      if (s && next !== p) saveProgress(s, next);
      return next;
    });
  }, []);

  return { ready, progress, today: localToday(), demo, setDemo, state, setState, hintsUsed: hints, useHint, answer, guessFinale };
}
