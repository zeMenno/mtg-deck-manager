import type { Metadata, Viewport } from "next";
import { Fira_Code, Merriweather, Oxanium } from "next/font/google";

import { AppLayout } from "@/components/app-shell/app-layout";
import { ThemeProvider } from "@/components/providers/theme-provider";

import "./globals.css";

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MTG Deck Builder",
    template: "%s · Deck Builder",
  },
  description:
    "Track what's in your deck, what's going in, and what it costs. Local-first Commander deck manager.",
  applicationName: "MTG Deck Builder",
  // Emits mobile-web-app-capable, apple-mobile-web-app-status-bar-style, and
  // apple-mobile-web-app-title. The legacy apple-prefixed capable tag is added
  // in the <head> below because Next no longer emits it.
  appleWebApp: {
    capable: true,
    title: "Deck Builder",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // Card names and set codes are not phone numbers.
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Solar Dusk dark background; matches the static PWA manifest.
  themeColor: "#1c1917",
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
    <html
      lang="en"
      className={`dark ${oxanium.variable} ${firaCode.variable} ${merriweather.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Next's metadata API emits only the standardized
            mobile-web-app-capable. iOS before 16.4 ignores that name and needs
            the apple-prefixed tag to launch from the Home Screen standalone. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AppLayout>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
