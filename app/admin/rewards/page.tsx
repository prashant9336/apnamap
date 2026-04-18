"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type RewardState = "active" | "redeemed" | "expired";

interface RewardRow {
  id: string;
  user_email: string;
  locality_name: string;
  streak_count: number;
  offer_title: string;
  shop_name: string;
  unlocked_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  state: RewardState;
}

interface Stats {
  total: number;
  active: number;
  redeemed: number;
  expired: number;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const d = Math.ceil(ms / 86_400_000);
  return d === 1 ? "1d left" : `${d}d left`;
}

const STATE_STYLE: Record<RewardState, { bg: string; color: string; border: string; label: string }> = {
  active:   { bg: "rgba(31,187,90,0.10)",  color: "#1FBB5A", border: "rgba(31,187,90,0.25)",  label: "Active"   },
  redeemed: { bg: "rgba(99,102,241,0.10)", color: "#818cf8", border: "rgba(99,102,241,0.25)", label: "Redeemed" },
  expired:  { bg: "rgba(239,68,68,0.09)",  color: "#f87171", border: "rgba(239,68,68,0.22)",  label: "Expired"  },
};

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [stats,   setStats]   = useState<Stats>({ total: 0, active: 0, redeemed: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"all" | RewardState>("all");

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? "";
      fetch("/api/admin/rewards", { headers: tok ? { Authorization: `Bearer ${tok}` } : {} })
        .then(r => r.json())
        .then(d => {
          setRewards(d.rewards ?? []);
          setStats(d.stats ?? { total: 0, active: 0, redeemed: 0, expired: 0 });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, []);

  const shown = filter === "all" ? rewards : rewards.filter(r => r.state === filter);

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/admin/dashboard" className="text-xl leading-none">←</Link>
        <span className="font-syne font-black text-base flex-1">Streak Rewards</span>
        <span className="text-xs" style={{ color: "var(--t3)" }}>{rewards.length} total</span>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total",    val: stats.total,    key: "all" as const,      color: "var(--t1)" },
            { label: "Active",   val: stats.active,   key: "active" as const,   color: "#1FBB5A"   },
            { label: "Redeemed", val: stats.redeemed, key: "redeemed" as const, color: "#818cf8"   },
            { label: "Expired",  val: stats.expired,  key: "expired" as const,  color: "#f87171"   },
          ].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className="p-2.5 rounded-xl text-left transition-all"
              style={{
                background: filter === s.key ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                border: filter === s.key ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.06)",
              }}>
              <div className="text-xl font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Loading skeletons */}
        {loading && [1,2,3].map(i => <div key={i} className="h-24 rounded-2xl shimmer" />)}

        {/* Empty */}
        {!loading && shown.length === 0 && (
          <div className="text-center py-16" style={{ color: "var(--t2)" }}>
            <div className="text-4xl mb-3">🎁</div>
            <p className="font-semibold">No rewards in this category</p>
          </div>
        )}

        {/* Reward rows */}
        {!loading && shown.map(r => {
          const sc = STATE_STYLE[r.state];
          return (
            <div key={r.id} className="p-4 rounded-2xl"
              style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-syne font-bold text-sm">{r.offer_title}</p>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {sc.label}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                    at {r.shop_name} · {r.locality_name}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold" style={{ color: "var(--t2)" }}>🔥 {r.streak_count}-day streak</p>
                  {r.state === "active" && r.expires_at && (
                    <p className="text-[10px] mt-0.5" style={{ color: "#E8A800" }}>{daysUntil(r.expires_at)}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-[10px]" style={{ color: "var(--t3)" }}>
                  👤 {r.user_email || "—"}
                </span>
                <span className="text-[10px]" style={{ color: "var(--t3)" }}>
                  🔓 Unlocked {fmtDate(r.unlocked_at)}
                </span>
                {r.redeemed_at && (
                  <span className="text-[10px]" style={{ color: "#818cf8" }}>
                    ✓ Redeemed {fmtDate(r.redeemed_at)}
                  </span>
                )}
                {r.expires_at && r.state !== "redeemed" && (
                  <span className="text-[10px]" style={{ color: r.state === "expired" ? "#f87171" : "var(--t3)" }}>
                    ⏰ Expires {fmtDate(r.expires_at)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
