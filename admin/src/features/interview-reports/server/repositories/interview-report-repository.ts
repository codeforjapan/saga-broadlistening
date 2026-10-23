import "server-only";

import { shouldAutoPublishOnUserSettingChange } from "@mirai-gikai/shared/report-publication/auto-publish";
import { resolveAdminVisibilityUpdate } from "@mirai-gikai/shared/report-publication/review-status";
import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  MessageSearchFilterConfig,
  SessionFilterConfig,
} from "../../shared/types";
import { DEFAULT_SESSION_FILTER } from "../../shared/types";
import { escapeIlikePattern } from "../../shared/utils/escape-ilike-pattern";
import { hasReportLevelSearchFilters } from "../../shared/utils/parse-message-search-filter-params";

// Epic #54 で interview_report → opinions、report_reactions → opinion_reactions に
// 再定義された。呼び出し側の変更を抑えるため、埋め込みは
// `interview_report:opinions(...)` のエイリアスで受けている。
// bill / report という名前の改名は Epic #8 完了後のフォローアップで行う。

function toRpcFilterParams(filters: SessionFilterConfig) {
  return {
    p_status: filters.status !== "all" ? (filters.status as string) : undefined,
    p_visibility:
      filters.visibility !== "all" ? (filters.visibility as string) : undefined,
  };
}

function hasReportLevelFilters(filters: SessionFilterConfig): boolean {
  return filters.visibility !== "all" || filters.moderation !== "all";
}

