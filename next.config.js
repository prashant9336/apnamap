/** @type {import('next').NextConfig} */

const withPWA    = require("@ducanh2912/next-pwa").default;
const { withSentryConfig } = require("@sentry/nextjs");

/* ── PWA / Workbox configuration ────────────────────────────────── */
const pwaConfig = {
  dest: "public",                     // sw.js + workbox files land in public/

  // Aggressive caching for the walk-view heavy app
  cacheOnFrontEndNav:          true,  // cache pages on client-side navigation
  aggressiveFrontEndNavCaching: true, // also cache prefetched pages
  reloadOnOnline:              true,  // reload stale page when back online

  // Disable in development — service workers conflict with HMR
  disable: process.env.NODE_ENV === "development",

  workboxOptions: {
    disableDevLogs: true,

    // Runtime caching on top of the default Next.js asset caching
    runtimeCaching: [
      /* Supabase storage (shop logos, cover images) — Cache First, 30 days */
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:    "supabase-images",
          expiration:   { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* Unsplash images — Cache First, 7 days */
      {
        urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:  "unsplash-images",
          expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* Google Fonts — Cache First forever (fonts don't change) */
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:  "google-fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* PWA icons — Cache First forever (generated PNG, never changes) */
      {
        urlPattern: /^\/api\/icon(\?.*)?$/i,
        handler: "CacheFirst",
        options: {
          cacheName:  "pwa-icons",
          expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },

      /* App API routes — Network First, fall back to cache for 24 h */
      {
        urlPattern: /^\/api\/(?!icon).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName:  "api-responses",
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
          networkTimeoutSeconds: 10,
        },
      },

      /* All other same-origin fetches — StaleWhileRevalidate */
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName:  "next-static",
          expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
};

/* ── Core Next.js config ─────────────────────────────────────────── */
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
      allowedOrigins: ["localhost:3000", "apnamap.com", "*.apnamap.com"],
    },
    instrumentationHook: true,
  },
};

const baseConfig = withPWA(pwaConfig)(nextConfig);

module.exports = withSentryConfig(baseConfig, {
  // Suppress Sentry CLI output during builds
  silent: true,

  // Upload source maps only if SENTRY_AUTH_TOKEN is set (optional but recommended)
  // Get token from: https://sentry.io/settings/account/api/auth-tokens/
  authToken: process.env.SENTRY_AUTH_TOKEN,

  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? "apnamap",

  // Disable source map upload if token is missing (won't break the build)
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,

  // Tree-shake Sentry debug code from client bundle
  hideSourceMaps: true,
  widenClientFileUpload: true,
});
