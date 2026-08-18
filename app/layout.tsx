import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Mono } from "next/font/google";

import { AppLayout } from "@/components/app-shell/app-layout";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MTG Deck Builder",
  description:
    "Track what's in your deck, what's going in, and what it costs. Local-first Commander deck manager.",
  applicationName: "MTG Deck Builder",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Required so content can extend under the iPhone home indicator while the
  // bottom nav pads itself with env(safe-area-inset-bottom).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${spaceMono.variable} antialiased`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