export async function findInterviewSessionsWithReport(
  configId: string,
  from: number,
  to: number,
  orderBy: {
    column: string;
    ascending: boolean;
  } = { column: "started_at", ascending: false },
  filters: SessionFilterConfig = DEFAULT_SESSION_FILTER
) {
  const supabase = createAdminClient();
  const useInnerJoin = hasReportLevelFilters(filters);
  const selectQuery = useInnerJoin
    ? "*, interview_report:opinions!inner(*)"
    : "*, interview_report:opinions(*)";

  let query = supabase
    .from("interview_sessions")
    .select(selectQuery)
    .eq("interview_config_id", configId);

  // ステータスフィルタ
  if (filters.status === "completed") {
    query = query.not("completed_at", "is", null);
  } else if (filters.status === "in_progress") {
    query = query.is("completed_at", null).is("archived_at", null);
  } else if (filters.status === "archived") {
    query = query.is("completed_at", null).not("archived_at", "is", null);
  }

  // レポートレベルフィルタ（inner join使用時のみ有効）
  // 公開状態の正本は review_status
  if (filters.visibility === "public") {
    query = query.eq("interview_report.review_status", "published");
  } else if (filters.visibility === "private") {
    query = query.neq("interview_report.review_status", "published");
  }

  if (filters.moderation === "unscored") {
    query = query.is("interview_report.moderation_score", null);
  } else if (filters.moderation !== "all") {
    query = query.eq("interview_report.moderation_status", filters.moderation);
  }

  const { data, error } = await query
    .order(orderBy.column, { ascending: orderBy.ascending })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch interview sessions: ${error.message}`);
  }

  return data;
}

export async function findSessionIdsOrderedByMessageCount(
  configId: string,
  ascending: boolean,
  offset: number,
  limit: number,
  filters: SessionFilterConfig = DEFAULT_SESSION_FILTER
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "find_sessions_ordered_by_message_count",
    {
      p_config_id: configId,
      p_ascending: ascending,
      p_offset: offset,
      p_limit: limit,
      ...toRpcFilterParams(filters),
    }
  );

  if (error) {
    throw new Error(
      `Failed to fetch sessions ordered by message count: ${error.message}`
    );
  }

  return (data || []).map((row) => row.session_id);
}

export async function findInterviewSessionsWithReportByIds(
  sessionIds: string[]
) {
  if (sessionIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select(
      `
      *,
      interview_report:opinions(*)
    `
    )
    .in("id", sessionIds);

  if (error) {
    throw new Error(`Failed to fetch interview sessions: ${error.message}`);
  }

  // Preserve the order of sessionIds
  const dataMap = new Map(data.map((s) => [s.id, s]));
  return sessionIds.map((id) => dataMap.get(id)).filter(Boolean) as typeof data;
}

export async function findSessionIdsOrderedByTotalContentRichness(
  configId: string,
  ascending: boolean,
  offset: number,
  limit: number,
  filters: SessionFilterConfig = DEFAULT_SESSION_FILTER
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "find_sessions_ordered_by_total_content_richness",
    {
      p_config_id: configId,
      p_ascending: ascending,
      p_offset: offset,
      p_limit: limit,
      ...toRpcFilterParams(filters),
    }
  );

  if (error) {
    throw new Error(
      `Failed to fetch sessions ordered by total content richness: ${error.message}`
    );
  }

  return (data || []).map((row) => row.session_id);
}

export async function findSessionIdsOrderedByHelpfulCount(
  configId: string,
  ascending: boolean,
  offset: number,
  limit: number,
  filters: SessionFilterConfig = DEFAULT_SESSION_FILTER
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "find_sessions_ordered_by_helpful_count",
    {
      p_config_id: configId,
      p_ascending: ascending,
      p_offset: offset,
      p_limit: limit,
      ...toRpcFilterParams(filters),
    }
  );

  if (error) {
    throw new Error(
      `Failed to fetch sessions ordered by helpful count: ${error.message}`
    );
  }

  return (data || []).map((row) => row.session_id);
}

export async function findSessionIdsOrderedByModerationScore(
  configId: string,
  ascending: boolean,
  offset: number,
  limit: number,
  filters: SessionFilterConfig = DEFAULT_SESSION_FILTER
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "find_sessions_ordered_by_moderation_score",
    {
      p_config_id: configId,
      p_ascending: ascending,
      p_offset: offset,
      p_limit: limit,
      ...toRpcFilterParams(filters),
    }
  );

  if (error) {
    throw new Error(
      `Failed to fetch sessions ordered by moderation score: ${error.message}`
    );
  }

  return (data || []).map((row) => row.session_id);
}

export async function findHelpfulCountsByReportIds(
  reportIds: string[]
): Promise<Map<string, number>> {
  const countsMap = new Map<string, number>();
  if (reportIds.length === 0) return countsMap;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("count_reactions_by_opinion_ids", {
    opinion_ids: reportIds,
  });

  if (error) {
    throw new Error(`Failed to fetch helpful counts: ${error.message}`);
  }

  for (const row of data) {
    if (row.reaction_type === "helpful") {
      countsMap.set(row.opinion_id, Number(row.cnt));
    }
  }

  return countsMap;
}

export async function findInterviewMessageCounts(sessionIds: string[]) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_interview_message_counts", {
    session_ids: sessionIds,
  });

  if (error) {
    throw new Error(`Failed to fetch message counts: ${error.message}`);
  }

  return data;
}

export async function countInterviewSessionsByConfigId(
  configId: string,
  filters: SessionFilterConfig = DEFAULT_SESSION_FILTER
): Promise<number> {
  const supabase = createAdminClient();
  const useInnerJoin = hasReportLevelFilters(filters);
  const selectQuery = useInnerJoin
    ? "*, interview_report:opinions!inner(*)"
    : "*";

  let query = supabase
    .from("interview_sessions")
    .select(selectQuery, { count: "exact", head: true })
    .eq("interview_config_id", configId);

  // ステータスフィルタ
  if (filters.status === "completed") {
    query = query.not("completed_at", "is", null);
  } else if (filters.status === "in_progress") {
    query = query.is("completed_at", null).is("archived_at", null);
  } else if (filters.status === "archived") {
    query = query.is("completed_at", null).not("archived_at", "is", null);
  }

  // レポートレベルフィルタ
  if (filters.visibility === "public") {
    query = query.eq("interview_report.review_status", "published");
  } else if (filters.visibility === "private") {
    query = query.neq("interview_report.review_status", "published");
  }

  if (filters.moderation === "unscored") {
    query = query.is("interview_report.moderation_score", null);
  } else if (filters.moderation !== "all") {
    query = query.eq("interview_report.moderation_status", filters.moderation);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch session count: ${error.message}`);
  }

  return count || 0;
}

