import Link from "next/link";

export const metadata = { title: "Account Suspended — ApnaMap" };

export default function SuspendedPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "#05070C", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>⛔</div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: "#F2F5FF", marginBottom: 12, letterSpacing: "-0.3px" }}>
          Account Suspended
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.50)", lineHeight: 1.7, marginBottom: 24 }}>
          Your vendor account has been suspended by ApnaMap admin.
          Your shop is no longer visible to customers.
        </p>
        <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(232,168,0,0.08)", border: "1px solid rgba(232,168,0,0.22)", marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: "#E8A800", lineHeight: 1.6 }}>
            If you believe this is a mistake, please contact ApnaMap support.
            You may need to re-register to create a new shop listing.
          </p>
        </div>
        <Link href="/explore"
          style={{ display: "block", padding: "14px", borderRadius: 13, background: "#FF5E1A", color: "#fff", fontSize: 15, fontWeight: 800, textDecoration: "none", fontFamily: "'DM Sans',sans-serif", boxShadow: "0 0 24px rgba(255,94,26,0.25)" }}>
          Browse ApnaMap
        </Link>
      </div>
    </div>
  );
}
