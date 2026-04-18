"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type StreakResponse = {
  streak?: {
    id: string;
    user_id: string;
    locality_id: string;
    streak_count: number;
    last_visit_date: string;
    reward_unlocked: boolean;
    reward_offer_id?: string | null;
    reward_unlocked_at?: string | null;
    reward_expires_at?: string | null;
    reward_redeemed_at?: string | null;
  };
  reward_offer?: {
    id: string;
    title: string;
    shop_name: string;
    expires_at: string | null;
  } | null;
  streak_goal?: number;
  status?: "started" | "updated" | "already_counted_today" | "reward_unlocked";
  error?: string;
};

export function useLocalityStreak() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StreakResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trackVisit = useCallback(async (localityId: string) => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return null;
      }

      const res = await fetch("/api/streak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locality_id: localityId }),
      });

      const json: StreakResponse = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to track streak");
        setLoading(false);
        return null;
      }

      setData(json);
      setLoading(false);
      return json;
    } catch (err: any) {
      setError(err?.message || "Failed to track streak");
      setLoading(false);
      return null;
    }
  }, []);

  return { loading, data, error, trackVisit };
}