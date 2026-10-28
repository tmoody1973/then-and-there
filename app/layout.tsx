import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Libre_Franklin, Source_Serif_4 } from "next/font/google";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Then & There",
  description: "Race Nellie Bly around the world in real time, 137 years later, through America's historic newspapers.",
};

const franklin = Libre_Franklin({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-franklin", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin", "latin-ext"], variable: "--font-serif", display: "swap" });

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f3f4f1" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${franklin.variable} ${serif.variable}`}>
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
