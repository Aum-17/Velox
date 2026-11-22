import type { Metadata, Viewport } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { EdgeLight } from "@/components/EdgeLight";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Velox · Run Lab",
  description: "Your personal running dashboard — log runs, track weekly pace, plan goals and download reports.",
  appleWebApp: { capable: true, title: "Velox", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#07080c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>{children}<EdgeLight /></body>
    </html>
  );
}
