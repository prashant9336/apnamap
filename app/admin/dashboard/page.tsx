import { createAdminClient } from "@/lib/supabase/server";
import DashboardShell from "./DashboardShell";

/**
 * Server component — fetches all initial data before the page HTML is sent.
 * The client shell receives pre-loaded props and renders the full dashboard
 * immediately on first paint: no skeleton, no init() waterfall, no flicker.
 *
 * Auth is already enforced by app/admin/layout.tsx.
 * Data fetch is wrapped in try/catch — transient DB errors degrade to empty
 * state rather than crashing to the error boundary.
 */
export default async function AdminDashboardPage() {
  const EMPTY = {
    localities: [] as Array<{ id: string; name: string }>,
    categories: [] as Array<{ id: string; name: string; icon: string }>,
    stats: { shops: 0, pending: 0, requests: 0, vendors: 0, users: 0, newUsers: 0 },
  };

  try {
    const admin = createAdminClient();
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [locRes, catRes, s, p, r, v, u, nu] = await Promise.all([
      admin.from("localities").select("id, name").order("priority"),
      admin.from("categories").select("id, name, icon").order("name"),
      admin.from("shops").select("*", { count: "exact", head: true }).is("deleted_at", null),
      admin.from("shops").select("*", { count: "exact", head: true }).eq("approval_status", "pending").is("deleted_at", null),
      admin.from("vendor_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("vendors").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer").gte("created_at", weekAgo),
    ]);

    return (
      <DashboardShell
        localities={(locRes.data ?? []) as Array<{ id: string; name: string }>}
        categories={(catRes.data ?? []) as Array<{ id: string; name: string; icon: string }>}
        stats={{
          shops:    s.count  ?? 0,
          pending:  p.count  ?? 0,
          requests: r.count  ?? 0,
          vendors:  v.count  ?? 0,
          users:    u.count  ?? 0,
          newUsers: nu.count ?? 0,
        }}
      />
    );
  } catch {
    // DB unreachable or service role key missing — render shell with empty data.
    // Admin can still use the tab forms; stats will show 0.
    return <DashboardShell {...EMPTY} />;
  }
}
