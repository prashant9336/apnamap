import { createBrowserClient } from "@supabase/ssr";

// Module-level singleton. createBrowserClient is designed to be instantiated
// once per browser session. Calling it multiple times creates independent
// GoTrueClient instances that compete for the same localStorage lock
// ("sb-...-auth-token"), producing the recurring auth lock error in Sentry.
// All calls to createClient() in the app return this same object, so auth
// operations queue through one internal serialiser — no lock conflicts possible.
let instance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!instance) {
    instance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
  return instance;
}