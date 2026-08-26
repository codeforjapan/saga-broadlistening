import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

/**
 * 施策ページの「AIに質問する」対話セッションを1件作成する。
 */
export async function createChatSession(params: {
  policyId: string;
  userId: string | null;
}): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      policy_id: params.policyId,
      user_id: params.userId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create chat session: ${error.message}`, {
      cause: error,
    });
  }

  return data.id;
}

/**
 * 対話セッションに1メッセージを追記する。
 */
export async function insertChatMessage(params: {
  sessionId: string;
  role: "user" | "assistant" | "system";
  message: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("chat_messages").insert({
    session_id: params.sessionId,
    role: params.role,
    message: params.message,
  });

  if (error) {
    throw new Error(`Failed to insert chat message: ${error.message}`, {
      cause: error,
    });
  }
}

/**
 * 施策 × 利用者で進行中の対話セッションを1件引く（2ターン目以降の追記先）。
 *
 * userId を nullable にしない。NULL 許容にすると `user_id is null` の行が
 * 全員に共有され、匿名利用者どうしが同じセッションに書き込んでしまう。
 */
export async function findLatestChatSessionId(params: {
  policyId: string;
  userId: string;
}): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("policy_id", params.policyId)
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch chat session: ${error.message}`, {
      cause: error,
    });
  }

  return data?.id ?? null;
}
