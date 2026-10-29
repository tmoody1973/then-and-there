"use client";

import { useState } from "react";

// Follow a place or a person. The nightly agent matches follows in our own code, never in a model.
export function FollowButton({ kind, value, label, following, onFollow }: { kind: "name" | "place"; value: string; label: string; following: boolean; onFollow: (kind: "name" | "place", value: string) => Promise<void> }) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [error, setError] = useState("");
  if (following) return <span className="follow-done">Following {label}</span>;
  return (
    <span className="follow">
      <button
        type="button"
        className="text-button"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            await onFollow(kind, value);
            setState("idle");
          } catch (e) {
            setState("error");
            setError(e instanceof Error ? e.message.replace(/^.*Uncaught Error: /s, "").split("\n")[0] : "Couldn't follow right now.");
          }
        }}
      >
        Follow {label}
      </button>
      {state === "error" ? <span className="caption" role="alert"> {error}</span> : null}
    </span>
  );
}
