import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry org + project — set via SENTRY_ORG and SENTRY_PROJECT env vars
  silent:             !process.env.CI,        // suppress upload noise in local builds
  widenClientFileUpload: true,                // upload source maps for better stack traces
  disableLogger:      true,                   // tree-shake Sentry logger in prod builds
  automaticVercelMonitors: true,              // auto-create Vercel cron monitors
});
