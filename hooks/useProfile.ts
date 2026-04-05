"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";

interface ProfileState {
  userId:   string | null;
  role:     UserRole;
  isVendor: boolean;
  loading:  boolean;
}

/**
 * Lightweight hook that reads the current user's role from the cached
 * Supabase session (no network request when session is fresh).
 * Used by AppShell to show vendor-specific tabs.
 */
export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>({
    userId:   null,
    role:     "customer",
    isVendor: false,
    loading:  true,
  });

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setState({ userId: null, role: "customer", isVendor: false, loading: false });
        return;
      }
      const role = (user.user_metadata?.role ?? "customer") as UserRole;
      setState({
        userId:   user.id,
        role,
        isVendor: role === "vendor" || role === "admin",
        loading:  false,
      });
    });
  }, []);

  return state;
}
