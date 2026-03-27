"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const TABS = [
  { id: "walk",    href: "/explore",  icon: "🚶", label: "Walk"    },
  { id: "search",  href: "/search",   icon: "🔍", label: "Search"  },
  { id: "offers",  href: "/offers",   icon: "🎯", label: "Offers"  },
  { id: "saved",   href: "/saved",    icon: "❤️",  label: "Saved"   },
  { id: "profile", href: "/profile",  icon: "👤", label: "Me"      },
];

interface Props {
  children: React.ReactNode;
  activeTab?: string;
}

export default function AppShell({ children, activeTab }: Props) {
  const pathname = usePathname();

  return (
    <div className="relative flex flex-col w-full max-w-[480px] mx-auto"
      style={{ height: "100dvh", background: "var(--bg)", overflow: "hidden" }}>

      {/* Page content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 flex items-stretch"
        style={{
          height: 66,
          background: "rgba(5,7,12,0.97)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id || pathname === tab.href;
          return (
            <Link key={tab.id} href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-1 relative transition-colors duration-150"
              style={{ color: isActive ? "var(--accent)" : "rgba(255,255,255,0.26)" }}>

              {/* Active top bar */}
              {isActive && (
                <motion.div layoutId="nav-bar"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-b-sm"
                  style={{ width: 22, background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
              )}

              {/* Active bg glow */}
              {isActive && (
                <div className="absolute inset-0" style={{
                  background: "radial-gradient(ellipse at 50% 0%,rgba(255,94,26,0.10),transparent 55%)",
                }} />
              )}

              <motion.span
                className="text-[21px] leading-none relative z-10"
                animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                {tab.icon}
              </motion.span>
              <span className="text-[9.5px] font-semibold relative z-10 tracking-wide">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
