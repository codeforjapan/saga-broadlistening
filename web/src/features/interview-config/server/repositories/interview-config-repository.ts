import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

// Epic #54 で interview_configs.bill_id が廃止され、施策との紐づけは
// policies_interview_configs（多対多）経由になった。
// 1施策に複数の意見募集がある場合、既存 UI は最初の1件のみを使う
// （複数テーマ表示の UI 対応は Epic #8 のフォローアップ）。

/**
 * policy_idから募集中（status = 'open'）の意見募集を1件取得
 */
export async function findOpenInterviewConfigByPolicyId(policyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_interview_configs")
    .select("interview_configs!inner(*)")
    .eq("policy_id", policyId)
    .eq("interview_configs.status", "open")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { data: data?.interview_configs ?? null, error };
}

/**
 * policy_idから最新の意見募集を1件取得（ステータス問わず）
 */
export async function findLatestInterviewConfigByPolicyId(policyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_interview_configs")
    .select("interview_configs!inner(*)")
    .eq("policy_id", policyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data: data?.interview_configs ?? null, error };
}

/**
 * interview_config_idからインタビュー質問一覧を取得（question_order昇順）
 */
export async function findInterviewQuestionsByConfigId(
  interviewConfigId: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("interview_config_id", interviewConfigId)
    .order("question_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch interview questions: ${error.message}`);
  }

  return data;
}