export async function findInterviewSessionById(sessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch interview session: ${error.message}`);
  }

  return data;
}

export async function findInterviewReportBySessionId(sessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinions")
    .select("*")
    .eq("interview_session_id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch interview report: ${error.message}`);
  }

  return data;
}

/**
 * 意見に紐づく論点単位の意見（opinion_segments）を順番どおりに取得する。
 * 旧 interview_report.opinions（JSONB）の置き換え。
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

  return data ?? [];
}

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

export async function searchUserMessagesByConfigId(
  configId: string,
  query: string,
  limit: number,
  filters: MessageSearchFilterConfig
) {
  const supabase = createAdminClient();
  // レポートレベルのフィルタ指定時のみ interview_report まで inner join し、
  // レポート未生成のセッションを除外する。
  // embed のカラムはフィルタにのみ使うため取得しない（空の embed でも
  // inner join とネストしたフィルタは機能する）
  const selectQuery = hasReportLevelSearchFilters(filters)
    ? "id, interview_session_id, content, created_at, interview_sessions!inner(interview_report:opinions!inner())"
    : "id, interview_session_id, content, created_at, interview_sessions!inner()";

  let queryBuilder = supabase
    .from("interview_messages")
    .select(selectQuery)
    .eq("role", "user")
    .eq("interview_sessions.interview_config_id", configId)
    .ilike("content", `%${escapeIlikePattern(query)}%`);

  if (filters.roleTitle !== "") {
    queryBuilder = queryBuilder.ilike(
      "interview_sessions.interview_report.role_title",
      `%${escapeIlikePattern(filters.roleTitle)}%`
    );
  }

  const { data, error } = await queryBuilder
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search user messages: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    interview_session_id: row.interview_session_id,
    content: row.content,
    created_at: row.created_at,
  }));
}

export async function findReactionCountsByReportId(
  reportId: string
): Promise<{ helpful: number }> {
  const supabase = createAdminClient();
  const helpfulResult = await supabase
    .from("opinion_reactions")
    .select("*", { count: "exact", head: true })
    .eq("opinion_id", reportId)
    .eq("reaction_type", "helpful");

  if (helpfulResult.error) {
    throw new Error(
      `Failed to fetch helpful count: ${helpfulResult.error.message}`
    );
  }

  return {
    helpful: helpfulResult.count ?? 0,
  };
}

export async function findFeedbackTagsBySessionId(
  sessionId: string
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_rating_feedbacks")
    .select("tag")
    .eq("interview_session_id", sessionId);

  if (error) {
    throw new Error(`Failed to fetch feedback tags: ${error.message}`);
  }

  return (data || []).map((row) => row.tag);
}

export type InterviewMetricsByConfigRow = {
  interview_config_id: string;
  interview_config_name: string;
  conducted_count: number;
  completed_count: number;
  completion_rate: number;
  total_duration_seconds: number;
};

/**
 * 意見募集ごとのAIインタビュー実施数・完了数・完了率・総回答時間を取得する。
 * configId を指定すると単一テーマに絞り込み、省略すると全テーマを返す。
 */
export async function findInterviewMetricsByConfig(
  configId?: string
): Promise<InterviewMetricsByConfigRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "get_interview_metrics_by_config",
    { p_interview_config_id: configId }
  );

  if (error) {
    throw new Error(
      `Failed to fetch interview metrics by config: ${error.message}`
    );
  }

  return data ?? [];
}

export async function findInterviewStatistics(configId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_interview_statistics", {
    p_config_id: configId,
  });

  if (error) {
    throw new Error(`Failed to fetch interview statistics: ${error.message}`);
  }

  return data?.[0] ?? null;
}

export async function findQuestionAnswerCounts(configId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_question_answer_counts", {
    p_config_id: configId,
  });

  if (error) {
    throw new Error(`Failed to fetch question answer counts: ${error.message}`);
  }

  return data ?? [];
}

