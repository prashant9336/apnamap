"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { useProfile } from "@/hooks/useProfile";

/* ── Tab definitions ─────────────────────────────────────────────── */
const CUSTOMER_TABS = [
  { id: "walk",    href: "/explore",  icon: "🚶", label: "Walk"   },
  { id: "search",  href: "/search",   icon: "🔍", label: "Search" },
  { id: "offers",  href: "/offers",   icon: "🎯", label: "Offers" },
  { id: "saved",   href: "/saved",    icon: "❤️",  label: "Saved"  },
  { id: "profile", href: "/profile",  icon: "👤", label: "Me"     },
];

// Vendors replace "Search" with "My Shop" — they know their area, they need control
const VENDOR_TABS = [
  { id: "walk",    href: "/explore",  icon: "🚶", label: "Explore" },
  { id: "offers",  href: "/offers",   icon: "🎯", label: "Offers"  },
  { id: "myshop",  href: "/my-shop",  icon: "🏪", label: "My Shop" },
  { id: "saved",   href: "/saved",    icon: "❤️",  label: "Saved"   },
  { id: "profile", href: "/profile",  icon: "👤", label: "Me"      },
];

interface Props {
  children:   React.ReactNode;
  activeTab?: string;
}

export default function AppShell({ children, activeTab }: Props) {
  const pathname  = usePathname();
  const { isVendor, loading } = useProfile();

  // Use vendor tabs once role is confirmed; default to customer tabs while loading
  // to avoid layout shift (both have 5 tabs)
  const TABS = (!loading && isVendor) ? VENDOR_TABS : CUSTOMER_TABS;

  return (
    <div
      className="relative flex flex-col w-full max-w-[480px] mx-auto"
      style={{ height: "100dvh", background: "var(--bg)", overflow: "hidden" }}
    >
      {/* Page content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* PWA install prompt */}
      <InstallPrompt />

      {/* Bottom navigation */}
      <nav
        className="flex-shrink-0 flex items-stretch"
        style={{
          height:              66,
          background:          "rgba(5,7,12,0.97)",
          backdropFilter:      "blur(28px)",
          WebkitBackdropFilter:"blur(28px)",
          borderTop:           "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id || pathname === tab.href ||
            (tab.href === "/explore" && pathname === "/");

          // "My Shop" tab gets an accent glow to make it discoverable
          const isShopTab = tab.id === "myshop";

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-1 relative transition-colors duration-150"
              style={{ color: isActive ? (isShopTab ? "#FF5E1A" : "var(--accent)") : "rgba(255,255,255,0.26)" }}
            >
              {/* Active top bar */}
              {isActive && (
                <motion.div
                  layoutId="nav-bar"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-b-sm"
                  style={{
                    width:      22,
                    background: "var(--accent)",
                    boxShadow:  "0 0 6px var(--accent)",
                  }}
                />
              )}

              {/* Active bg glow */}
              {isActive && (
                <div className="absolute inset-0" style={{
                  background: "radial-gradient(ellipse at 50% 0%,rgba(255,94,26,0.10),transparent 55%)",
                }} />
              )}

              {/* Shop tab: subtle orange dot when not active to hint availability */}
              {isShopTab && !isActive && (
                <div
                  className="absolute top-2 right-[calc(50%-14px)]"
                  style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "#FF5E1A",
                    boxShadow:  "0 0 4px #FF5E1A",
                  }}
                />
              )}

              <motion.span
                className="text-[21px] leading-none relative z-10"
                animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {tab.icon}
              </motion.span>
              <span className="text-[9.5px] font-semibold relative z-10 tracking-wide">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
