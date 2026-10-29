import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Source_Serif_4, UnifrakturCook } from "next/font/google";
import { SiteFooter, SiteHeader, TabBar } from "../components/SiteShell";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";
import "./shell.css";

export const metadata: Metadata = {
  title: "Then & There",
  description: "America's front pages, made playable: real historic newspapers from the Library of Congress, cut into stories and checked by Meta's models.",
};

const mast = UnifrakturCook({ subsets: ["latin"], weight: "700", variable: "--font-unifraktur", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-plex-mono", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin", "latin-ext"], variable: "--font-serif", display: "swap" });

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ebe7de" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${mast.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <ConvexClientProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
          <TabBar />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
