import type { Offer } from "@/types";

/** Four deal archetypes recognised by the engine */
export type DealEngineType = "big_deal" | "flash_deal" | "mystery" | "new_deal";

/** An offer paired with its computed score and engine-classified type */
export interface ScoredOffer {
  offer:    Offer;
  score:    number;
  dealType: DealEngineType;
}