export async function updateReportVisibility(
  reportId: string,
  isPublic: boolean,
  reviewedBy: string
): Promise<void> {
  const supabase = createAdminClient();

  // published にできるのは市民本人の公開同意が揃っているときだけなので、
  // 現在の is_public_by_user を読んでから遷移を決める。
  const { data: opinion, error: fetchError } = await supabase
    .from("opinions")
    .select("is_public_by_user")
    .eq("id", reportId)
    .single();

  if (fetchError) {
    throw new Error(
      `Failed to fetch opinion for visibility update: ${fetchError.message}`
    );
  }

  // 職員が非公開にした判断は review_status='hidden' として残し、ユーザー操作による
  // 自動公開で公開停止が覆されないようにする（旧 admin_unpublished_at の役割）。
  const { error } = await supabase
    .from("opinions")
    .update({
      ...resolveAdminVisibilityUpdate({
        isPublic,
        isPublicByUser: opinion.is_public_by_user,
      }),
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    throw new Error(`Failed to update report visibility: ${error.message}`);
  }
}

export async function findReportForModerationScoringById(reportId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinions")
    .select(
      "id, interview_session_id, summary, role_description, opinion_segments(opinion_index, title, content)"
    )
    .eq("id", reportId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(
      `Failed to fetch report for moderation scoring: ${error.message}`
    );
  }

  return data;
}

/**
 * opinions テーブルからIDをページネーション付きで取得するヘルパー
 */
async function fetchReportIdsPaginated(options?: {
  unscoredOnly?: boolean;
}): Promise<string[]> {
  const supabase = createAdminClient();
  const PAGE_SIZE = 500;
  const allIds: string[] = [];
  let offset = 0;

  while (true) {
    let query = supabase.from("opinions").select("id");

    if (options?.unscoredOnly) {
      query = query.is("moderation_score", null);
    }

    const { data, error } = await query
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch report ids: ${error.message}`);
    }

    allIds.push(...data.map((r) => r.id));

    if (data.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return allIds;
}

/**
 * モデレーション未評価のレポートIDのみを取得する
 */
export async function findUnscoredReportIds(): Promise<string[]> {
  return fetchReportIdsPaginated({ unscoredOnly: true });
}

/**
 * 全レポートIDを取得する（再評価用）
 */
export async function findAllReportIds(): Promise<string[]> {
  return fetchReportIdsPaginated();
}

export async function updateModerationScore(
  reportId: string,
  params: {
    score: number;
    reasoning: string;
  }
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("opinions")
    .update({
      moderation_score: params.score,
      moderation_reasoning: params.reasoning,
    })
    .eq("id", reportId);

  if (error) {
    throw new Error(`Failed to update moderation score: ${error.message}`);
  }

  await publishReportIfAutoPublishEligible(reportId);
}

export async function updateContentRichness(
  reportId: string,
  contentRichness: {
    total: number;
    clarity: number;
    specificity: number;
    impact: number;
    constructiveness: number;
    reasoning: string;
  }
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("opinions")
    .update({
      content_richness: contentRichness,
    })
    .eq("id", reportId);

  if (error) {
    throw new Error(`Failed to update content richness: ${error.message}`);
  }

  await publishReportIfAutoPublishEligible(reportId);
}

export async function publishReportIfAutoPublishEligible(
  reportId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: report, error: fetchError } = await supabase
    .from("opinions")
    .select(
      "is_public_by_user, is_public_by_admin, moderation_score, total_content_richness, review_status"
    )
    .eq("id", reportId)
    .single();

  if (fetchError) {
    throw new Error(
      `Failed to fetch report for auto publish: ${fetchError.message}`
    );
  }

  // 職員が非公開にした意見（hidden）は自動公開の対象外
  if (
    !shouldAutoPublishOnUserSettingChange({
      isPublicByAdmin: report.is_public_by_admin,
      reviewStatus: report.review_status,
      isPublicByUser: report.is_public_by_user,
      moderationScore: report.moderation_score,
      totalContentRichness: report.total_content_richness,
    })
  ) {
    return false;
  }

  const { error } = await supabase
    .from("opinions")
    .update({ is_public_by_admin: true, review_status: "published" })
    .eq("id", reportId);

  if (error) {
    throw new Error(`Failed to auto publish report: ${error.message}`);
  }

  return true;
}
