/**
 * Unit tests for /api/analytics route logic.
 * Tests input validation — no real Supabase connection needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Minimal NextRequest/NextResponse shim ──────────────────────────
function makeReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/analytics", {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body:    JSON.stringify(body),
  });
}

// Mock Supabase admin client — we only test input validation here
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    auth:  { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from:  (_: string) => ({ insert: vi.fn().mockReturnValue({ then: vi.fn() }) }),
    rpc:   vi.fn().mockReturnValue({ then: vi.fn() }),
  }),
}));

describe("POST /api/analytics — input validation", () => {
  it("rejects missing event_type with 400", async () => {
    const { POST } = await import("../../app/api/analytics/route");
    const res = await POST(makeReq({ shop_id: "abc" }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/event_type/i);
  });

  it("rejects unknown event_type with 400", async () => {
    const { POST } = await import("../../app/api/analytics/route");
    const res = await POST(makeReq({ event_type: "hack_attempt" }) as any);
    expect(res.status).toBe(400);
  });

  it("accepts known event_type and returns ok:true", async () => {
    const { POST } = await import("../../app/api/analytics/route");
    const res = await POST(makeReq({ event_type: "view", shop_id: "abc-123" }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
