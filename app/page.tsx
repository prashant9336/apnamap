"use client";
import Link from "next/link";
import { motion } from "framer-motion";

const FEATURES = [
  { icon: "🚶", title: "Walk View", desc: "Scroll through your city like you're physically walking the streets." },
  { icon: "📍", title: "GPS-Powered", desc: "Real-time detection. See shops sorted by actual distance from you." },
  { icon: "🔥", title: "Live Offers", desc: "Active deals flash on storefronts. Discover before they expire." },
  { icon: "💬", title: "Instant Connect", desc: "Call or WhatsApp any shop directly from the app. No friction." },
];

const STATS = [
  { value: "500+", label: "Shops" },
  { value: "3", label: "Cities" },
  { value: "₹0", label: "Listing Fee" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* NAV */}
      <nav className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "var(--accent)" }}>📍</div>
          <span className="font-syne text-xl font-bold text-white" style={{ letterSpacing: "-0.4px" }}>ApnaMap</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-semibold" style={{ color: "var(--t2)" }}>Login</Link>
          <Link href="/explore" className="px-4 py-2 rounded-full text-sm font-bold text-white" style={{ background: "var(--accent)", boxShadow: "0 0 20px rgba(255,94,26,0.35)" }}>
            Explore City →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-20 text-center max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6" style={{ background: "rgba(255,94,26,0.1)", border: "1px solid rgba(255,94,26,0.25)", color: "var(--accent)" }}>
            🇮🇳 Built for Bharat — Starting with Prayagraj
          </div>
          <h1 className="font-syne text-5xl font-black leading-tight mb-4" style={{ letterSpacing: "-1.5px" }}>
            Walk Your City.<br />
            <span style={{ color: "var(--accent)" }}>Unlock Nearby Offers.</span>
          </h1>
          <p className="text-lg mb-10 leading-relaxed max-w-md mx-auto" style={{ color: "var(--t2)" }}>
            India's first scrollable city experience. Discover real shops, live deals,
            and local markets — all powered by your GPS.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/explore" className="px-8 py-4 rounded-2xl text-base font-bold text-white" style={{ background: "linear-gradient(135deg,#FF5E1A,#FF7A40)", boxShadow: "0 0 32px rgba(255,94,26,0.4)" }}>
              🚶 Start Walking
            </Link>
            <Link href="/vendor/onboarding" className="px-8 py-4 rounded-2xl text-base font-bold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--t1)" }}>
              Add My Shop — Free
            </Link>
          </div>
        </motion.div>

        {/* STATS */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex gap-10 mt-14">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-syne text-3xl font-black" style={{ color: "var(--accent)" }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: "var(--t3)" }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </main>

      {/* FEATURES */}
      <section className="px-5 py-16 max-w-4xl mx-auto w-full">
        <h2 className="font-syne text-2xl font-black text-center mb-10" style={{ letterSpacing: "-0.5px" }}>
          This is not just another app
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-syne font-bold text-base mb-2">{f.title}</div>
              <div className="text-sm leading-relaxed" style={{ color: "var(--t2)" }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VENDOR CTA */}
      <section className="px-5 py-16 text-center" style={{ background: "rgba(255,94,26,0.04)", borderTop: "1px solid rgba(255,94,26,0.12)" }}>
        <div className="text-4xl mb-4">🏪</div>
        <h2 className="font-syne text-2xl font-black mb-3">Own a shop in Prayagraj?</h2>
        <p className="text-sm mb-8 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--t2)" }}>
          List for free. Thousands of customers walking your street every day will see your shop and offers.
        </p>
        <Link href="/vendor/onboarding" className="inline-flex px-8 py-3 rounded-full font-bold text-white" style={{ background: "var(--accent)", boxShadow: "0 0 24px rgba(255,94,26,0.35)" }}>
          Add Your Shop Free →
        </Link>
      </section>

      <footer className="text-center py-6 text-xs" style={{ color: "var(--t3)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        © {new Date().getFullYear()} ApnaMap · Made with ❤️ in India
      </footer>
    </div>
  );
}
