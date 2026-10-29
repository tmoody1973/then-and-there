"use client";

import { useEffect, useRef, useState } from "react";

// Image failure that also survives server rendering: an image can fail before React attaches
// onError, so check once after hydration too. Spread `bind` onto the <img>.
export function useImageFailed() {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth === 0) setFailed(true);
  }, []);
  return { failed, bind: { ref, onError: () => setFailed(true) } };
}
