import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

// Epic #54 で interview_configs.bill_id が廃止され、施策との紐づけは
// policies_interview_configs（多対多）経由になった。
// 1施策に複数の意見募集がある場合、既存 UI は最初の1件のみを使う
// （複数テーマ表示の UI 対応は Epic #8 のフォローアップ）。

// 施策に紐づく意見募集を「新しい順」で1件に絞るための並び順。
// 紐づけ行（policies_interview_configs）の created_at は一括投入で同値になりうるため、
// 意見募集自体の created_at を第1キー、interview_config_id を第2キーにして
// 順序を一意に決める。これがないと「最初の1件」が実行ごとに入れ替わる。
const NEWEST_CONFIG_ORDER = [
  {
    column: "created_at",
    options: { ascending: false, referencedTable: "interview_configs" },
  },
  { column: "interview_config_id", options: { ascending: false } },
] as const;

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
    .order(NEWEST_CONFIG_ORDER[0].column, NEWEST_CONFIG_ORDER[0].options)
    .order(NEWEST_CONFIG_ORDER[1].column, NEWEST_CONFIG_ORDER[1].options)
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
    .order(NEWEST_CONFIG_ORDER[0].column, NEWEST_CONFIG_ORDER[0].options)
    .order(NEWEST_CONFIG_ORDER[1].column, NEWEST_CONFIG_ORDER[1].options)
    .limit(1)
    .maybeSingle();

  return { data: data?.interview_configs ?? null, error };
}

/**
 * 施策に対応する意見募集を1件に決める（この解決ルールの正本）。
 *
 * 募集中（open）を優先し、なければ最新のものを返す。
 * 施策IDを入口にする画面はすべてこれを通すこと。呼び出しごとに
 * 「最初の1件」を選び直すと、同じページの中でヘッダーと意見一覧が
 * 別のテーマを指すことがある。
 */
export async function findPrimaryInterviewConfigByPolicyId(policyId: string) {
  const open = await findOpenInterviewConfigByPolicyId(policyId);
  if (open.error || open.data) {
    return open;
  }

  return findLatestInterviewConfigByPolicyId(policyId);
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
