import "server-only";

import { Suspense } from "react";
import { getChatSupabaseUserId } from "@/features/chat/server/utils/supabase-server";
import { AuthGate } from "./auth-gate";

/** 描画時の利用者を AuthGate に渡す。利用者の確認でページの描画を止めないよう Suspense で包む */
export function ServerAuthGate() {
  return (
    <Suspense fallback={null}>
      <AuthGateWithServerUser />
    </Suspense>
  );
}

async function AuthGateWithServerUser() {
  return <AuthGate serverUserId={await getChatSupabaseUserId()} />;
}
