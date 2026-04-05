"use client";
/**
 * /feed — Explore tab: vertical reel of active deals.
 *
 * ExploreFeed is dynamic-imported so its JS doesn't hit the Walk bundle.
 */

import dynamic from "next/dynamic";
import AppShell from "@/components/layout/AppShell";

const ExploreFeed = dynamic(
  () => import("@/components/explore/ExploreFeed"),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: "100%", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#05070C",
        color: "rgba(255,255,255,0.2)", fontSize: 13,
      }}>
        Loading deals…
      </div>
    ),
  },
);

export default function FeedPage() {
  return (
    <AppShell activeTab="explore">
      <ExploreFeed />
    </AppShell>
  );
}
