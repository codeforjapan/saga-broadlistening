"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAnonymousSupabaseUser } from "@/features/chat/client/hooks/use-anonymous-supabase-user";

export function AuthGate({ children }: { children?: ReactNode }) {
  const userId = useAnonymousSupabaseUser();
  const router = useRouter();

  // 初回のUID保存より匿名認証が遅い場合も、認証Cookie確立後に回答導線を更新する。
  useEffect(() => {
    if (userId) router.refresh();
  }, [userId, router]);

  return <>{children}</>;
}
