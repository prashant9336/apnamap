import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import NavigationProgress from "@/components/layout/NavigationProgress";

/* ── PWA / SEO metadata ─────────────────────────────────────────── */
export const metadata: Metadata = {
  title:       "ApnaMap — Walk Your City, Unlock Nearby Offers",
  description: "India's hyperlocal discovery platform. Walk through your city digitally. Find shops, offers, and deals near you.",

  manifest: "/manifest.json",

  /* iOS PWA */
  appleWebApp: {
    capable:         true,
    statusBarStyle:  "black-translucent",
    title:           "ApnaMap",
  },

  /* Open Graph */
  openGraph: {
    title:       "ApnaMap",
    description: "Walk your city. Unlock nearby offers.",
    type:        "website",
  },

  /* Favicon / browser tab icon */
  icons: {
    icon:      [
      { url: "/api/icon?size=32",  sizes: "32x32",   type: "image/png" },
      { url: "/api/icon?size=192", sizes: "192x192", type: "image/png" },
    ],
    apple:     [
      { url: "/api/icon?size=180", sizes: "180x180", type: "image/png" },
    ],
    shortcut:  "/api/icon?size=192",
  },

  /* Disable phone-number detection on iOS */
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width:         "device-width",
  initialScale:  1,
  maximumScale:  1,
  themeColor:    "#FF5E1A",
  viewportFit:   "cover",
};

/* ── Root layout ────────────────────────────────────────────────── */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* iOS standalone — splash + status bar */}
        <meta name="mobile-web-app-capable"      content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title"  content="ApnaMap" />

        {/* MS Tile for Windows */}
        <meta name="msapplication-TileColor"  content="#FF5E1A" />
        <meta name="msapplication-TileImage"  content="/api/icon?size=144" />
        <meta name="msapplication-config"     content="none" />

        {/* Apple touch icon (Safari "Add to Home Screen") */}
        <link rel="apple-touch-icon" sizes="180x180" href="/api/icon?size=180" />

        {/* Splash screen background while app loads on iOS */}
        <meta name="theme-color" content="#05070C" media="(prefers-color-scheme: dark)"  />
        <meta name="theme-color" content="#FF5E1A" media="(prefers-color-scheme: light)" />
        {/* Inline critical style — eliminates white flash before stylesheet parses */}
        <style dangerouslySetInnerHTML={{ __html: "html,body{background:#05070C!important;color:#EDEEF5}" }} />
      </head>
      <body className="antialiased" style={{ background: "#05070C" }}>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
