"use client";

import { createBrowserClient } from "@mirai-gikai/supabase";

// Create a singleton Supabase client with persistent session
const supabase = createBrowserClient();

// 複数のコンポーネントや「はじめる」から呼ばれても、確立済みならそのIDを使い回す。
// 失敗したときと、セッションが失われたとき（トークン更新の失敗など）は次の呼び出しでやり直す
let anonymousUserIdPromise: Promise<string | undefined> | null = null;

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") anonymousUserIdPromise = null;
});

/**
 * Ensure an anonymous Supabase user exists and return the user ID.
 * Creates an anonymous user if none exists. Returns undefined on failure.
 */
export function ensureAnonymousSupabaseUser(): Promise<string | undefined> {
  anonymousUserIdPromise ??= resolveAnonymousUserId().then((id) => {
    if (!id) anonymousUserIdPromise = null;
    return id;
  });
  return anonymousUserIdPromise;
}

async function resolveAnonymousUserId(): Promise<string | undefined> {
  try {
    // Check if user already exists
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return user.id;
    }

    // No valid session -> sign in anonymously
    const { data, error: signInError } =
      await supabase.auth.signInAnonymously();

    if (signInError) {
      console.error("Error creating anonymous user:", signInError);
      return undefined;
    }

    return data.user?.id;
  } catch (err) {
    console.error("Error ensuring anonymous user:", err);
    return undefined;
  }
}
