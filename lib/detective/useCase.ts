"use client";

import { useEffect, useState } from "react";
import { CASE_KEY, type CaseState, FRESH, parseCase } from "./progress";

const read = () => {
  try {
    return parseCase(window.localStorage.getItem(CASE_KEY));
  } catch {
    return FRESH;
  }
};

// The case's saved place, read after mount (the server has no localStorage) and written on change.
export function useCase() {
  const [state, setState] = useState<CaseState>(FRESH);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);
  const update = (next: CaseState) => {
    setState(next);
    try {
      window.localStorage.setItem(CASE_KEY, JSON.stringify(next));
    } catch {
      // private mode: keep playing, just don't remember
    }
  };
  return { state, ready, update, reset: () => update(FRESH) };
}

export const readCase = read;
