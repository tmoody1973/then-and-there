import Link from "next/link";

// Placeholder landing in the Copy Desk system; the real landing is designed later.
const CONTEST =
  "https://tile.loc.gov/image-services/iiif/service:ndnp:nn:batch_nn_hanyu_ver01:data:sn83030193:00206539525:1889112902:0708/0,0,5308,1800/1200,/0/default.jpg";

export default function Home() {
  return (
    <main className="column">
      <p className="dateline">
        <span>THEN &amp; THERE</span>
        <span className="num">Nov 14, 1889 – Jan 25, 1890</span>
      </p>
      <h1>Race Nellie Bly around the world, in real time, 137 years later.</h1>
      <p>
        One dispatch a day from the newspapers 1889 readers held in their hands. Make the call before the papers tell
        you. The City Editor will help, for a price.
      </p>
      <figure className="proof" style={{ margin: "var(--s5) 0 var(--s2)" }}>
        <img src={CONTEST} alt="Front page banner of The Evening World, November 29, 1889: A free trip to Europe for the nearest guess as to the exact time of Nellie Bly's tour." />
      </figure>
      <p className="caption">The Evening World (New York), November 29, 1889, page 1. Library of Congress, Chronicling America.</p>
      <p style={{ marginTop: "var(--s6)" }}>
        <Link href="/play">Start the race</Link> · <Link href="/how">How it works</Link>
      </p>
    </main>
  );
}
