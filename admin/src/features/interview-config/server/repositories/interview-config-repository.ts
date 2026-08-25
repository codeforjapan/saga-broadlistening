import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { InterviewConfig, InterviewQuestion } from "../../shared/types";

// Epic #54 で interview_configs から bill_id が外れ、施策とは
// policies_interview_configs による多対多になった。bill という名前の
// 改名は Epic #8 完了後のフォローアップで行う。
export type InterviewConfigWithBill = InterviewConfig & {
  bill: { id: string; name: string } | null;
};

export async function findAllInterviewConfigs(): Promise<
  InterviewConfigWithBill[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select("*, policies_interview_configs(policies(id, name))")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch interview configs: ${error.message}`);
  }

  // 1つの意見募集に複数の施策が紐づく場合、既存 UI は最初の1件だけを表示する
  return data.map(({ policies_interview_configs, ...config }) => ({
    ...config,
    bill: policies_interview_configs[0]?.policies ?? null,
  }));
}

export async function findInterviewConfigsByPolicyId(
  policyId: string
): Promise<InterviewConfig[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_interview_configs")
    .select("interview_configs!inner(*)")
    .eq("policy_id", policyId)
    .order("created_at", {
      ascending: false,
      referencedTable: "interview_configs",
    });

  if (error) {
    throw new Error(`Failed to fetch interview configs: ${error.message}`);
  }

  return data.map((row) => row.interview_configs);
}

export async function findInterviewConfigById(
  configId: string
): Promise<InterviewConfig | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select("*")
    .eq("id", configId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch interview config: ${error.message}`);
  }

  return data;
}

export async function findPolicyIdsByInterviewConfigId(
  configId: string
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_interview_configs")
    .select("policy_id")
    .eq("interview_config_id", configId);

  if (error) {
    throw new Error(`Failed to fetch linked policies: ${error.message}`);
  }

  return data.map((row) => row.policy_id);
}

export async function linkPolicyToInterviewConfig(
  policyId: string,
  configId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("policies_interview_configs")
    .upsert(
      { policy_id: policyId, interview_config_id: configId },
      { onConflict: "policy_id,interview_config_id" }
    );

  if (error) {
    throw new Error(`Failed to link policy to config: ${error.message}`);
  }
}

export async function unlinkPolicyFromInterviewConfig(
  policyId: string,
  configId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("policies_interview_configs")
    .delete()
    .eq("policy_id", policyId)
    .eq("interview_config_id", configId);

  if (error) {
    throw new Error(`Failed to unlink policy from config: ${error.message}`);
  }
}

export async function findInterviewQuestionsByConfigId(
  interviewConfigId: string
): Promise<InterviewQuestion[]> {
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

/**
 * 同じ施策に紐づく他の募集中（open）の意見募集をまとめて終了する
 */
export async function closeOtherOpenConfigs(
  policyId: string,
  excludeConfigId?: string
): Promise<void> {
  const configIds = await findInterviewConfigIdsByPolicyId(policyId);
  const targetIds = excludeConfigId
    ? configIds.filter((id) => id !== excludeConfigId)
    : configIds;

  if (targetIds.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_configs")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .in("id", targetIds)
    .eq("status", "open");

  if (error) {
    throw new Error(`Failed to close interview configs: ${error.message}`);
  }
}

async function findInterviewConfigIdsByPolicyId(
  policyId: string
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_interview_configs")
    .select("interview_config_id")
    .eq("policy_id", policyId);

  if (error) {
    throw new Error(`Failed to fetch interview configs: ${error.message}`);
  }

  return data.map((row) => row.interview_config_id);
}

export async function createInterviewConfigRecord(params: {
  name: string;
  slug: string;
  status: "draft" | "open" | "closed";
  description: string | null;
  chat_model: string;
  estimated_duration: number | null;
}): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .insert(params)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create interview config: ${error.message}`);
  }

  return data;
}

export async function updateInterviewConfigRecord(
  configId: string,
  params: {
    name: string;
    slug: string;
    status: "draft" | "open" | "closed";
    description: string | null;
    chat_model: string;
    estimated_duration: number | null;
    updated_at: string;
  }
): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .update(params)
    .eq("id", configId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update interview config: ${error.message}`);
  }

  return data;
}

export async function countSessionsByConfigIds(
  configIds: string[]
): Promise<Record<string, number>> {
  if (configIds.length === 0) return {};

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("count_sessions_by_config_ids", {
    p_config_ids: configIds,
  });

  if (error) {
    throw new Error(`Failed to count sessions: ${error.message}`);
  }

  const result: Record<string, number> = {};
  for (const configId of configIds) {
    result[configId] = 0;
  }
  for (const row of data) {
    result[row.interview_config_id] = Number(row.session_count);
  }
  return result;
}

/**
 * インタビュー設定を物理削除する
 * 複製時のロールバックなど、作成直後のレコードを完全に取り消す用途で使用する
 */
export async function deleteInterviewConfigRecord(
  configId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_configs")
    .delete()
    .eq("id", configId);

  if (error) {
    throw new Error(`Failed to delete interview config: ${error.message}`);
  }
}

/**
 * インタビュー設定を終了状態にする（旧 deleted_at による論理削除の置き換え）。
 * 紐づく質問・セッション・意見は保持され、status="open" を見る公開判定
 * （施策一覧の「AIインタビュー受付中」バッジ等）から除外される。
 */
export async function closeInterviewConfigRecord(
  configId: string
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("interview_configs")
    .update({ status: "closed", updated_at: now })
    .eq("id", configId);

  if (error) {
    throw new Error(`Failed to close interview config: ${error.message}`);
  }
}

/**
 * 終了した意見募集に紐づく意見を公開停止する（review_status='hidden'）。
 * 公開意見の全取得経路（個別ページ・公開一覧・各 RPC）が
 * review_status='published' でゲートしているため、これにより一括で
 * 公開対象から除外される。
 *
 * セッション数が PostgREST の行数上限（既定1000件）を超える設定でも漏れなく
 * 更新できるよう、DB側の UPDATE で一括処理する RPC を利用する。
 */
export async function unpublishReportsByConfigId(
  configId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("unpublish_opinions_by_config_id", {
    p_config_id: configId,
  });

  if (error) {
    throw new Error(`Failed to unpublish reports: ${error.message}`);
  }
}

export async function createInterviewQuestions(
  questions: {
    interview_config_id: string;
    question: string;
    follow_up_guide: string | null;
    quick_replies: string[] | null;
    question_order: number;
  }[]
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_questions")
    .insert(questions);

  if (error) {
    throw new Error(`Failed to create interview questions: ${error.message}`);
  }
}

export async function deleteInterviewQuestionsByConfigId(
  interviewConfigId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_questions")
    .delete()
    .eq("interview_config_id", interviewConfigId);

  if (error) {
    throw new Error(`Failed to delete interview questions: ${error.message}`);
  }
}
