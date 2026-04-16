export default function ShopLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg, #05070C)" }}>

      {/* Sticky header — back button + title + save icon */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: "rgba(5,7,12,0.96)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className="shimmer" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
        <div className="shimmer" style={{ height: 18, borderRadius: 8, flex: 1, maxWidth: 180 }} />
        <div className="shimmer" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
      </div>

      {/* Cover gradient area */}
      <div style={{ height: 200, background: "rgba(255,255,255,0.03)", position: "relative" }}>
        {/* Faint shimmer overlay */}
        <div className="shimmer" style={{ position: "absolute", inset: 0, opacity: 0.6 }} />
        {/* Logo box */}
        <div style={{ position: "absolute", bottom: 16, left: 16 }}>
          <div className="shimmer" style={{ width: 64, height: 64, borderRadius: 16 }} />
        </div>
        {/* Status badge */}
        <div style={{ position: "absolute", bottom: 22, right: 16 }}>
          <div className="shimmer" style={{ width: 62, height: 22, borderRadius: 100 }} />
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>

        {/* Shop name */}
        <div className="shimmer" style={{ height: 28, borderRadius: 10, width: "65%", marginBottom: 8 }} />

        {/* Category · locality · rating row */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
          <div className="shimmer" style={{ height: 14, borderRadius: 6, width: 70 }} />
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
          <div className="shimmer" style={{ height: 14, borderRadius: 6, width: 80 }} />
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
          <div className="shimmer" style={{ height: 14, borderRadius: 6, width: 60 }} />
        </div>

        {/* Description lines */}
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="shimmer" style={{ height: 13, borderRadius: 6, width: "100%" }} />
          <div className="shimmer" style={{ height: 13, borderRadius: 6, width: "85%" }} />
        </div>

        {/* Action buttons — 3 column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          <div className="shimmer" style={{ height: 46, borderRadius: 12 }} />
          <div className="shimmer" style={{ height: 46, borderRadius: 12 }} />
          <div className="shimmer" style={{ height: 46, borderRadius: 12 }} />
        </div>

        {/* Offers section header */}
        <div className="shimmer" style={{ height: 18, borderRadius: 8, width: 110, marginBottom: 12 }} />

        {/* Offer card 1 — big deal style */}
        <div style={{
          padding: 14, borderRadius: 16, marginBottom: 10,
          background: "rgba(255,80,0,0.05)",
          border: "1px solid rgba(255,80,0,0.12)",
        }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div className="shimmer" style={{ height: 12, borderRadius: 6, width: 70 }} />
            <div className="shimmer" style={{ height: 12, borderRadius: 6, width: 55 }} />
          </div>
          <div className="shimmer" style={{ height: 14, borderRadius: 6, width: "80%" }} />
        </div>

        {/* Offer card 2 */}
        <div style={{
          padding: 14, borderRadius: 16, marginBottom: 24,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div className="shimmer" style={{ height: 12, borderRadius: 6, width: 60 }} />
            <div className="shimmer" style={{ height: 12, borderRadius: 6, width: 50 }} />
          </div>
          <div className="shimmer" style={{ height: 14, borderRadius: 6, width: "70%" }} />
        </div>

        {/* Info section */}
        <div className="shimmer" style={{ height: 18, borderRadius: 8, width: 50, marginBottom: 12 }} />
        <div style={{
          borderRadius: 16, overflow: "hidden",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px",
              borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}>
              <div className="shimmer" style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0 }} />
              <div className="shimmer" style={{ height: 13, borderRadius: 6, width: `${[60, 45, 50][i]}%` }} />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
