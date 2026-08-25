import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

// Epic #54 で interview_configs.bill_id が廃止され、施策との紐づけは
// policies_interview_configs（多対多）経由になった。
// 1施策に複数の意見募集がある場合、既存 UI は最初の1件のみを使う
// （複数テーマ表示の UI 対応は Epic #8 のフォローアップ）。

/**
 * 施策に紐づく意見募集を1件だけ引く。
 *
 * 並び順は紐づけ行（policies_interview_configs）の created_at 降順、
 * 同値なら interview_config_id 降順。
 *
 * 埋め込み先（interview_configs）のカラムでは親行を並べ替えられない
 * （PostgREST の `referencedTable` 付き order は to-one 埋め込みでは
 *   実質無効）ため、親テーブル側のカラムだけで順序を決めている。
 * 一括投入で created_at が同値になっても id でタイブレークするので、
 * 「最初の1件」が実行ごとに入れ替わることはない。
 */
async function findNewestInterviewConfigByPolicyId(
  policyId: string,
  status?: "open"
) {
  const supabase = createAdminClient();
  let query = supabase
    .from("policies_interview_configs")
    .select("interview_configs!inner(*)")
    .eq("policy_id", policyId);

  if (status) {
    query = query.eq("interview_configs.status", status);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("interview_config_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data: data?.interview_configs ?? null, error };
}

/**
 * policy_idから募集中（status = 'open'）の意見募集を1件取得。
 * 「今参加できるテーマ」を出す導線（LP・チャット）で使う。
 */
export async function findOpenInterviewConfigByPolicyId(policyId: string) {
  return findNewestInterviewConfigByPolicyId(policyId, "open");
}

/**
 * policy_idから最新の意見募集を1件取得（ステータス問わず）
 */
export async function findLatestInterviewConfigByPolicyId(policyId: string) {
  return findNewestInterviewConfigByPolicyId(policyId);
}

/**
 * 施策に対応する意見募集を1件に決める（複数テーマがある場合の解決ルール）。
 *
 * 募集中（open）を優先し、なければ最新のものを返す。
 * 「募集が終わっても結果は見せる」画面（意見一覧・トピック分析）はこれを使う。
 * 参加導線だけは `findOpenInterviewConfigByPolicyId` を直接使い、
 * 終了したテーマへ誘導しないようにしている。
 *
 * どちらを使う場合でも、選ばれるテーマは上の並び順で一致する。
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
