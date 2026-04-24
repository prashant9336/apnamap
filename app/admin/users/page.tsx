"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface UserRow {
  id: string;
  name: string | null;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
  vendor: { id: string; mobile: string | null; is_approved: boolean; must_change_password: boolean } | null;
}

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  active:    { color: "#1FBB5A", bg: "rgba(31,187,90,0.10)",  border: "rgba(31,187,90,0.25)"  },
  suspended: { color: "#E8A800", bg: "rgba(232,168,0,0.10)",  border: "rgba(232,168,0,0.25)"  },
  deleted:   { color: "#f87171", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)"  },
};
const ROLE_STYLE: Record<string, { color: string; bg: string }> = {
  admin:    { color: "var(--accent)", bg: "rgba(255,94,26,0.14)"  },
  vendor:   { color: "#1FBB5A",       bg: "rgba(31,187,90,0.12)"  },
  customer: { color: "var(--t2)",     bg: "rgba(255,255,255,0.06)" },
};

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [token,   setToken]   = useState("");
  const [search,  setSearch]  = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [acting,  setActing]  = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ user: UserRow; action: string; label: string } | null>(null);
  const [reason, setReason] = useState("");
  const [error,  setError]  = useState("");

  const sb = createClient();

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? "";
      setToken(tok);
      loadUsers(tok, "all", "");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsers(tok: string, role: string, q: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (role !== "all") params.set("role", role);
    if (q.trim()) params.set("search", q.trim());
    const res = await fetch(`/api/admin/users?${params}`, {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    });
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users ?? []);
    }
    setLoading(false);
  }

  function applyFilter(role: string, q: string) {
    setRoleFilter(role);
    loadUsers(token, role, q);
  }

  async function doAction() {
    if (!actionModal) return;
    setActing(actionModal.user.id);
    setError("");

    const body: Record<string, unknown> = {
      user_id: actionModal.user.id,
      action:  actionModal.action,
    };
    if (reason.trim()) body.reason = reason.trim();

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Failed"); setActing(null); return; }
    setUsers(p => p.map(u => u.id === actionModal.user.id ? { ...u, ...d.user } : u));
    setActing(null);
    setActionModal(null);
    setReason("");
  }

  async function changeRole(userId: string, newRole: string) {
    setActing(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ user_id: userId, action: "change_role", role: newRole }),
    });
    const d = await res.json();
    if (res.ok) setUsers(p => p.map(u => u.id === userId ? { ...u, ...d.user } : u));
    setActing(null);
  }

  const counts = {
    all:      users.length,
    admin:    users.filter(u => u.role === "admin").length,
    vendor:   users.filter(u => u.role === "vendor").length,
    customer: users.filter(u => u.role === "customer").length,
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <Link href="/admin/dashboard" className="text-xl">←</Link>
        <p className="font-syne font-black text-base flex-1">Users</p>
        <span className="text-xs" style={{ color: "var(--t3)" }}>{users.length}</span>
      </div>

      <div className="px-4 py-3 pb-page space-y-3">
        {/* Role filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all","vendor","customer","admin"] as const).map(r => (
            <button key={r} onClick={() => applyFilter(r, search)}
              className="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0"
              style={{
                background: roleFilter === r ? "var(--accent)" : "rgba(255,255,255,0.06)",
                color: roleFilter === r ? "#fff" : "var(--t2)",
                border: roleFilter === r ? "none" : "1px solid rgba(255,255,255,0.09)",
              }}>
              {r.charAt(0).toUpperCase() + r.slice(1)} ({counts[r as keyof typeof counts] ?? "—"})
            </button>
          ))}
        </div>

        {/* Search */}
        <input value={search}
          onChange={e => { setSearch(e.target.value); loadUsers(token, roleFilter, e.target.value); }}
          placeholder="Search by name or phone…"
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />

        {/* Skeleton */}
        {loading && [1,2,3].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}

        {/* User list */}
        {!loading && users.map(user => {
          const roleSt   = ROLE_STYLE[user.role]    ?? ROLE_STYLE.customer;
          const statusSt = STATUS_STYLE[user.status] ?? STATUS_STYLE.active;
          const isActing = acting === user.id;

          return (
            <div key={user.id} className="rounded-xl px-3.5 py-3"
              style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ background: roleSt.bg, color: roleSt.color }}>
                  {(user.name ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.name ?? "No name"}</p>
                  <p className="text-[10px]" style={{ color: "var(--t3)" }}>
                    {user.phone ?? user.vendor?.mobile ?? "—"} · {new Date(user.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {/* Role badge */}
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: roleSt.bg, color: roleSt.color, border: "1px solid rgba(255,255,255,0.08)" }}>
                    {user.role}
                  </span>
                  {/* Status badge */}
                  {user.status !== "active" && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: statusSt.bg, color: statusSt.color, border: `1px solid ${statusSt.border}` }}>
                      {user.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions row */}
              <div className="flex flex-wrap gap-2 mt-2">
                {/* Role selector */}
                <select value={user.role}
                  onChange={e => changeRole(user.id, e.target.value)}
                  disabled={isActing}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg outline-none cursor-pointer"
                  style={{ background: roleSt.bg, color: roleSt.color, border: "1px solid rgba(255,255,255,0.08)", opacity: isActing ? 0.5 : 1 }}>
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="admin">Admin</option>
                </select>

                {/* Status actions */}
                {user.status === "active" && (
                  <button
                    onClick={() => { setActionModal({ user, action: "suspend", label: "Suspend Account" }); setReason(""); setError(""); }}
                    disabled={isActing}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{ background: "rgba(232,168,0,0.08)", color: "#E8A800", border: "1px solid rgba(232,168,0,0.22)", opacity: isActing ? 0.5 : 1 }}>
                    ⛔ Suspend
                  </button>
                )}
                {(user.status === "suspended" || user.status === "deleted") && (
                  <button
                    onClick={() => { setActionModal({ user, action: "reactivate", label: "Reactivate Account" }); setReason(""); setError(""); }}
                    disabled={isActing}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{ background: "rgba(31,187,90,0.08)", color: "#1FBB5A", border: "1px solid rgba(31,187,90,0.22)", opacity: isActing ? 0.5 : 1 }}>
                    ✓ Reactivate
                  </button>
                )}
                {user.status === "active" && (
                  <button
                    onClick={() => { setActionModal({ user, action: "delete", label: "Delete Account" }); setReason(""); setError(""); }}
                    disabled={isActing}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)", opacity: isActing ? 0.5 : 1 }}>
                    Delete
                  </button>
                )}

                {/* Temp password indicator */}
                {user.vendor?.must_change_password && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(232,168,0,0.10)", color: "#E8A800", border: "1px solid rgba(232,168,0,0.25)" }}>
                    temp pw
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {!loading && users.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--t2)" }}>
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>

      {/* ── Action confirm modal ── */}
      {actionModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
          onClick={() => setActionModal(null)}>
          <div style={{ background: "#0C0F18", borderRadius: "20px 20px 0 0", padding: "20px 18px", width: "100%", boxSizing: "border-box" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 18px" }} />
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: "#F2F5FF", marginBottom: 4 }}>
              {actionModal.label}
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginBottom: 16 }}>
              {actionModal.user.name ?? "This user"} · {actionModal.user.phone ?? actionModal.user.vendor?.mobile ?? "—"}
            </p>
            {error && <p style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>{error}</p>}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                Reason (optional)
              </label>
              <input value={reason} onChange={e => setReason(e.target.value)}
                placeholder="e.g. Abuse, duplicate account, vendor request…"
                style={{ width: "100%", padding: "11px 13px", borderRadius: 11, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setActionModal(null)} style={{ flex: 1, padding: "13px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
              <button onClick={doAction} disabled={!!acting} style={{ flex: 2, padding: "13px", borderRadius: 12, background: acting ? "rgba(255,94,26,0.40)" : "#FF5E1A", color: "#fff", border: "none", cursor: acting ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                {acting ? "Working…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
