"use client";

import { use } from "react";
import { FrontPageGame } from "../../../components/frontpage/FrontPageGame";
import "../../play/play.css";
import "../../agent.css";
import "../front-page.css";

export default function NumberedFrontPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = use(params);
  const n = Number(no);
  return Number.isInteger(n) && n > 0 ? <FrontPageGame no={n} /> : <main className="fp"><p>That isn&apos;t a page number.</p></main>;
}
