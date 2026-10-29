import Link from "next/link";
import { DeskLink } from "../components/DeskLink";
import "./home.css";

// A verified story from the Black-press shelf (The Wisconsin Weekly Advocate, Feb 5, 1903).
const FENWICK =
  "https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_dlc_ifill_ver01:data:sn84025861:00211664794:1903020501:0169/243,4499,845,640/845,/0/default.jpg";
const CONTEST =
  "https://tile.loc.gov/image-services/iiif/service:ndnp:nn:batch_nn_hanyu_ver01:data:sn83030193:00206539525:1889112902:0708/0,0,5308,1800/1200,/0/default.jpg";

// Two doors onto one engine: the daily race, and the Story Finder.
export default function Home() {
  return (
    <main className="home">
      <p className="dateline">
        <span>THEN &amp; THERE</span>
        <span>
          <Link href="/explore">Explore</Link> · <DeskLink />
        </span>
      </p>
      <h1>The stories in America&apos;s old newspapers, found and checked.</h1>
      <p className="home-lede">
        The Library of Congress has put millions of newspaper pages online, and almost nobody reads them: you have to know
        a name to search for one. Meta&apos;s models cut each page into stories and repair the text, and an independent
        Editor checks every claim against the scan.
      </p>
      <div className="doors">
        <section className="door" aria-labelledby="door-play">
          <h2 id="door-play">Race Nellie Bly</h2>
          <p>
            In real time, 137 years later: one dispatch a day from the papers 1889 readers held, November 14 to January 25.
            Make the call before the papers tell you.
          </p>
          <figure className="proof door-proof">
            <img src={CONTEST} alt="Front page banner of The Evening World, November 29, 1889: A free trip to Europe for the nearest guess as to the exact time of Nellie Bly's tour." />
          </figure>
          <p className="caption">The Evening World (New York), November 29, 1889, page 1.</p>
          <p className="door-go">
            <Link href="/play">Start the race</Link>
          </p>
        </section>
        <section className="door" aria-labelledby="door-explore">
          <h2 id="door-explore">Find the stories nobody knew to search for</h2>
          <p>
            Search the pages we&apos;ve processed by name, town or date, or start from shelves of verified stories: the
            Black press of Milwaukee and Detroit, German Milwaukee, the race in the papers. Every story opens on its
            scan, with a citation.
          </p>
          <figure className="proof door-proof door-clip">
            <img src={FENWICK} alt="Rev. L. M. Fenwick, A. M., M. D., E. M., Pastor of St. Mark's A. M. E. Church, Milwaukee. Rev. Louis Madison Fenwick, M. D., the subject of the accompanying sketch, was born in Gentry county, Missouri, August 29, 1858." />
          </figure>
          <p className="caption">The Wisconsin Weekly Advocate (Milwaukee), February 5, 1903, page 1.</p>
          <p>Follow a name or a place, and an agent checks each night&apos;s newly added pages for it.</p>
          <p className="door-go">
            <Link href="/explore">Open the Story Finder</Link>
          </p>
        </section>
      </div>
      <p className="caption home-foot">
        <Link href="/how">How a page becomes a story</Link> · A project by Tarik Moody.
      </p>
    </main>
  );
}
