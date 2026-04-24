import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin(req: NextRequest) {
  const adminSb = createAdminClient();
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  let user = null;
  if (token) {
    const { data } = await adminSb.auth.getUser(token);
    user = data.user;
  } else {
    const { data } = await createClient().auth.getUser();
    user = data.user;
  }
  if (!user) return null;
  const { data: profile } = await adminSb
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (profile?.role ?? "customer") === "admin" ? user : null;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("091")) return `+91${digits.slice(3)}`;
  return `+${digits}`;
}

function toCSV(shops: { name: string; phone: string }[]): string {
  const rows = shops.map(s => {
    const name  = `"APNA - ${s.name.replace(/"/g, '""')}"`;
    const phone = `"${normalisePhone(s.phone)}"`;
    return `${name},${phone}`;
  });
  return ["Name,Phone", ...rows].join("\r\n");
}

function toVCF(shops: { name: string; phone: string }[]): string {
  return shops
    .map(s => {
      const display = `APNA - ${s.name}`;
      const tel     = normalisePhone(s.phone);
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${display}`,
        `N:${display};;;;`,
        `TEL;TYPE=CELL:${tel}`,
        "END:VCARD",
      ].join("\r\n");
    })
    .join("\r\n");
}

function fileDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}`;
}

/* ── GET /api/admin/export/contacts ──────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url          = new URL(req.url);
  const from         = url.searchParams.get("from")          ?? "";   // YYYY-MM-DD
  const to           = url.searchParams.get("to")            ?? "";   // YYYY-MM-DD (inclusive)
  const format       = url.searchParams.get("format")        ?? "vcf"; // csv | vcf
  const approvedOnly = url.searchParams.get("approved_only") === "true";
  const countOnly    = url.searchParams.get("count_only")    === "true";

  if (!from || !to) {
    return NextResponse.json({ error: "from and to dates required (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!["csv", "vcf"].includes(format)) {
    return NextResponse.json({ error: "format must be csv or vcf" }, { status: 400 });
  }

  // Make "to" date inclusive by going to 23:59:59 of that day
  const fromISO = `${from}T00:00:00.000Z`;
  const toISO   = `${to}T23:59:59.999Z`;

  const adminClient = createAdminClient();

  let query = adminClient
    .from("shops")
    .select("name, phone")
    .is("deleted_at", null)
    .not("phone", "is", null)
    .neq("phone", "")
    .gte("created_at", fromISO)
    .lte("created_at", toISO)
    .order("created_at", { ascending: true });

  if (approvedOnly) {
    query = query.eq("approval_status", "approved");
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shops = (data ?? []) as { name: string; phone: string }[];

  // Count-only mode for the UI preview badge
  if (countOnly) {
    return NextResponse.json({ count: shops.length });
  }

  if (shops.length === 0) {
    return NextResponse.json({ error: "No contacts found for this date range" }, { status: 404 });
  }

  const label    = from === to ? fileDate(fromISO) : `${fileDate(fromISO)}-${fileDate(toISO)}`;
  const filename = `apnamap-contacts-${label}.${format}`;

  if (format === "csv") {
    const body = toCSV(shops);
    return new NextResponse(body, {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Contact-Count":     String(shops.length),
      },
    });
  }

  // VCF
  const body = toVCF(shops);
  return new NextResponse(body, {
    headers: {
      "Content-Type":        "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Contact-Count":     String(shops.length),
    },
  });
}
