import type { DealType, VoicePostDraft } from "@/types";
import { classifyDealType } from "./classify";
import { extractEntities } from "./extract";

const DEAL_LABELS: Record<DealType, string> = {
  flash_deal:    "⚡ Flash Deal",
  big_deal:      "🔥 Big Deal",
  combo_offer:   "🎁 Combo Offer",
  new_arrival:   "🆕 New Arrival",
  festive_offer: "🎉 Festive Offer",
  limited_stock: "⏳ Limited Stock",
  clearance:     "🏷️ Clearance",
  regular_offer: "🎯 Special Offer",
};

function buildTitle(
  dealType: DealType,
  offerValue: string | null,
  cleanedText: string,
): string {
  const label = DEAL_LABELS[dealType];

  if (offerValue) {
    return `${label}: ${offerValue}`;
  }

  // Use first meaningful phrase (up to 6 words) from cleaned transcript
  const words = cleanedText.trim().split(/\s+/).slice(0, 6).join(" ");
  if (words.length > 0 && words.length <= 50) {
    return `${label}: ${words}`;
  }

  return label;
}

function buildDescription(
  cleanedText: string,
  offerValue: string | null,
  validityText: string | null,
): string {
  let desc = cleanedText;

  // Append validity if not already in text
  if (
    validityText &&
    !cleanedText.toLowerCase().includes(validityText.toLowerCase())
  ) {
    desc = `${desc} (${validityText})`;
  }

  // Cap at 180 chars with ellipsis
  if (desc.length > 180) {
    desc = desc.slice(0, 177) + "…";
  }

  return desc;
}

/**
 * Convert a raw transcript into a structured VoicePostDraft.
 * Called server-side in the API route — no side effects.
 */
export function generatePostDraft(
  transcript: string,
  shopId: string,
): Omit<VoicePostDraft, "id" | "vendor_id" | "created_at" | "updated_at"> {
  const dealType = classifyDealType(transcript);
  const { offerValueText, validityText, validUntil, localityText, cleanedText } =
    extractEntities(transcript);

  const title = buildTitle(dealType, offerValueText, cleanedText);
  const description = buildDescription(cleanedText, offerValueText, validityText);

  return {
    shop_id:            shopId,
    source_type:        "voice",
    raw_transcript:     transcript,
    cleaned_transcript: cleanedText,
    title,
    description,
    deal_type:          dealType,
    offer_value_text:   offerValueText,
    validity_text:      validityText,
    valid_until:        validUntil?.toISOString() ?? null,
    locality_text:      localityText,
    is_published:       false,
  };
}
