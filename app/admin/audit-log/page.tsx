"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface LogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_val: Record<string, unknown>;
  after_val: Record<string, unknown>;
  note: string | null;
  created_at: string;
  admin: { name: string | null; phone: string | null } | null;
}

const ACTION_COLOR: Record<string, string> = {
  shop_approve:     "#1FBB5A",
  shop_reject:      "#E8A800",
  shop_delete:      "#f87171",
  shop_restore:     "#3B82F6",
  shop_edit:        "var(--t2)",
  shop_toggle_active: "var(--t2)",
  vendor_suspend:   "#E8A800",
  vendor_reactivate:"#1FBB5A",
  category_edit:    "var(--t2)",
  category_disable: "#f87171",
  category_enable:  "#1FBB5A",
  category_merge:   "#a78bfa",
  category_create:  "#3B82F6",
  role_to_admin:    "#FF5E1A",
  role_to_vendor:   "#1FBB5A",
  role_to_customer: "var(--t3)",
};

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)   return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400)return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AuditLogPage() {
  const [logs,        setLogs]        = useState<LogRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [token,       setToken]       = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [total,       setTotal]       = useState(0);
  const [offset,      setOffset]      = useState(0);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const LIMIT = 50;

  const sb = createClient();

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? "";
      setToken(tok);
      fetchLogs(tok, "", "", 0);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLogs(tok: string, entity: string, action: string, off: number) {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
    if (entity) params.set("entity_type", entity);
    if (action) params.set("action", action);
    const res = await fetch(`/api/admin/audit-logs?${params}`, {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    });
    if (res.ok) {
      const d = await res.json();
      setLogs(d.logs ?? []);
      setTotal(d.total ?? 0);
    }
    setLoading(false);
  }

  function applyFilters(entity: string, action: string) {
    setEntityFilter(entity);
    setActionFilter(action);
    setOffset(0);
    fetchLogs(token, entity, action, 0);
  }

  function changePage(dir: 1 | -1) {
    const next = offset + dir * LIMIT;
    setOffset(next);
    fetchLogs(token, entityFilter, actionFilter, next);
  }

  const ENTITY_OPTIONS = ["", "shop", "profile", "category", "offer"];
  const ACTION_OPTIONS = [
    "", "shop_approve", "shop_reject", "shop_delete", "shop_restore", "shop_edit",
    "vendor_suspend", "vendor_reactivate", "category_edit", "category_merge",
    "category_disable", "category_enable", "category_create",
  ];

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <Link href="/admin/dashboard" className="text-xl">←</Link>
        <span className="font-syne font-black text-base flex-1">Audit Log</span>
        <span className="text-xs" style={{ color: "var(--t3)" }}>{total} entries</span>
      </div>

      <div className="px-4 pt-4 pb-page space-y-3">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <select value={entityFilter}
            onChange={e => applyFilters(e.target.value, actionFilter)}
            className="px-2.5 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--t2)" }}>
            {ENTITY_OPTIONS.map(v => <option key={v} value={v}>{v || "All Entities"}</option>)}
          </select>
          <select value={actionFilter}
            onChange={e => applyFilters(entityFilter, e.target.value)}
            className="px-2.5 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--t2)" }}>
            {ACTION_OPTIONS.map(v => <option key={v} value={v}>{v || "All Actions"}</option>)}
          </select>
        </div>

        {/* Skeleton */}
        {loading && [1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl shimmer" />)}

        {/* Log entries */}
        {!loading && logs.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--t2)" }}>
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm">No audit logs found</p>
          </div>
        )}

        {!loading && logs.map(log => {
          const acColor = ACTION_COLOR[log.action] ?? "var(--t2)";
          const isOpen  = expanded === log.id;

          return (
            <div key={log.id} className="rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <button className="w-full px-4 py-3 text-left"
                onClick={() => setExpanded(isOpen ? null : log.id)}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold" style={{ color: acColor }}>{log.action}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.05)", color: "var(--t3)" }}>
                        {log.entity_type}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--t3)" }}>
                      by {log.admin?.name ?? "admin"} · {timeAgo(log.created_at)}
                    </p>
                    {log.note && (
                      <p className="text-[11px] mt-1 italic" style={{ color: "var(--t2)" }}>{log.note}</p>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "var(--t3)", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {log.entity_id && (
                    <p className="text-[10px] font-mono mt-2" style={{ color: "var(--t3)" }}>
                      entity_id: {log.entity_id}
                    </p>
                  )}
                  {Object.keys(log.before_val).length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--t3)" }}>Before</p>
                      <pre className="text-[10px] rounded-lg p-2 overflow-x-auto"
                        style={{ background: "rgba(239,68,68,0.07)", color: "#f87171", fontFamily: "monospace" }}>
                        {JSON.stringify(log.before_val, null, 2)}
                      </pre>
                    </div>
                  )}
                  {Object.keys(log.after_val).length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--t3)" }}>After</p>
                      <pre className="text-[10px] rounded-lg p-2 overflow-x-auto"
                        style={{ background: "rgba(31,187,90,0.07)", color: "#1FBB5A", fontFamily: "monospace" }}>
                        {JSON.stringify(log.after_val, null, 2)}
                      </pre>
                    </div>
                  )}
                  <p className="text-[9px]" style={{ color: "var(--t3)" }}>
                    {new Date(log.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => changePage(-1)} disabled={offset === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.05)", color: offset === 0 ? "var(--t3)" : "var(--t1)", opacity: offset === 0 ? 0.4 : 1 }}>
              ← Prev
            </button>
            <span className="text-xs" style={{ color: "var(--t3)" }}>
              {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
            </span>
            <button onClick={() => changePage(1)} disabled={offset + LIMIT >= total}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.05)", color: offset + LIMIT >= total ? "var(--t3)" : "var(--t1)", opacity: offset + LIMIT >= total ? 0.4 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
