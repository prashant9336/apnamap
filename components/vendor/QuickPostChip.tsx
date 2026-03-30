"use client";

export type ChipType =
  | "flash_deal"
  | "new_arrival"
  | "stock_back"
  | "closing_soon"
  | "custom_note";

interface QuickPostChipProps {
  type: ChipType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function QuickPostChip({
  type,
  label,
  active = false,
  onClick,
}: QuickPostChipProps) {
  const styles = active
    ? {
        background: "rgba(255,94,26,0.14)",
        border: "1px solid rgba(255,94,26,0.28)",
        color: "var(--accent)",
      }
    : {
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "var(--t2)",
      };

  return (
    <button
      type="button"
      onClick={onClick}
      data-type={type}
      className="px-3 py-2 rounded-full text-xs font-semibold"
      style={styles}
    >
      {label}
    </button>
  );
}