"use client";

// A query that reports failure instead of throwing. Convex's useQuery throws when the database
// refuses (as on 2026-11-01, when the team hit its spending limit), and one thrown query in the
// shared header took every page down with it. useQueries hands errors back as values.
import { useQueries } from "convex/react";
import { useMemo } from "react";
import { type FunctionArgs, type FunctionReference, type FunctionReturnType, getFunctionName } from "convex/server";

export type Safe<T> = { data: T | undefined; failed: boolean };

export function useSafeQuery<Q extends FunctionReference<"query">>(query: Q, args: FunctionArgs<Q> | "skip"): Safe<FunctionReturnType<Q>> {
  // useQueries resubscribes whenever its request object changes identity, so keep it stable per
  // function and args. Function references are proxies (a new object per access): key by name.
  const key = `${getFunctionName(query)}:${args === "skip" ? "skip" : JSON.stringify(args)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const request = useMemo((): Parameters<typeof useQueries>[0] => (args === "skip" ? {} : { q: { query, args } }), [key]);
  const r = useQueries(request).q as FunctionReturnType<Q> | Error | undefined;
  return r instanceof Error ? { data: undefined, failed: true } : { data: r, failed: false };
}
