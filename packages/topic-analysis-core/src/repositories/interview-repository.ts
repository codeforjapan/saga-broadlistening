import { createAdminClient } from "@mirai-gikai/supabase";

/** インタビューセッションを取得する。存在しなければ null（呼び出し側でスキップ判定）。 */
export async function findInterviewSessionById(sessionId: string) {
  const supabase = createAdminClient();
  // 未存在を例外ではなく null で返すため maybeSingle を使う
  // （reextract の「session not found → skipped」分岐を到達可能にする）。
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch interview session: ${error.message}`);
  }

  return data;
}

/** セッションの全メッセージを作成順で取得する。 */
export async function findInterviewMessagesBySessionId(sessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_messages")
    .select("*")
    .eq("interview_session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch interview messages: ${error.message}`);
  }

  return data;
}

/**
 * 意見募集（テーマ）名だけを引く。
 * タグ付けは意見ごとに並列で走るため、テーマの説明・施策本文まで取る
 * fetchInterviewConfigContext は使わない（使うのは name 1カラムだけ）。
 */
export async function findInterviewConfigNameById(
  interviewConfigId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select("name")
    .eq("id", interviewConfigId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch interview config name: ${error.message}`);
  }
  return data?.name ?? null;
}
