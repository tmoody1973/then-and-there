import Link from "next/link";

// Placeholder landing; designed in Task 5 with /impeccable.
export default function Home() {
  return (
    <main>
      <h1>Then &amp; There</h1>
      <p>America&apos;s historic newspapers, readable but unread.</p>
      <ul>
        <li>
          <Link href="/play">Race Nellie Bly</Link>
        </li>
        <li>
          <Link href="/how">How it works</Link>
        </li>
      </ul>
    </main>
  );
}
