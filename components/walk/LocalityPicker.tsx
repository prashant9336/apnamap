"use client";
import { useState, useEffect } from "react";
import type { LocalityOverride } from "@/hooks/useLocalityOverride";

interface Props {
  onSelect: (loc: LocalityOverride) => void;
  onClose:  () => void;
}

export default function LocalityPicker({ onSelect, onClose }: Props) {
  const [localities, setLocalities] = useState<any[]>([]);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    fetch("/api/localities")
      .then(r => r.ok ? r.json() : { localities: [] })
      .then(d => { setLocalities(d.localities ?? []); setLoading(false); });
  }, []);

  const filtered = localities.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(5,7,12,0.97)", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)",
          color: "var(--t1)", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer",
        }}>← Back</button>
        <p style={{ fontFamily: "var(--font-syne, sans-serif)", fontWeight: 700, fontSize: 15, flex: 1 }}>
          Choose your area
        </p>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px 8px" }}>
        <input
          autoFocus
          type="text"
          placeholder="Search locality…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
            color: "var(--t1)", outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 32px" }}>
        {loading && (
          <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", marginTop: 32 }}>
            Loading…
          </div>
        )}
        {!loading && filtered.map(loc => (
          <button key={loc.id} onClick={() => onSelect({
            id: loc.id, name: loc.name, slug: loc.slug,
            lat: parseFloat(loc.lat), lng: parseFloat(loc.lng),
          })} style={{
            display: "block", width: "100%", textAlign: "left",
            padding: "13px 14px", marginBottom: 6, borderRadius: 12,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            color: "var(--t1)", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            📍 {loc.name}
          </button>
        ))}
        {!loading && filtered.length === 0 && (
          <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", marginTop: 32 }}>
            No localities found
          </div>
        )}
      </div>
    </div>
  );
}
