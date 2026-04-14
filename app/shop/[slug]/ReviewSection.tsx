"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Review } from "@/types";

interface Props {
  shopId:   string;
  shopSlug: string;
}

export default function ReviewSection({ shopId, shopSlug }: Props) {
  const router                      = useRouter();
  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [authed,     setAuthed]     = useState(false);
  const [token,      setToken]      = useState("");
  const [rating,     setRating]     = useState(0);
  const [hover,      setHover]      = useState(0);
  const [comment,    setComment]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    loadReviews();
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthed(true);
        setToken(session.access_token);
      }
    });
  }, [shopId]);

  function loadReviews() {
    fetch(`/api/reviews?shop_id=${shopId}`)
      .then(r => r.json())
      .then(d => { setReviews(d.reviews ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  async function submit() {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    setError("");
    const r = await fetch("/api/reviews", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ shop_id: shopId, rating, comment: comment.trim() || null }),
    });
    setSubmitting(false);
    if (r.ok) {
      setSubmitted(true);
      setRating(0);
      setComment("");
      loadReviews();
    } else {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "Failed to submit. Try again.");
    }
  }

  const displayRating = hover || rating;

  return (
    <div className="pb-8">
      <h2 className="font-syne font-bold text-base mb-3">⭐ Reviews</h2>

      {/* Submit form */}
      {authed && !submitted && (
        <div className="mb-4 p-3.5 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--t2)" }}>Rate this shop</p>

          {/* Star picker */}
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                className="text-2xl transition-all leading-none"
                style={{ color: s <= displayRating ? "#E8A800" : "rgba(255,255,255,0.2)" }}>
                ★
              </button>
            ))}
            {rating > 0 && (
              <span className="text-xs self-center ml-1" style={{ color: "var(--t3)" }}>
                {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
              </span>
            )}
          </div>

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Share your experience (optional)…"
            rows={2}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none mb-3"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--t1)" }}
          />

          {error && (
            <p className="text-xs mb-2" style={{ color: "#f87171" }}>{error}</p>
          )}

          <button onClick={submit} disabled={rating === 0 || submitting}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: rating === 0 ? "rgba(255,255,255,0.05)" : "var(--accent)",
              color:      rating === 0 ? "var(--t3)" : "#fff",
              opacity:    submitting ? 0.6 : 1,
              cursor:     rating === 0 ? "default" : "pointer",
            }}>
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      )}

      {submitted && (
        <div className="mb-4 p-3 rounded-xl text-sm"
          style={{ background: "rgba(31,187,90,0.08)", color: "#1FBB5A", border: "1px solid rgba(31,187,90,0.20)" }}>
          ✓ Review submitted — will appear after approval
        </div>
      )}

      {!authed && (
        <button onClick={() => router.push(`/auth/login?redirect=/shop/${shopSlug}`)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold mb-4"
          style={{ background: "rgba(255,255,255,0.05)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.09)" }}>
          Login to write a review
        </button>
      )}

      {/* Existing reviews */}
      {loading && <div className="h-16 rounded-xl shimmer" />}

      {!loading && reviews.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: "var(--t3)" }}>
          No reviews yet — be the first!
        </p>
      )}

      {!loading && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="p-3.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
                  {(r as any).profile?.name ?? "Anonymous"}
                </span>
                <span className="text-sm" style={{ color: "#E8A800" }}>
                  {"★".repeat(r.rating)}
                  <span style={{ color: "rgba(255,255,255,0.15)" }}>{"★".repeat(5 - r.rating)}</span>
                </span>
              </div>
              {r.comment && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--t2)" }}>{r.comment}</p>
              )}
              <p className="text-[10px] mt-1.5" style={{ color: "var(--t3)" }}>
                {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
