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
 * 募集中（open）のテーマと、それに紐づく公開済み施策の組み合わせを全件取得する。
 *
 * テーマ一覧のカードは施策の画像・タグをフォールバックに使い、参加導線にも
 * 施策IDが要るため、紐付けテーブル側から引いて両方をまとめて取得する。
 * 参加人数は埋め込み集計（interview_sessions(count)）で同じ1本に含める。
 * 1件に絞り込む並び順の再現は呼び出し側（buildInterviewThemes）に委ねる。
 */
export async function findOpenInterviewConfigLinks() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_interview_configs")
    .select(
      `
      policy_id,
      created_at,
      policies!inner (
        thumbnail_url,
        policies_tags (
          tags (
            label
          )
        )
      ),
      interview_configs!inner (
        id,
        name,
        description,
        estimated_duration,
        thumbnail_url,
        created_at,
        interview_sessions (
          count
        )
      )
    `
    )
    .eq("interview_configs.status", "open")
    .eq("policies.publish_status", "published")
    // カードに出すのは代表タグ1件だけなので、転送量を増やさない
    .order("created_at", { referencedTable: "policies.policies_tags" })
    .limit(1, { referencedTable: "policies.policies_tags" });

  if (error) {
    throw new Error(`Failed to fetch open interview configs: ${error.message}`);
  }

  return data;
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
