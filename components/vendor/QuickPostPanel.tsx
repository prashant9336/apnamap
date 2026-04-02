"use client";

import { useMemo, useState } from "react";
import { QuickPostChip, type ChipType } from "@/components/vendor/QuickPostChip";
import {
  QuickPostHistory,
  type QuickPost,
} from "@/components/vendor/QuickPostHistory";
import VoicePostModal from "@/components/vendor/VoicePostModal";

interface QuickPostPanelProps {
  shopId: string;
  initialPosts: QuickPost[];
  onPost: (payload: {
    shopId: string;
    type: ChipType;
    note: string;
    expiresAt: string;
  }) => Promise<QuickPost>;
  onToggle: (postId: string, nextActive: boolean) => Promise<void>;
}

const PRESETS: { type: ChipType; label: string; note: string }[] = [
  {
    type: "flash_deal",
    label: "⚡ Flash Deal",
    note: "Flash deal live now",
  },
  {
    type: "new_arrival",
    label: "🆕 New Arrival",
    note: "Fresh stock just arrived",
  },
  {
    type: "stock_back",
    label: "📦 Stock Back",
    note: "Popular item back in stock",
  },
  {
    type: "closing_soon",
    label: "🕘 Closing Soon",
    note: "Visit before closing time",
  },
  {
    type: "custom_note",
    label: "✍️ Custom Note",
    note: "",
  },
];

export function QuickPostPanel({
  shopId,
  initialPosts,
  onPost,
  onToggle,
}: QuickPostPanelProps) {
  const [posts, setPosts] = useState<QuickPost[]>(initialPosts);
  const [selected, setSelected] = useState<ChipType>("flash_deal");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);

  const defaultNote = useMemo(() => {
    return PRESETS.find((p) => p.type === selected)?.note ?? "";
  }, [selected]);

  async function handleSubmit() {
    try {
      setSaving(true);
      setError("");

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      const created = await onPost({
        shopId,
        type: selected,
        note: selected === "custom_note" ? note.trim() : defaultNote,
        expiresAt: expiresAt.toISOString(),
      });

      setPosts((prev) => [created, ...prev]);
      setNote("");
      setSaving(false);
    } catch (err: any) {
      setError(err?.message || "Failed to create quick post");
      setSaving(false);
    }
  }

  async function handleToggle(postId: string, nextActive: boolean) {
    await onToggle(postId, nextActive);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, is_active: nextActive } : p
      )
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="p-4 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.034)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-syne font-bold text-base">Quick Post</span>
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{
              background: "rgba(255,94,26,0.12)",
              color: "#FF5E1A",
              border: "1px solid rgba(255,94,26,0.28)",
            }}
          >
            🎙️ Speak Offer
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map((preset) => (
            <QuickPostChip
              key={preset.type}
              type={preset.type}
              label={preset.label}
              active={selected === preset.type}
              onClick={() => setSelected(preset.type)}
            />
          ))}
        </div>

        {selected === "custom_note" && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Write a quick update for customers..."
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none mb-3"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--t1)",
            }}
          />
        )}

        {error && (
          <div
            className="mb-3 p-2 rounded-lg text-xs"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.18)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || (selected === "custom_note" && !note.trim())}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
          style={{
            background: "var(--accent)",
            opacity: saving || (selected === "custom_note" && !note.trim()) ? 0.5 : 1,
          }}
        >
          {saving ? "Posting..." : "Post Instantly"}
        </button>
      </div>

      <div>
        <div className="font-syne font-bold text-sm mb-3">Recent Quick Posts</div>
        <QuickPostHistory posts={posts} onToggle={handleToggle} />
      </div>

      {voiceOpen && (
        <VoicePostModal
          shopId={shopId}
          onClose={() => setVoiceOpen(false)}
          onPublished={() => setVoiceOpen(false)}
        />
      )}
    </div>
  );
}