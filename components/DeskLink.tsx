"use client";

import Link from "next/link";
import { useAgent } from "../lib/agent/useAgent";

// Masthead link to Your Desk, with how many agent notes arrived since the last visit.
export function DeskLink() {
  const { unread } = useAgent();
  return (
    <Link href="/desk">
      My Agent{unread ? <span className="desk-count num"> ({unread}<span className="visually-hidden"> new</span>)</span> : null}
    </Link>
  );
}
