/** @type {import('next').NextConfig} */

const withPWA    = require("@ducanh2912/next-pwa").default;
const { withSentryConfig } = require("@sentry/nextjs");

/* ── PWA / Workbox configuration ─────────────────────────────────────── */
const withPWAWrapped = withPWA({
  dest: "public",

  // cacheOnFrontEndNav and aggressiveFrontEndNavCaching are intentionally
  // disabled. They power the swe-worker which calls cache.put() inside a
  // comma expression — the returned Promise is never awaited or caught.
  // On iOS Safari (50 MB quota) cache.put() rejects on quota exceeded →
  // unhandled Promise rejection in the SW context → recurring Sentry errors.
  // Keeping page caching off eliminates the swe-worker entirely.

  reloadOnOnline: true, // safe: reloads stale page when connection restores

  // Offline fallback — served when user is offline and page isn't cached
  fallbacks: { document: "/offline" },

  // Service workers break HMR in development — disable there
  disable: process.env.NODE_ENV === "development",

  workboxOptions: {
    disableDevLogs: true,

    runtimeCaching: [
      // ── Images: safe to cache — content-addressed URLs or external CDN ──

      /* Supabase storage (shop logos, cover images) — Cache First, 30 days */
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:         "supabase-images",
          expiration:        { maxEntries: 150, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* Unsplash images — Cache First, 7 days */
      {
        urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:         "unsplash-images",
          expiration:        { maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* Google Fonts — Cache First (font files are versioned and immutable) */
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:         "google-fonts",
          expiration:        { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* PWA icons — Cache First (generated PNG, URL includes size param) */
      {
        urlPattern: /^\/api\/icon(\?.*)?$/i,
        handler: "CacheFirst",
        options: {
          cacheName:         "pwa-icons",
          expiration:        { maxEntries: 10, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      // ── NOTE: API routes are intentionally NOT cached ──────────────────
      // ApnaMap serves real-time data (shops, offers, deals). Caching API
      // responses would serve yesterday's deals as "live". Auth-bearing
      // requests also fail when a cached 200 is returned with an expired
      // token embedded. All /api/* requests always go to the network.

      /* Next.js static chunks — Cache First (content-addressed by hash) */
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:         "next-static",
          expiration:        { maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

/* ── Core Next.js config ──────────────────────────────────────────────── */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "apnamap.vercel.app", "apnamap.com", "*.apnamap.com"],
    },
    instrumentationHook: true,
  },
};

const baseConfig = withPWAWrapped(nextConfig);

module.exports = withSentryConfig(baseConfig, {
  silent:                     !process.env.CI,
  widenClientFileUpload:      true,
  disableLogger:              true,
  automaticVercelMonitors:    true,
  authToken:                  process.env.SENTRY_AUTH_TOKEN,
  org:                        process.env.SENTRY_ORG,
  project:                    process.env.SENTRY_PROJECT ?? "apnamap",
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps:             true,
});
