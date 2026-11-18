"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAnonymousSupabaseUser } from "@/features/chat/client/hooks/use-anonymous-supabase-user";
import { shouldRefreshAfterAuth } from "@/features/chat/shared/utils/should-refresh-after-auth";

export function AuthGate({ serverUserId }: { serverUserId: string | null }) {
  const userId = useAnonymousSupabaseUser();
  const router = useRouter();

  // 初回のUID保存より匿名認証が遅い場合も、認証Cookie確立後に回答導線を更新する。
  useEffect(() => {
    if (shouldRefreshAfterAuth(serverUserId, userId)) router.refresh();
  }, [serverUserId, userId, router]);

  return null;
}
