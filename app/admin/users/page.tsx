"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => { setUsers(data ?? []); setLoading(false); });
  }, []);

  async function changeRole(id: string, newRole: string) {
    await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    if (newRole === "vendor") await supabase.from("vendors").upsert({ id });
    setUsers((p) => p.map((u) => u.id === id ? { ...u, role: newRole } : u));
  }

  const filtered = users.filter((u) =>
    !search || (u.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <Link href="/admin/dashboard" className="text-xl">←</Link>
        <p className="font-syne font-black text-base flex-1">Users ({users.length})</p>
      </div>

      <div className="px-4 py-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-3"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />

        {loading && [1,2,3].map((i) => <div key={i} className="h-14 rounded-xl shimmer mb-2" />)}

        <div className="space-y-2">
          {filtered.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{ background: "var(--accent)", color: "#fff" }}>
                {(user.name ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user.name ?? "No name"}</p>
                <p className="text-[10px]" style={{ color: "var(--t3)" }}>
                  {new Date(user.created_at).toLocaleDateString("en-IN")}
                </p>
              </div>
              <select value={user.role} onChange={(e) => changeRole(user.id, e.target.value)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg outline-none cursor-pointer"
                style={{ background: user.role === "admin" ? "rgba(255,94,26,0.14)" : user.role === "vendor" ? "rgba(31,187,90,0.12)" : "rgba(255,255,255,0.06)",
                  color: user.role === "admin" ? "var(--accent)" : user.role === "vendor" ? "var(--green)" : "var(--t2)",
                  border: "1px solid rgba(255,255,255,0.08)" }}>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
