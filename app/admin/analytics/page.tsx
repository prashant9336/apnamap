"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ── Types ──────────────────────────────────────────────────────────────── */
interface ShopCounts { total: number; pending: number; approved: number; rejected: number; no_offer: number; }
interface NoOfferShop { id: string; name: string; slug: string; view_count: number; category: { name: string; icon: string } | null; locality: { name: string } | null; }
interface LongPending { id: string; name: string; created_at: string; category: { name: string; icon: string } | null; locality: { name: string } | null; }
interface TopShop     { id: string; name: string; slug: string; views: number; }
interface TopLocality { id: string; name: string; views: number; }
interface DailyEvent  { date: string; count: number; }
interface AuditEntry  { action: string; entity_type: string; entity_id: string | null; admin_id: string; note: string | null; created_at: string; }
interface Analytics {
  period_days: number;
  shop_counts: ShopCounts;
  insights: { no_offer_shops: NoOfferShop[]; long_pending: LongPending[]; };
  unique_visitors: number;
  total_events: number;
  event_counts: Record<string, number>;
  daily_events: DailyEvent[];
  top_shops: TopShop[];
  top_localities: TopLocality[];
  recent_actions: AuditEntry[];
}

/* ── Style tokens ───────────────────────────────────────────────────────── */
const CARD = { background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 14 } as const;
const CARD_LG = { ...CARD, borderRadius: 18, padding: 18 } as const;
const LABEL: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 };

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "today"; if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`; return `${Math.floor(d / 30)}mo ago`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div style={CARD}>
      <div style={{ fontSize: 26, fontWeight: 900, color, fontFamily: "'Syne',sans-serif" }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

/* ── Mini bar chart (CSS only) ──────────────────────────────────────────── */
function BarChart({ data }: { data: DailyEvent[] }) {
  if (!data.length) return <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: 20 }}>No data</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80, padding: "0 4px" }}>
      {data.map(d => (
        <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ width: "100%", height: `${Math.max((d.count / max) * 70, 3)}px`, background: "rgba(255,94,26,0.60)", borderRadius: "3px 3px 0 0", transition: "height 0.4s ease" }} title={`${d.date}: ${d.count} events`} />
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", writingMode: "vertical-rl", textOrientation: "mixed" }}>{fmtDate(d.date)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days,    setDays]    = useState(7);

  async function load(d: number) {
    setLoading(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const tok = session?.access_token ?? "";
      const res = await fetch(`/api/admin/analytics?days=${d}`, {
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      });
      const json = await res.json();
      setData(json);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { load(days); }, [days]);

  const sc = data?.shop_counts;

  return (
    <div style={{ minHeight: "100dvh", background: "#05070C", paddingBottom: 40 }}>

      {/* ── Header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(5,7,12,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", paddingTop: "calc(12px + env(safe-area-inset-top,0px))", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/admin/dashboard" style={{ fontSize: 20, color: "var(--t2)", textDecoration: "none" }}>←</Link>
        <span className="font-syne" style={{ fontWeight: 900, fontSize: 15, flex: 1, color: "#F2F5FF" }}>Analytics</span>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 7, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: days === d ? "#FF5E1A" : "rgba(255,255,255,0.06)", color: days === d ? "#fff" : "rgba(255,255,255,0.40)", border: "none", cursor: "pointer" }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px" }} className="space-y-4">

        {loading && [1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 80, borderRadius: 14 }} />)}

        {!loading && data && (<>

          {/* ── Shop state counts ── */}
          <section>
            <p style={LABEL}>Shops</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <StatCard label="Total"    value={sc?.total    ?? 0} color="#F2F5FF" />
              <StatCard label="Pending"  value={sc?.pending  ?? 0} color="#a78bfa" />
              <StatCard label="Approved" value={sc?.approved ?? 0} color="#1FBB5A" />
              <StatCard label="Rejected" value={sc?.rejected ?? 0} color="#f87171" />
              <StatCard label="No Offer" value={sc?.no_offer ?? 0} color="#E8A800" sub="approved shops" />
              <StatCard label="Visitors" value={data.unique_visitors} color="#3B82F6" sub={`${days}d`} />
            </div>
          </section>

          {/* ── User activity ── */}
          <section>
            <p style={LABEL}>Activity — last {days} day{days !== 1 ? "s" : ""} ({data.total_events.toLocaleString()} events)</p>
            <div style={CARD_LG}>
              <BarChart data={data.daily_events} />
              {Object.keys(data.event_counts).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                  {Object.entries(data.event_counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <span key={type} style={{ fontSize: 11, padding: "4px 9px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {type}: <strong style={{ color: "#F2F5FF" }}>{count.toLocaleString()}</strong>
                      </span>
                    ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Smart insights ── */}
          {(data.insights.no_offer_shops.length > 0 || data.insights.long_pending.length > 0) && (
            <section>
              <p style={LABEL}>Smart Insights</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.insights.long_pending.length > 0 && (
                  <div style={{ ...CARD, border: "1px solid rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.05)" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>
                      ⏳ {data.insights.long_pending.length} shops pending &gt; 24h
                    </p>
                    {data.insights.long_pending.map(s => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <div>
                          <p style={{ fontSize: 12, color: "#F2F5FF" }}>{s.category?.icon ?? "🏪"} {s.name}</p>
                          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{s.locality?.name ?? "—"} · {daysAgo(s.created_at)}</p>
                        </div>
                        <Link href="/admin/queue" style={{ fontSize: 11, color: "#a78bfa", textDecoration: "none", padding: "4px 10px", borderRadius: 8, background: "rgba(167,139,250,0.10)" }}>Review →</Link>
                      </div>
                    ))}
                  </div>
                )}
                {data.insights.no_offer_shops.length > 0 && (
                  <div style={{ ...CARD, border: "1px solid rgba(232,168,0,0.25)", background: "rgba(232,168,0,0.04)" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#E8A800", marginBottom: 8 }}>
                      ⚠ {data.insights.no_offer_shops.length} approved shops with no active offers
                    </p>
                    {data.insights.no_offer_shops.slice(0, 8).map(s => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <div>
                          <p style={{ fontSize: 12, color: "#F2F5FF" }}>{s.category?.icon ?? "🏪"} {s.name}</p>
                          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{s.locality?.name ?? "—"} · 👀 {s.view_count}</p>
                        </div>
                        <a href={`/shop/${s.slug}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: "#E8A800", textDecoration: "none", padding: "4px 10px", borderRadius: 8, background: "rgba(232,168,0,0.10)" }}>
                          ↗ View
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Top shops ── */}
          {data.top_shops.length > 0 && (
            <section>
              <p style={LABEL}>Top shops by views ({days}d)</p>
              <div style={CARD_LG}>
                {data.top_shops.map((s, i) => {
                  const pct = data.top_shops[0].views > 0 ? (s.views / data.top_shops[0].views) * 100 : 0;
                  return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < data.top_shops.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", width: 18, textAlign: "right" }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: "#F2F5FF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#FF5E1A", borderRadius: 2 }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#FF5E1A", flexShrink: 0 }}>{s.views.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Top localities ── */}
          {data.top_localities.length > 0 && (
            <section>
              <p style={LABEL}>Top localities ({days}d)</p>
              <div style={CARD_LG}>
                {data.top_localities.map((l, i) => {
                  const pct = data.top_localities[0].views > 0 ? (l.views / data.top_localities[0].views) * 100 : 0;
                  return (
                    <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < data.top_localities.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", width: 18, textAlign: "right" }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: "#F2F5FF" }}>{l.name}</p>
                        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#3B82F6", borderRadius: 2 }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6", flexShrink: 0 }}>{l.views.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Live activity feed ── */}
          {data.recent_actions.length > 0 && (
            <section>
              <p style={LABEL}>Recent admin actions</p>
              <div style={CARD_LG}>
                {data.recent_actions.map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: i < data.recent_actions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: "#F2F5FF" }}>
                        <span style={{ color: actionColor(a.action), fontWeight: 700 }}>{a.action}</span>
                        {" "}<span style={{ color: "rgba(255,255,255,0.40)" }}>{a.entity_type}</span>
                      </p>
                      {a.note && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>{a.note}</p>}
                    </div>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", flexShrink: 0, marginLeft: 8 }}>{daysAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </>)}
      </div>
    </div>
  );
}

function actionColor(action: string): string {
  if (action.includes("approve") || action.includes("activate")) return "#1FBB5A";
  if (action.includes("reject") || action.includes("delete") || action.includes("suspend")) return "#f87171";
  if (action.includes("bulk")) return "#FF5E1A";
  return "#a78bfa";
}
