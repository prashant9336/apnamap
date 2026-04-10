import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production",

  // Capture 100% of server errors, 5% of traces (API perf monitoring)
  tracesSampleRate: 0.05,

  // Attach request URL + method to every server error automatically
  sendDefaultPii: false,
});
