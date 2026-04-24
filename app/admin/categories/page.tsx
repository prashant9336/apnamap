"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  is_active: boolean;
  merged_into_id: string | null;
  shop_count: number;
}

const INP: React.CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 11,
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
  color: "#F2F5FF", fontSize: 14, outline: "none",
  fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box",
};
const LBL: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 700,
  color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
  letterSpacing: "0.8px", marginBottom: 5,
};

export default function AdminCategoriesPage() {
  const [cats,     setCats]     = useState<Category[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [token,    setToken]    = useState("");
  const [acting,   setActing]   = useState<string | null>(null);
  const [error,    setError]    = useState("");

  // Add form
  const [addOpen,  setAddOpen]  = useState(false);
  const [addForm,  setAddForm]  = useState({ name: "", slug: "", icon: "🏪", color: "#FF5E1A" });

  // Edit modal
  const [editCat,  setEditCat]  = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ name: "", icon: "", color: "" });

  // Merge modal
  const [mergeFrom, setMergeFrom] = useState<Category | null>(null);
  const [mergeInto, setMergeInto] = useState("");

  const sb = createClient();

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? "";
      setToken(tok);
      loadCats(tok);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCats(tok: string) {
    setLoading(true);
    const res = await fetch("/api/admin/categories", {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    });
    if (res.ok) {
      const d = await res.json();
      setCats(d.categories ?? []);
    }
    setLoading(false);
  }

  async function callAPI(body: Record<string, unknown>) {
    return fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  }

  async function addCategory() {
    if (!addForm.name.trim() || !addForm.slug.trim()) { setError("Name and slug are required"); return; }
    setActing("add");
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(addForm),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Failed to add"); setActing(null); return; }
    setCats(p => [...p, { ...d.category, shop_count: 0 }]);
    setAddOpen(false);
    setAddForm({ name: "", slug: "", icon: "🏪", color: "#FF5E1A" });
    setError("");
    setActing(null);
  }

  async function saveEdit() {
    if (!editCat) return;
    setActing(editCat.id);
    const res = await callAPI({
      category_id: editCat.id,
      action: "edit",
      fields: { name: editForm.name, icon: editForm.icon, color: editForm.color },
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Failed"); setActing(null); return; }
    setCats(p => p.map(c => c.id === editCat.id ? { ...c, ...d.category } : c));
    setEditCat(null);
    setActing(null);
  }

  async function toggleActive(cat: Category) {
    setActing(cat.id);
    const res = await callAPI({ category_id: cat.id, action: cat.is_active ? "disable" : "enable" });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Failed"); setActing(null); return; }
    setCats(p => p.map(c => c.id === cat.id ? { ...c, ...d.category } : c));
    setActing(null);
  }

  async function doMerge() {
    if (!mergeFrom || !mergeInto) { setError("Select a target category"); return; }
    setActing(mergeFrom.id);
    const res = await callAPI({ category_id: mergeFrom.id, action: "merge", merge_into_id: mergeInto });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Failed"); setActing(null); return; }
    setCats(p => p.map(c => c.id === mergeFrom.id ? { ...c, ...d.category } : c));
    setMergeFrom(null);
    setMergeInto("");
    setActing(null);
    // Reload to get fresh shop counts
    loadCats(token);
  }

  const activeCats   = cats.filter(c =>  c.is_active);
  const inactiveCats = cats.filter(c => !c.is_active);

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <Link href="/admin/dashboard" className="text-xl">←</Link>
        <p className="font-syne font-black text-base flex-1">Categories</p>
        <button onClick={() => { setAddOpen(!addOpen); setError(""); }}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
          style={{ background: "var(--accent)" }}>+ Add</button>
      </div>

      <div className="px-4 py-4 pb-page space-y-4">
        {/* Error */}
        {error && (
          <div className="px-3 py-2.5 rounded-xl text-sm"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
            {error}
            <button onClick={() => setError("")} className="ml-2 font-bold">✕</button>
          </div>
        )}

        {/* Add form */}
        {addOpen && (
          <div className="p-4 rounded-2xl space-y-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,94,26,0.20)" }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--accent)" }}>New Category</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "name",  ph: "Category Name",  label: "Name *" },
                { k: "slug",  ph: "slug-like-this",  label: "Slug *" },
                { k: "icon",  ph: "🏪",              label: "Icon (emoji)" },
                { k: "color", ph: "#FF5E1A",         label: "Color" },
              ].map(f => (
                <div key={f.k}>
                  <label style={LBL}>{f.label}</label>
                  <input value={(addForm as any)[f.k]}
                    onChange={e => setAddForm(p => ({ ...p, [f.k]: e.target.value }))}
                    placeholder={f.ph} style={INP} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setAddOpen(false); setError(""); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.05)", color: "var(--t2)", border: "none", cursor: "pointer" }}>Cancel</button>
              <button onClick={addCategory} disabled={acting === "add"}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: acting === "add" ? "rgba(255,94,26,0.40)" : "var(--accent)", border: "none", cursor: acting === "add" ? "not-allowed" : "pointer" }}>
                {acting === "add" ? "Saving…" : "Save Category"}
              </button>
            </div>
          </div>
        )}

        {/* Skeleton */}
        {loading && [1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl shimmer" />)}

        {/* Active categories */}
        {!loading && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
              Active · {activeCats.length}
            </p>
            <div className="space-y-2">
              {activeCats.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{cat.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--t3)" }}>
                      {cat.slug} · {cat.shop_count} shop{cat.shop_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setEditCat(cat); setEditForm({ name: cat.name, icon: cat.icon, color: cat.color }); setError(""); }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                      style={{ background: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.20)" }}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => { setMergeFrom(cat); setMergeInto(""); setError(""); }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                      style={{ background: "rgba(139,92,246,0.08)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.20)" }}>
                      ⇄ Merge
                    </button>
                    <button onClick={() => toggleActive(cat)} disabled={acting === cat.id}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                      style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)", opacity: acting === cat.id ? 0.5 : 1 }}>
                      Disable
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Inactive / merged categories */}
            {inactiveCats.length > 0 && (
              <>
                <p className="text-xs font-bold uppercase tracking-wide mt-4" style={{ color: "var(--t3)" }}>
                  Disabled / Merged · {inactiveCats.length}
                </p>
                <div className="space-y-2">
                  {inactiveCats.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.05)", opacity: 0.65 }}>
                      <span className="text-2xl grayscale">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: "var(--t2)" }}>{cat.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--t3)" }}>
                          {cat.slug}
                          {cat.merged_into_id && ` · Merged into another`}
                        </p>
                      </div>
                      <button onClick={() => toggleActive(cat)} disabled={acting === cat.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                        style={{ background: "rgba(31,187,90,0.08)", color: "#1FBB5A", border: "1px solid rgba(31,187,90,0.20)", opacity: acting === cat.id ? 0.5 : 1 }}>
                        Re-enable
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Edit modal ── */}
      {editCat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
          onClick={() => setEditCat(null)}>
          <div style={{ background: "#0C0F18", borderRadius: "20px 20px 0 0", padding: "20px 18px", width: "100%", boxSizing: "border-box" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 18px" }} />
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: "#F2F5FF", marginBottom: 16 }}>
              ✏️ Edit: {editCat.name}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div><label style={LBL}>Name</label><input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={INP} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={LBL}>Icon (emoji)</label><input value={editForm.icon} onChange={e => setEditForm(f => ({ ...f, icon: e.target.value }))} style={INP} /></div>
                <div><label style={LBL}>Color (hex)</label><input value={editForm.color} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} style={INP} /></div>
              </div>
              {editForm.icon && <div style={{ fontSize: 40, textAlign: "center" }}>{editForm.icon}</div>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditCat(null)} style={{ flex: 1, padding: "13px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
              <button onClick={saveEdit} disabled={acting === editCat.id} style={{ flex: 2, padding: "13px", borderRadius: 12, background: acting ? "rgba(255,94,26,0.40)" : "#FF5E1A", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                {acting === editCat.id ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Merge modal ── */}
      {mergeFrom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
          onClick={() => setMergeFrom(null)}>
          <div style={{ background: "#0C0F18", borderRadius: "20px 20px 0 0", padding: "20px 18px", width: "100%", boxSizing: "border-box" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 18px" }} />
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: "#F2F5FF", marginBottom: 4 }}>
              ⇄ Merge: {mergeFrom.name}
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginBottom: 16 }}>
              All {mergeFrom.shop_count} shop(s) will be reassigned. {mergeFrom.name} will be disabled.
            </p>
            {error && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <label style={LBL}>Merge into</label>
            <select value={mergeInto} onChange={e => setMergeInto(e.target.value)}
              style={{ ...INP, marginBottom: 16 }}>
              <option value="">Select target category…</option>
              {cats.filter(c => c.is_active && c.id !== mergeFrom.id).map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name} ({c.shop_count} shops)</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setMergeFrom(null); setError(""); }} style={{ flex: 1, padding: "13px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
              <button onClick={doMerge} disabled={!mergeInto || !!acting} style={{ flex: 2, padding: "13px", borderRadius: 12, background: (!mergeInto || acting) ? "rgba(139,92,246,0.30)" : "rgba(139,92,246,0.80)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                {acting ? "Merging…" : "Confirm Merge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
