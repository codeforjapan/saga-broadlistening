import "server-only";

import type { OpinionReviewStatus } from "@mirai-gikai/shared/report-publication/review-status";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";
import type {
  InterviewMessage,
  InterviewReport,
  InterviewReportInsert,
  InterviewSession,
} from "../../shared/types";

// Epic #54 で interview_report → opinions に再定義された。
// 関数名（*InterviewReport）の改名は Epic #8 完了後のフォローアップ。

// ========================================
// Interview Sessions
// ========================================

/**
 * アクティブ（未完了・未アーカイブ）なインタビューセッションを取得
 *
 * 判定対象は「最新の未アーカイブセッション」のみで、それが完了済みなら null を返す。
 * 完了済みセッションを飛び越えて古い未完了セッションを拾うと、LP の
 * findLatestNonArchivedSession（最新の未アーカイブセッション）による表示と食い違い、
 * 「もう一度新たに回答する」を押したのに過去の途中経過から再開されてしまう。
 */
export async function findActiveInterviewSession(
  interviewConfigId: string,
  userId: string
): Promise<InterviewSession | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("interview_config_id", interviewConfigId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch active interview session: ${error.message}`
    );
  }

  if (!data || data.completed_at !== null) {
    return null;
  }

  return data;
}

/**
 * セッションIDからインタビューセッション（紐づく施策ID付き）を取得
 *
 * 施策と意見募集は多対多になったため、施策IDは
 * interview_configs → policies_interview_configs 経由で引く。
 */
export async function findInterviewSessionWithConfigById(sessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*, interview_configs(policies_interview_configs(policy_id))")
    .eq("id", sessionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch interview session: ${error.message}`);
  }

  return data;
}

/**
 * 最新の未アーカイブセッション（完了済みも含む）を取得
 */
export async function findLatestNonArchivedSession(
  interviewConfigId: string,
  userId: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("id, completed_at, opinions(id)")
    .eq("interview_config_id", interviewConfigId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch latest interview session: ${error.message}`
    );
  }

  return data;
}

/**
 * セッションの所有者情報（user_id）を取得
 */
export async function findSessionOwnerById(sessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch session owner: ${error.message}`);
  }

  return data;
}

/**
 * 新しいインタビューセッションを作成
 */
export async function createInterviewSessionRecord(params: {
  interviewConfigId: string;
  userId: string;
}): Promise<InterviewSession> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .insert({
      interview_config_id: params.interviewConfigId,
      user_id: params.userId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create interview session: ${error.message}`);
  }

  return data;
}

/**
 * セッションをアーカイブ
 */
export async function updateInterviewSessionArchived(
  sessionId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_sessions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Failed to archive interview session: ${error.message}`);
  }
}

/**
 * セッションを完了
 */
export async function updateInterviewSessionCompleted(
  sessionId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Failed to complete interview session: ${error.message}`);
  }
}

// ========================================
// Interview Messages
// ========================================

/**
 * セッションのメッセージを時系列順で取得
 */
export async function findInterviewMessagesBySessionId(
  sessionId: string
): Promise<InterviewMessage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_messages")
    .select("*")
    .eq("interview_session_id", sessionId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch interview messages: ${error.message}`);
  }

  return data || [];
}

/**
 * セッションのメッセージを新しい順で取得
 */
export async function findInterviewMessagesBySessionIdDesc(
  sessionId: string
): Promise<InterviewMessage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_messages")
    .select("*")
    .eq("interview_session_id", sessionId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch interview messages: ${error.message}`);
  }

  return data || [];
}

/**
 * インタビューメッセージを保存
 */
export async function createInterviewMessage(params: {
  sessionId: string;
  role: "assistant" | "user";
  content: string;
}): Promise<InterviewMessage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_messages")
    .insert({
      interview_session_id: params.sessionId,
      role: params.role,
      content: params.content,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save interview message: ${error.message}`);
  }

  return data;
}

// ========================================
// Interview Session Ratings
// ========================================

/**
 * セッションの星評価（1〜5）を保存
 */
export async function updateInterviewSessionRating(
  sessionId: string,
  rating: number
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_sessions")
    .update({ rating })
    .eq("id", sessionId)
    .is("rating", null);

  if (error) {
    throw new Error(
      `Failed to save interview session rating: ${error.message}`
    );
  }
}

/**
 * セッションの星評価を取得
 */
export async function findSessionRatingById(
  sessionId: string
): Promise<number | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("rating")
    .eq("id", sessionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch session rating: ${error.message}`);
  }

  return data.rating;
}

// ========================================
// Interview Rating Feedbacks
// ========================================

/**
 * 低評価フィードバックタグを保存（複数タグ一括、冪等）
 */
export async function insertInterviewRatingFeedbacks(
  sessionId: string,
  tags: string[]
): Promise<void> {
  if (tags.length === 0) return;

  const supabase = createAdminClient();
  const uniqueTags = [...new Set(tags)];
  const rows = uniqueTags.map((tag) => ({
    interview_session_id: sessionId,
    tag: tag as Database["public"]["Enums"]["interview_feedback_tag_enum"],
  }));

  const { error } = await supabase
    .from("interview_rating_feedbacks")
    .upsert(rows, {
      onConflict: "interview_session_id,tag",
      ignoreDuplicates: true,
    });

  if (error) {
    throw new Error(
      `Failed to save interview rating feedbacks: ${error.message}`
    );
  }
}

// ========================================
// Interview Reports
// ========================================

/**
 * インタビューレポートをUPSERT
 */
/**
 * セッションに紐づく既存の意見の公開状態だけを引く（未作成なら null）。
 * 再完了時に、職員が非公開にした判断（hidden）を上書きしないために使う。
 */
export async function findOpinionPublicationStateBySessionId(
  sessionId: string
): Promise<{
  is_public_by_admin: boolean;
  review_status: OpinionReviewStatus;
} | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinions")
    .select("is_public_by_admin, review_status")
    .eq("interview_session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch opinion publication state: ${error.message}`
    );
  }

  return data;
}

export async function upsertInterviewReport(
  params: InterviewReportInsert
): Promise<InterviewReport> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinions")
    .upsert(params, { onConflict: "interview_session_id" })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save interview report: ${error.message}`);
  }

  return data;
}
