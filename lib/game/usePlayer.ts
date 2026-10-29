"use client";

import { useCallback, useEffect, useState } from "react";
import { loadProgress, parseHints, recordAnswer, recordFinale, saveProgress, storageKeys } from "./progress";
import type { DayResult, Progress } from "./types";

const DEMO_KEY = "tt.demo";
const STATE_KEY = "tt.state";
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

  // Progress and hints are read from the demo or live keys, whichever mode is on.
  const loadFor = useCallback((on: boolean) => {
    const s = store();
    const keys = storageKeys(on);
    setProgress(s ? loadProgress(s, keys.progress) : { days: {} });
    setHints(parseHints(safeGet(keys.hints)));
  }, []);

  useEffect(() => {
    const urlDemo = new URLSearchParams(window.location.search).get("demo") === "1";
    if (urlDemo) safeSet(DEMO_KEY, "1");
    const on = urlDemo || safeGet(DEMO_KEY) === "1";
    setDemoState(on);
    loadFor(on);
    setStateName(safeGet(STATE_KEY) ?? DEFAULT_STATE);
    setReady(true);
  }, [loadFor]);

  const setDemo = useCallback(
    (on: boolean) => {
      safeSet(DEMO_KEY, on ? "1" : "0");
      setDemoState(on);
      loadFor(on);
    },
    [loadFor],
  );

  const setState = useCallback((name: string) => {
    safeSet(STATE_KEY, name);
    setStateName(name);
  }, []);

  const keys = storageKeys(demo);

  const useHint = useCallback(
    (day: number) => {
      setHints((h) => {
        const next = { ...h, [day]: (h[day] ?? 0) + 1 };
        safeSet(keys.hints, JSON.stringify(next));
        return next;
      });
    },
    [keys.hints],
  );

  const answer = useCallback(
    (day: number, correct: boolean) => {
      setProgress((p) => {
        const r: DayResult = { correct, hintsUsed: hints[day] ?? 0, answeredOn: localToday() };
        const next = recordAnswer(p, day, r);
        const s = store();
        if (s && next !== p) saveProgress(s, next, keys.progress);
        return next;
      });
    },
    [hints, keys.progress],
  );

  const guessFinale = useCallback(
    (guessSeconds: number) => {
      setProgress((p) => {
        const next = recordFinale(p, guessSeconds, localToday());
        const s = store();
        if (s && next !== p) saveProgress(s, next, keys.progress);
        return next;
      });
    },
    [keys.progress],
  );

  return { ready, progress, today: localToday(), demo, setDemo, state, setState, hintsUsed: hints, useHint, answer, guessFinale };
}
