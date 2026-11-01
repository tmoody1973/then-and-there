"use client";

// Shown when a screen that needs the database can't get it (the Front Page game, My Agent,
// Explore). The modes that ship their data with the site still work, so point there.
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="column outage">
      <p className="slugline">Back shortly</p>
      <h1>The archive desk is closed for a moment.</h1>
      <p>This page needs the archive&apos;s database, and it isn&apos;t answering right now. These games ship with the site and work now:</p>
      <ul>
        <li><Link href="/forgery">Spot the Forgery</Link></li>
        <li><Link href="/one-day">One Day, Many Papers</Link></li>
        <li><Link href="/play">The Detective: Nellie Bly&apos;s trail</Link></li>
        <li><Link href="/quests">Quest: the Great Migration</Link></li>
      </ul>
      <button type="button" className="file-button is-outline" onClick={() => retry()}>Try again</button>
    </main>
  );
}
