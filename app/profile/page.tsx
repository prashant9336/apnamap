"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import type { Profile } from "@/types";

/* Inline SVG chevron — looks far better than the › HTML entity */
function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: "rgba(255,255,255,0.22)", flexShrink: 0 }}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => { setProfile(data); setLoading(false); });
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <AppShell activeTab="profile">
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
        <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h1 className="font-syne font-black text-xl" style={{ letterSpacing: "-0.4px" }}>Profile</h1>
        </div>

        <div className="flex-1 overflow-y-scroll scroll-none px-4 py-4">

          {/* Loading skeleton — matches actual layout shape */}
          {loading && (
            <div className="space-y-3">
              <div className="h-24 rounded-2xl shimmer" />
              <div className="h-14 rounded-xl shimmer" />
              <div className="h-14 rounded-xl shimmer" />
              <div className="h-14 rounded-xl shimmer" />
            </div>
          )}

          {/* Logged out state */}
          {!loading && !profile && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">👤</div>
              <h2 className="font-syne font-bold text-xl mb-2">Join ApnaMap</h2>
              <p className="text-sm mb-6" style={{ color: "var(--t2)" }}>Save shops, track offers, get notified</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <Link href="/auth/signup"
                  className="py-3.5 rounded-xl font-bold text-white text-center"
                  style={{ background: "var(--accent)" }}>
                  Sign up free
                </Link>
                <Link href="/auth/login"
                  className="py-3.5 rounded-xl font-semibold text-center"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }}>
                  Log in
                </Link>
              </div>
            </div>
          )}

          {/* Logged in */}
          {!loading && profile && (
            <>
              {/* Avatar + name card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl mb-4"
                style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#FF5E1A,#E8A800)", color: "#fff" }}>
                  {(profile.name ?? "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-syne font-black text-lg truncate">{profile.name ?? "User"}</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: "rgba(255,94,26,0.12)", color: "var(--accent)" }}>
                    {profile.role}
                  </span>
                </div>
              </div>

              {/* Menu items — grouped card */}
              <div className="rounded-2xl overflow-hidden mb-4"
                style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  { icon: "❤️", label: "Saved shops & offers", href: "/saved" },
                  ...(profile.role === "vendor" ? [{ icon: "🏪", label: "My Shop", href: "/my-shop" }] : []),
                  ...(profile.role === "admin"  ? [{ icon: "🛡️", label: "Admin Panel", href: "/admin/dashboard" }] : []),
                ].map((item, i, arr) => (
                  <Link key={item.label} href={item.href}
                    className="flex items-center gap-3 px-4"
                    style={{
                      minHeight: 56,
                      paddingTop: 14,
                      paddingBottom: 14,
                      borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    }}>
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 text-sm font-semibold">{item.label}</span>
                    <Chevron />
                  </Link>
                ))}

                {/* Coming soon row */}
                <div className="flex items-center gap-3 px-4"
                  style={{ minHeight: 56, paddingTop: 14, paddingBottom: 14, opacity: 0.45, pointerEvents: "none" }}>
                  <span className="text-xl flex-shrink-0">📍</span>
                  <span className="flex-1 text-sm font-semibold">My city &amp; location</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(255,255,255,0.07)", color: "var(--t3)" }}>
                    Soon
                  </span>
                </div>
              </div>

              {/* Vendor CTA */}
              {profile.role === "customer" && (
                <div className="p-4 rounded-2xl mb-4 text-center"
                  style={{ background: "rgba(255,94,26,0.06)", border: "1px solid rgba(255,94,26,0.18)" }}>
                  <p className="text-sm font-semibold mb-1">Own a shop?</p>
                  <p className="text-xs mb-3" style={{ color: "var(--t2)" }}>List it free on ApnaMap</p>
                  <Link href="/vendor/onboarding"
                    className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
                    style={{ background: "var(--accent)" }}>
                    Become a Vendor →
                  </Link>
                </div>
              )}

              <button onClick={handleLogout}
                className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                <span>↩</span> Log Out
              </button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
