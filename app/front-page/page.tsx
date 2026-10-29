"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { FrontPageGame } from "../../components/frontpage/FrontPageGame";
import { frontPageNo, LAUNCH } from "../../lib/frontpage/rules";
import "../play/play.css";
import "../agent.css";
import "./front-page.css";

// Today's page: everyone in the country gets the same number.
export default function TodaysFrontPage() {
  const count = useQuery(api.frontPages.count, {});
  const [no, setNo] = useState<number | null>(null);
  useEffect(() => {
    if (count) setNo(frontPageNo(new Date(), LAUNCH, count));
  }, [count]);
  if (count === 0) return <main className="fp"><p>The first front page is still being set. Check back soon.</p></main>;
  return no ? <FrontPageGame no={no} /> : <main className="fp"><p className="caption">Laying out today&apos;s page…</p></main>;
}
