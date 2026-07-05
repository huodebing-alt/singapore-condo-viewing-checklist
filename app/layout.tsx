import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "CondoScout SG — Singapore Condo Viewing Checklist",
  description:
    "Mobile-first checklist and note-taking app for Singapore resale condo viewings. Score lighting, noise, condition and 70+ checks, snap photos, track agents, and compare units side by side.",
  keywords: [
    "Singapore condo viewing checklist",
    "resale condo Singapore",
    "property viewing notes",
    "condo comparison",
    "house hunting Singapore",
  ],
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#12382a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
