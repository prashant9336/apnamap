import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApnaMap — Walk Your City, Unlock Nearby Offers",
  description: "India's hyperlocal discovery platform. Walk through your city digitally. Find shops, offers, and deals near you.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ApnaMap" },
  openGraph: { title: "ApnaMap", description: "Walk your city. Unlock nearby offers.", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1,
  themeColor: "#05070C",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
