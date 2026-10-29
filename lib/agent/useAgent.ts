"use client";

// This reader's agent memory: a private browser key owns follows and notes on our server; saved
// clippings, "seen" stories and the Desk's read marker stay in this browser (decision 009).
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { agentKey } from "./key";

export type ClipRef = {
  clippingId: string;
  pageId: string;
  iiifBase: string;
  box: { x: number; y: number; w: number; h: number };
  paper: string;
  date: string;
  citationMla: string;
  excerpt: string;
};
export type Note = { clippingId: string; clip: ClipRef; matched: string; replay: boolean; createdAt: number };
type Mine = { follows: Array<{ id: string; kind: "name" | "place"; value: string }>; notes: Note[]; activity: Array<{ line: string; replay: boolean; createdAt: number }> };

const SAVED_KEY = "tt.saved.v1";
const SEEN_KEY = "tt.seen.v1";
const DESK_READ_KEY = "tt.desk.readAt.v1";
const MAX_SAVED = 100;
const MAX_SEEN = 200;

const store = () => (typeof window === "undefined" ? null : window.localStorage);
function readJson<T>(key: string, fallback: T, ok: (v: unknown) => boolean): T {
  try {
    const v: unknown = JSON.parse(store()?.getItem(key) ?? "null");
    return ok(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    store()?.setItem(key, JSON.stringify(value));
  } catch {
    // private mode: keep working, just don't remember
  }
}
const isClip = (v: unknown) => typeof v === "object" && v !== null && typeof (v as ClipRef).clippingId === "string" && typeof (v as ClipRef).iiifBase === "string";

export function useAgent() {
  const [key, setKey] = useState<string | null>(null);
  const [saved, setSaved] = useState<ClipRef[]>([]);
  const [readAt, setReadAt] = useState(0);

  useEffect(() => {
    const s = store();
    try {
      setKey(s ? agentKey(s) : null);
    } catch {
      setKey(null);
    }
    setSaved(readJson<ClipRef[]>(SAVED_KEY, [], (v) => Array.isArray(v) && v.every(isClip)));
    setReadAt(readJson<number>(DESK_READ_KEY, 0, (v) => typeof v === "number"));
  }, []);

  const mine = useQuery(api.agent.mine, key ? { key } : "skip") as Mine | undefined;
  const followM = useMutation(api.agent.follow);
  const unfollowM = useMutation(api.agent.unfollow);
  const forgetM = useMutation(api.agent.forgetMe);
  const dismissM = useMutation(api.agent.dismissNote);

  const follow = useCallback(async (kind: "name" | "place", value: string) => {
    if (!key) throw new Error("This browser can't keep follows (storage is off).");
    await followM({ key, kind, value });
  }, [key, followM]);
  const unfollow = useCallback(async (id: string) => {
    if (key) await unfollowM({ key, id: id as never });
  }, [key, unfollowM]);

  // "Not my family": hides the note here; the server keeps it so the agent never resends it.
  const dismiss = useCallback(async (clippingId: string) => {
    if (key) await dismissM({ key, clippingId });
  }, [key, dismissM]);

  const save = useCallback((clip: ClipRef) => {
    setSaved((prev) => {
      const next = [clip, ...prev.filter((c) => c.clippingId !== clip.clippingId)].slice(0, MAX_SAVED);
      writeJson(SAVED_KEY, next);
      return next;
    });
  }, []);
  const unsave = useCallback((clippingId: string) => {
    setSaved((prev) => {
      const next = prev.filter((c) => c.clippingId !== clippingId);
      writeJson(SAVED_KEY, next);
      return next;
    });
  }, []);

  const forgetEverything = useCallback(async () => {
    if (key) await forgetM({ key });
    writeJson(SAVED_KEY, []);
    writeJson(SEEN_KEY, []);
    setSaved([]);
  }, [key, forgetM]);

  const markDeskRead = useCallback(() => {
    const now = Date.now();
    writeJson(DESK_READ_KEY, now);
    setReadAt(now);
  }, []);

  const unread = (mine?.notes ?? []).filter((n) => n.createdAt > readAt).length;
  return { ready: key !== null || mine !== undefined, key, mine, follow, unfollow, dismiss, saved, save, unsave, forgetEverything, unread, markDeskRead };
}

// Stories a reader has already seen (Meanwhile, notes), so the agent never repeats one.
export function seenIds(): string[] {
  return readJson<string[]>(SEEN_KEY, [], (v) => Array.isArray(v) && v.every((x) => typeof x === "string"));
}
export function markSeen(id: string) {
  const next = [id, ...seenIds().filter((x) => x !== id)].slice(0, MAX_SEEN);
  writeJson(SEEN_KEY, next);
}
