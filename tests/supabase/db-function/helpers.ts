import { adminClient } from "../utils";

/**
 * DBファンクションテスト共通のヘルパー。
 *
 * `utils.ts` は「施策 ─ 意見募集 ─ セッション」を一括で作る想定のため、
 * 意見募集単位で完結する RPC のテストではここのヘルパーを使う。
 */

/** 指定した意見募集の配下にテスト用セッションを作成する */
export async function createTestSession(
  interviewConfigId: string,
  userId: string | null,
  overrides: Partial<{
    started_at: string;
    completed_at: string | null;
    archived_at: string | null;
    rating: number;
  }> = {}
) {
  const { data, error } = await adminClient
    .from("interview_sessions")
    .insert({
      interview_config_id: interviewConfigId,
      user_id: userId,
      started_at: new Date().toISOString(),
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`interview_session 作成失敗: ${error.message}`);
  return data;
}

/**
 * テスト用 interview_config を削除する。
 * 配下のセッション・意見・リアクションは CASCADE で消える。
 * 施策とは多対多のため、施策を消しても意見募集は残る点に注意。
 */
export async function cleanupTestInterviewConfig(
  interviewConfigId: string
): Promise<void> {
  await adminClient
    .from("interview_configs")
    .delete()
    .eq("id", interviewConfigId);
}
