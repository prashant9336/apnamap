"use client";

export type QuickPost = {
  id: string;
  shop_id: string;
  user_id?: string;
  post_type: string;
  message?: string | null;
  is_active: boolean;
  expires_at?: string | null;
  created_at?: string;
};

interface QuickPostHistoryProps {
  posts: QuickPost[];
  onToggle: (postId: string, nextActive: boolean) => Promise<void>;
}

function labelForType(type: string) {
  switch (type) {
    case "flash_deal":
      return "⚡ Flash Deal";
    case "new_arrival":
      return "🆕 New Arrival";
    case "stock_back":
      return "📦 Stock Back";
    case "closing_soon":
      return "🕘 Closing Soon";
    case "custom_note":
      return "✍️ Note";
    default:
      return type;
  }
}

export function QuickPostHistory({
  posts,
  onToggle,
}: QuickPostHistoryProps) {
  if (!posts.length) {
    return (
      <div
        className="rounded-2xl p-4 text-sm"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          color: "var(--t2)",
        }}
      >
        No quick posts yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="p-3 rounded-2xl"
          style={{
            background: post.is_active
              ? "rgba(255,255,255,0.04)"
              : "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            opacity: post.is_active ? 1 : 0.65,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-sm">
                {labelForType(post.post_type)}
              </div>
              {post.message && (
                <div className="text-xs mt-1" style={{ color: "var(--t2)" }}>
                  {post.message}
                </div>
              )}
              {post.expires_at && (
                <div className="text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                  Expires {new Date(post.expires_at).toLocaleString("en-IN")}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onToggle(post.id, !post.is_active)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold"
              style={
                post.is_active
                  ? {
                      background: "rgba(31,187,90,0.1)",
                      border: "1px solid rgba(31,187,90,0.25)",
                      color: "var(--green)",
                    }
                  : {
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--t2)",
                    }
              }
            >
              {post.is_active ? "Active" : "Paused"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}