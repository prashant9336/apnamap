/** @type {import('next').NextConfig} */

const withPWA    = require("@ducanh2912/next-pwa").default;
const { withSentryConfig } = require("@sentry/nextjs");

/* ── PWA / Workbox configuration ─────────────────────────────────────── */
const withPWAWrapped = withPWA({
  dest: "public",

  cacheOnFrontEndNav:           true, // cache pages on client-side navigation
  aggressiveFrontEndNavCaching: true, // cache prefetched pages too
  reloadOnOnline:               true, // reload stale page when back online

  // Service workers break HMR in development — disable there
  disable: process.env.NODE_ENV === "development",

  workboxOptions: {
    disableDevLogs: true,

    runtimeCaching: [
      /* Supabase storage (shop logos, cover images) — Cache First, 30 days */
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:         "supabase-images",
          expiration:        { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* Unsplash images — Cache First, 7 days */
      {
        urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:         "unsplash-images",
          expiration:        { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* Google Fonts — Cache First forever (font files are immutable) */
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:         "google-fonts",
          expiration:        { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* PWA icons — Cache First forever (generated PNG, content never changes) */
      {
        urlPattern: /^\/api\/icon(\?.*)?$/i,
        handler: "CacheFirst",
        options: {
          cacheName:         "pwa-icons",
          expiration:        { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* App API routes — Network First, fall back to cache for 24 h offline */
      {
        urlPattern: /^\/api\/(?!icon).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName:             "api-responses",
          networkTimeoutSeconds: 10,
          expiration:            { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse:     { statuses: [0, 200] },
        },
      },

      /* Next.js static chunks — Cache First (immutable, hashed filenames) */
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
