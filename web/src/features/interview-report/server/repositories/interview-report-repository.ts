import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { resolveOpinionPublicSettingUpdate } from "../../shared/utils/resolve-review-status";
import type { SortOrder } from "../../shared/utils/sort-order";

// Epic #54 で interview_report → opinions に再定義され、公開状態の正本は
// review_status になった。ファイル名・関数名（*Report*）の改名は
// Epic #8 完了後のフォローアップ。

/** 意見・セッション・意見募集・施策を一度に引くための select 句 */
const OPINION_WITH_SESSION_SELECT =
  "*, interview_sessions(user_id, started_at, completed_at, interview_config_id, interview_configs(policies_interview_configs(policy_id)))";

/**
 * 意見IDから意見とセッション情報を結合取得
 */
export async function findReportWithSessionById(reportId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinions")
    .select(OPINION_WITH_SESSION_SELECT)
    .eq("id", reportId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch opinion: ${error.message}`);
  }

  return data;
}

/**
 * セッションIDから意見を取得
 */
export async function findReportBySessionId(sessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinions")
    .select("*")
    .eq("interview_session_id", sessionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch opinion: ${error.message}`);
  }

  return data;
}

/**
 * 意見IDから論点単位の意見（opinion_segments）を取得（表示順）
 */
export async function findOpinionSegmentsByOpinionId(opinionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinion_segments")
    .select("title, content, source_message_id")
    .eq("opinion_id", opinionId)
    .order("opinion_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch opinion segments: ${error.message}`);
  }

  return data;
}

/**
 * セッションIDからインタビューメッセージ一覧を取得（作成日時昇順）
 */
export async function findMessagesBySessionId(sessionId: string) {
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
 * 施策IDから施策情報を取得（policy_contentsを結合）
 */
export async function findBillWithContentById(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select(
      "id, name, thumbnail_url, share_thumbnail_url, policy_contents(title)"
    )
    .eq("id", billId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch policy: ${error.message}`);
  }

  return data;
}

/**
 * 意見募集IDから公開意見を取得（おすすめ順 / 新着順、件数制限あり）
 * 公開条件: review_status = 'published'
 */
export async function findPublicOpinionsByConfigId(
  interviewConfigId: string,
  limit: number = 3,
  offset: number = 0,
  sortOrder: SortOrder = "recommended"
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "find_public_opinions_by_config_id_ordered_by_reactions",
    {
      p_interview_config_id: interviewConfigId,
      p_limit: limit,
      p_offset: offset,
      p_sort_order: sortOrder,
    }
  );

  if (error) {
    throw new Error(`Failed to fetch public opinions: ${error.message}`);
  }

  return data;
}

/**
 * 意見募集IDの公開意見件数を取得
 */
// 公開意見件数のカウントは web・admin MCP で共有するため
// @mirai-gikai/shared に集約。既存の呼び出し元はこの re-export 経由で参照する。
export { countPublicOpinionsByInterviewConfigId } from "@mirai-gikai/shared/report-publication/count-public-reports";

/**
 * 公開意見をIDから取得（認証不要）
 * 公開条件: review_status = 'published'
 */
export async function findPublicReportWithSessionById(reportId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinions")
    .select(OPINION_WITH_SESSION_SELECT)
    .eq("id", reportId)
    .eq("review_status", "published")
    .single();

  if (error) {
    // 公開条件を満たす意見が存在しない場合（非公開・終了した意見募集配下など）は
    // null を返す。呼び出し側で notFound（404）として扱う。
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch public opinion: ${error.message}`);
  }

  return data;
}

/**
 * ユーザーの過去の意見を取得（指定interview_config配下、新しい順）
 */
export async function findUserReportsByInterviewConfigId(
  interviewConfigId: string,
  userId: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinions")
    .select(
      "id, role_title, summary, created_at, interview_sessions!inner(interview_config_id, user_id)"
    )
    .eq("interview_sessions.interview_config_id", interviewConfigId)
    .eq("interview_sessions.user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch user opinions: ${error.message}`);
  }

  return data;
}

/**
 * 意見の公開設定を更新
 */
export async function updateReportPublicSetting(
  reportId: string,
  isPublic: boolean,
  isDataReuseConsented?: boolean
) {
  const supabase = createAdminClient();

  const { data: report, error: fetchError } = await supabase
    .from("opinions")
    .select(
      "is_public_by_admin, review_status, moderation_score, total_content_richness"
    )
    .eq("id", reportId)
    .single();

  if (fetchError) {
    throw new Error(
      `Failed to fetch opinion for public setting: ${fetchError.message}`
    );
  }

  // 二次利用（オープンデータ提供）同意は、新規約の告知を表示したUIが
  // 明示的に渡した場合のみ更新する（告知を表示していない旧クライアント
  // からの呼び出しで同意ありと記録してしまうことを防ぐ）
  const updateValues = {
    is_public_by_user: isPublic,
    ...(typeof isDataReuseConsented === "boolean"
      ? { is_data_reuse_consented: isDataReuseConsented }
      : {}),
    ...resolveOpinionPublicSettingUpdate({
      isPublicByUser: isPublic,
      isPublicByAdmin: report.is_public_by_admin,
      reviewStatus: report.review_status,
      moderationScore: report.moderation_score,
      totalContentRichness: report.total_content_richness,
    }),
  };

  const { error } = await supabase
    .from("opinions")
    .update(updateValues)
    .eq("id", reportId);

  if (error) {
    throw new Error(`Failed to update public setting: ${error.message}`);
  }
}
