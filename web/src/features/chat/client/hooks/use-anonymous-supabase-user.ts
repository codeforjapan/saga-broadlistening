"use client";

import { useEffect, useState } from "react";
import { ensureAnonymousSupabaseUser } from "../utils/ensure-anonymous-supabase-user";

/**
 * Hook to ensure an anonymous Supabase user exists and return the user ID
 * This will automatically create an anonymous user if none exists
 */
export function useAnonymousSupabaseUser() {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    ensureAnonymousSupabaseUser().then((id) => {
      if (id) setUserId(id);
    });
  }, []);

  return userId;
}
