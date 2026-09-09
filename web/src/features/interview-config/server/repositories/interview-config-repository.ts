import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";

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

/** 公開判定と施策コンテキストの解決に必要な紐付けを含めて引くための select 句 */
const CONFIG_WITH_POLICIES_SELECT =
  "*, policies_interview_configs(policies(id, publish_status))";

/** slug 引きの取得結果（募集中・結果表示用で同じ select を使う）。 */
export type InterviewConfigWithPoliciesResult = Awaited<
  ReturnType<typeof findInterviewConfigWithPoliciesBySlug>
>;

/** slug から意見募集を、紐づく施策つきで1件取得する（対象ステータスは呼び出し側が決める）。 */
function findInterviewConfigWithPoliciesBySlug(
  slug: string,
  statuses: Database["public"]["Enums"]["interview_config_status_enum"][]
) {
  const supabase = createAdminClient();
  return supabase
    .from("interview_configs")
    .select(CONFIG_WITH_POLICIES_SELECT)
    .eq("slug", slug)
    .in("status", statuses)
    .maybeSingle();
}

/**
 * slug から募集中（status = 'open'）の意見募集を、紐づく施策つきで1件取得。
 * テーマ単独の参加導線（/interviews/[slug]）の入口で使う。
 */
export async function findOpenInterviewConfigWithPoliciesBySlug(slug: string) {
  return findInterviewConfigWithPoliciesBySlug(slug, ["open"]);
}

/**
 * slug から結果表示用の意見募集を、紐づく施策つきで1件取得（下書きを除く）。
 *
 * 「募集が終わっても結果は見せる」画面（トピック分析）で使う。
 * 施策経由で findPrimaryInterviewConfigByPolicyId がステータスを問わないのと同じ方針だが、
 * 下書き（draft）のテーマは表に出さない。
 */
export async function findResultsInterviewConfigWithPoliciesBySlug(
  slug: string
) {
  return findInterviewConfigWithPoliciesBySlug(slug, ["open", "closed"]);
}

/**
 * IDから意見募集を、紐づく施策つきで1件取得（ステータス問わず）。
 * チャットAPIのように、公開判定を呼び出し側で行う経路で使う。
 */
export async function findInterviewConfigWithPoliciesById(configId: string) {
  const supabase = createAdminClient();
  return supabase
    .from("interview_configs")
    .select(CONFIG_WITH_POLICIES_SELECT)
    .eq("id", configId)
    .maybeSingle();
}

/** テーマ一覧のカードに出す列（参加人数・施策の画像とタグまで1本で引く） */
const CONFIG_LIST_SELECT = `
  id,
  slug,
  name,
  description,
  estimated_duration,
  thumbnail_url,
  created_at,
  interview_sessions (
    count
  ),
  policies_interview_configs (
    policies (
      publish_status,
      thumbnail_url,
      policies_tags (
        tags (
          label
        )
      )
    )
  )
`;

/**
 * 「募集終了したテーマ」に出す件数の上限。
 * 終了テーマは増え続けるため、新しいものから一定数で打ち切る。
 */
const CLOSED_CONFIG_LIST_LIMIT = 30;

/** カードに出す代表タグは施策ごとに1件だけなので、転送量を増やさない。 */
const PRIMARY_TAG_TABLE =
  "policies_interview_configs.policies.policies_tags" as const;

/**
 * 募集中（open）のテーマを、紐づく施策の表示用情報つきで全件取得する。
 *
 * 参加導線がテーマ単独URLになったため、施策の紐付けが0件のテーマ（抽象テーマ型）も
 * そのまま一覧に載せられる。施策は画像・タグのフォールバック元と公開判定にだけ使うので、
 * 埋め込みは inner join にしない。
 * 参加人数は埋め込み集計（interview_sessions(count)）で同じ1本に含める。
 * 一覧に出す条件と並び順は呼び出し側（buildInterviewThemes）に委ねる。
 */
export async function findOpenInterviewConfigs() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select(CONFIG_LIST_SELECT)
    .eq("status", "open")
    .order("created_at", { referencedTable: PRIMARY_TAG_TABLE })
    .limit(1, { referencedTable: PRIMARY_TAG_TABLE });

  if (error) {
    throw new Error(`Failed to fetch open interview configs: ${error.message}`);
  }

  return data;
}

/**
 * 募集が終わった（closed）テーマのうち、公開中のトピック分析があるものを取得する。
 *
 * 募集終了テーマは参加できないため、一覧に出す意味があるのは結果を読めるものだけ。
 * `topic_analysis_version` を inner join + is_published で絞ることで、
 * 「公開済みの分析があるか」を1本のクエリで判定する
 * （one_published_per_interview_config の部分ユニークインデックスに当たる）。
 */
export async function findClosedInterviewConfigsWithPublishedAnalysis() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select(`${CONFIG_LIST_SELECT}, topic_analysis_version!inner (id)`)
    .eq("status", "closed")
    .eq("topic_analysis_version.is_published", true)
    .order("created_at", { ascending: false })
    .limit(CLOSED_CONFIG_LIST_LIMIT)
    .order("created_at", { referencedTable: PRIMARY_TAG_TABLE })
    .limit(1, { referencedTable: PRIMARY_TAG_TABLE });

  if (error) {
    throw new Error(
      `Failed to fetch closed interview configs: ${error.message}`
    );
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
