import "server-only";

import { isPublicReportVisible } from "@mirai-gikai/shared/report-publication/auto-publish";
import { createAdminClient } from "@mirai-gikai/supabase";
import { countPublicOpinionsByInterviewConfigId } from "@/features/interview-report/server/repositories/interview-report-repository";
import type { ReactionCounts, ReactionType } from "../../shared/types";

// Epic #54 で report_reactions → opinion_reactions（interview_report_id → opinion_id）に
// 再定義された。ファイル名・関数名（*Report*）の改名は Epic #8 完了後のフォローアップ。

/**
 * 意見が公開されているか確認する
 * review_status（公開状態の正本）と公開済み件数の表示ゲートを満たす場合のみ公開
 */
export async function getReportPublicStatus(
  reportId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinions")
    .select("review_status, interview_sessions!inner(interview_config_id)")
    .eq("id", reportId)
    .single();

  if (error || !data) {
    return false;
  }

  const interviewConfigId = data.interview_sessions?.interview_config_id;
  if (!interviewConfigId) {
    return false;
  }

  const publicOpinionCount =
    await countPublicOpinionsByInterviewConfigId(interviewConfigId);
  return isPublicReportVisible({
    reviewStatus: data.review_status,
    publicReportCount: publicOpinionCount,
  });
}

/**
 * 意見IDからリアクション数をSQL COUNTで集計して返す
 */
export async function findReactionCountsByReportId(
  reportId: string
): Promise<ReactionCounts> {
  const supabase = createAdminClient();
  const [helpfulResult, hmmResult] = await Promise.all([
    supabase
      .from("opinion_reactions")
      .select("*", { count: "exact", head: true })
      .eq("opinion_id", reportId)
      .eq("reaction_type", "helpful"),
    supabase
      .from("opinion_reactions")
      .select("*", { count: "exact", head: true })
      .eq("opinion_id", reportId)
      .eq("reaction_type", "hmm"),
  ]);

  if (helpfulResult.error) {
    throw new Error(
      `Failed to fetch helpful count: ${helpfulResult.error.message}`
    );
  }
  if (hmmResult.error) {
    throw new Error(`Failed to fetch hmm count: ${hmmResult.error.message}`);
  }

  return {
    helpful: helpfulResult.count ?? 0,
    hmm: hmmResult.count ?? 0,
  };
}

/**
 * ユーザーの現在のリアクションを取得
 */
export async function findUserReaction(
  reportId: string,
  userId: string
): Promise<ReactionType | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinion_reactions")
    .select("reaction_type")
    .eq("opinion_id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user reaction: ${error.message}`);
  }

  return data ? (data.reaction_type as ReactionType) : null;
}

/**
 * リアクションをupsert（なければ挿入、あれば更新）
 */
export async function upsertReaction(
  reportId: string,
  userId: string,
  reactionType: ReactionType
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("opinion_reactions").upsert(
    {
      opinion_id: reportId,
      user_id: userId,
      reaction_type: reactionType,
    },
    { onConflict: "opinion_id,user_id" }
  );

  if (error) {
    throw new Error(`Failed to upsert reaction: ${error.message}`);
  }
}

/**
 * リアクションを削除
 */
export async function deleteReaction(
  reportId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("opinion_reactions")
    .delete()
    .eq("opinion_id", reportId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete reaction: ${error.message}`);
  }
}

/**
 * 複数意見のリアクション数をDB側で集約して一括取得
 * RPC関数でGROUP BY集計を行い、転送量を最小化する
 */
export async function findReactionCountsByReportIds(
  reportIds: string[]
): Promise<Map<string, ReactionCounts>> {
  const countsMap = new Map<string, ReactionCounts>();
  if (reportIds.length === 0) return countsMap;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("count_reactions_by_opinion_ids", {
    opinion_ids: reportIds,
  });

  if (error) {
    throw new Error(`Failed to fetch reaction counts: ${error.message}`);
  }

  for (const row of data) {
    const counts = countsMap.get(row.opinion_id) ?? {
      helpful: 0,
      hmm: 0,
    };
    counts[row.reaction_type as ReactionType] = Number(row.cnt);
    countsMap.set(row.opinion_id, counts);
  }

  return countsMap;
}

/**
 * 複数意見に対するユーザーのリアクションを一括取得
 */
export async function findUserReactionsByReportIds(
  reportIds: string[],
  userId: string
): Promise<Map<string, ReactionType>> {
  const reactionsMap = new Map<string, ReactionType>();
  if (reportIds.length === 0) return reactionsMap;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinion_reactions")
    .select("opinion_id, reaction_type")
    .in("opinion_id", reportIds)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to fetch user reactions: ${error.message}`);
  }

  for (const row of data) {
    reactionsMap.set(row.opinion_id, row.reaction_type as ReactionType);
  }

  return reactionsMap;
}
