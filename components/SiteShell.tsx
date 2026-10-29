"use client";

// The paper's furniture: nameplate and section nav on every laptop page, the nameplate alone on the
// phone's front page, a tab bar on the phone, and a footer that keeps the archive search one tap away.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAgent } from "../lib/agent/useAgent";
import { LensIcon, PaperIcon, PersonIcon, RouteIcon } from "./Marks";

const SECTIONS = [
  { href: "/", label: "Today" },
  { href: "/front-page", label: "Front Page" },
  { href: "/play", label: "Detective" },
  { href: "/one-day", label: "One Day" },
  { href: "/quests", label: "Quests" },
  { href: "/desk", label: "My Agent" },
];
const TABS = [
  { href: "/", label: "Today", Icon: PaperIcon },
  { href: "/play", label: "Detective", Icon: LensIcon },
  { href: "/quests", label: "Quests", Icon: RouteIcon },
  { href: "/desk", label: "My Agent", Icon: PersonIcon },
];
// Inside a round the screen belongs to the game; the tab bar steps aside.
const IN_PLAY = /^\/(front-page|forgery|one-day|play\/(\d+|finale))/;

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

// AP style, as a dateline sets it: "THURSDAY, OCT. 29, 2026".
const AP_MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
export function apDate(d: Date) {
  const day = d.toLocaleDateString("en-US", { weekday: "long" });
  return `${day}, ${AP_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function Today() {
  const [text, setText] = useState("");
  useEffect(() => setText(apDate(new Date())), []);
  return <time className="site-date">{text}</time>;
}

function AgentCount() {
  const { unread } = useAgent();
  return unread ? <span className="tab-count num" aria-label={`${unread} new`}>{unread}</span> : null;
}

export function SiteHeader() {
  const path = usePathname() ?? "/";
  return (
    <header className={`site-head${path === "/" ? " is-home" : ""}`}>
      <div className="site-head-inner double-rule">
        <p className="site-edition">
          <Today />
          <span>Free edition</span>
        </p>
        <Link href="/" className="nameplate" aria-label="Then & There, today's edition">
          Then &amp; There
        </Link>
        <p className="site-tagline">America&apos;s front pages, made playable</p>
        <nav className="site-nav" aria-label="Sections">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} aria-current={isActive(path, s.href) ? "page" : undefined}>
              {s.label}
              {s.href === "/desk" ? <AgentCount /> : null}
            </Link>
          ))}
        </nav>
        <p className="site-meta">
          <Today />
          <Link href="/explore">Search the archive</Link>
        </p>
      </div>
    </header>
  );
}

export function TabBar() {
  const path = usePathname() ?? "/";
  if (IN_PLAY.test(path)) return null;
  return (
    <nav className="tab-bar" aria-label="Sections">
      {TABS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={isActive(path, href) ? "page" : undefined}>
          <Icon className="tab-icon" />
          <span>{label}</span>
          {href === "/desk" ? <AgentCount /> : null}
        </Link>
      ))}
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <Link href="/explore">Search the archive</Link>
      <Link href="/how">How a page becomes a story</Link>
      <span>Pages from the Library of Congress, Chronicling America</span>
      <span>A project by Tarik Moody</span>
    </footer>
  );
}
