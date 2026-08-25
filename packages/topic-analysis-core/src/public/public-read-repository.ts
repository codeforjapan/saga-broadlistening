import "server-only";

import { shouldDisplayPublicReports } from "@mirai-gikai/shared/report-publication/auto-publish";
import { countPublicOpinionsByInterviewConfigId } from "@mirai-gikai/shared/report-publication/count-public-reports";
import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  PublishedVersionMeta,
  RawOpinionRow,
  RawRespondentDetailRow,
  RawRespondentRow,
  RawTopicRow,
  RawTranscriptMessageRow,
} from "./public-types";

export type PublishedAnalysisData = {
  meta: PublishedVersionMeta;
  rawTopics: RawTopicRow[];
};

/**
 * 指定 version のトピック＋論点（§8 判定に必要な opinions 属性込み）を生データで取得する。
 * version の選び方（公開中 / 最新）に依存しない共通処理。フィルタ・集計は純粋関数側で行う。
 */
async function fetchAnalysisData(
  version: { id: string; version: number; completed_at: string | null },
  interviewConfigId: string
): Promise<PublishedAnalysisData> {
  const supabase = createAdminClient();
  const { data: topics, error: topicsError } = await supabase
    .from("topic")
    .select(
      `id, title, description, sort_order,
       topic_opinion(
         opinion_segments(
           id, title, content, contextual_quote, richness, source_message_id, opinion_id,
           opinions!inner(review_status, moderation_status, role_title, created_at)
         )
       )`
    )
    .eq("version_id", version.id)
    .order("sort_order", { ascending: true });
  if (topicsError) {
    throw new Error(`Failed to fetch topics: ${topicsError.message}`);
  }

  const rawTopics: RawTopicRow[] = (topics ?? []).map((t) => {
    const opinions: RawOpinionRow[] = [];
    for (const link of t.topic_opinion ?? []) {
      const segment = link.opinion_segments as unknown as
        | (Omit<
            RawOpinionRow,
            "review_status" | "moderation_status" | "role_title" | "created_at"
          > & {
            opinions: {
              review_status: string | null;
              moderation_status: string | null;
              role_title: string | null;
              created_at: string | null;
            } | null;
          })
        | null;
      if (!segment || !segment.opinions) continue;
      opinions.push({
        id: segment.id,
        opinion_id: segment.opinion_id,
        created_at: segment.opinions.created_at,
        title: segment.title,
        content: segment.content,
        contextual_quote: segment.contextual_quote,
        source_message_id: segment.source_message_id,
        richness: segment.richness,
        review_status: segment.opinions.review_status,
        moderation_status: segment.opinions.moderation_status,
        role_title: segment.opinions.role_title,
      });
    }
    return { id: t.id, title: t.title, description: t.description, opinions };
  });

  return {
    meta: {
      interview_config_id: interviewConfigId,
      version: version.version,
      generated_at: version.completed_at,
    },
    rawTopics,
  };
}

/**
 * テーマの「公開中（is_published=true）」のトピック分析を生データで取得する（web 公開ページ用）。
 * 公開中 version が無ければ null（呼び出し側で「準備中」扱い）。
 */
export async function findPublishedAnalysis(
  interviewConfigId: string
): Promise<PublishedAnalysisData | null> {
  const supabase = createAdminClient();
  // テーマごと公開は最大1版（one_published_per_interview_config）。
  const { data: version, error } = await supabase
    .from("topic_analysis_version")
    .select("id, version, completed_at")
    .eq("interview_config_id", interviewConfigId)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch published version: ${error.message}`);
  }
  if (!version) return null;
  return fetchAnalysisData(version, interviewConfigId);
}

/**
 * テーマの最新トピック分析を生データで取得する（公開・非公開を問わず最大 version を返す）。
 * 内部用途（admin MCP）向け。version が無ければ null。
 */
export async function findLatestAnalysis(
  interviewConfigId: string
): Promise<PublishedAnalysisData | null> {
  const supabase = createAdminClient();
  const { data: version, error } = await supabase
    .from("topic_analysis_version")
    .select("id, version, completed_at")
    .eq("interview_config_id", interviewConfigId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch latest version: ${error.message}`);
  }
  if (!version) return null;
  return fetchAnalysisData(version, interviewConfigId);
}

/** モデレーション状態（opinions.moderation_status の列挙）。 */
export type ModerationStatus = "ok" | "warning" | "ng";

/** 意見の公開状態（opinions.review_status の列挙）。 */
export type ReviewStatus = "published" | "pending_review" | "hidden";

/** 意見行に対する取得条件。未指定の項目は制約しない（＝全件対象）。 */
export type OpinionRowFilter = {
  reviewStatus?: ReviewStatus;
  moderationStatus?: ModerationStatus;
};

/** web 公開ページのプリセット（公開済みのみ）。 */
const PUBLIC_OPINION_FILTER: OpinionRowFilter = { reviewStatus: "published" };

const RESPONDENT_SELECT =
  "id, role_title, summary, final_text, created_at, interview_sessions!inner(interview_config_id)";

/**
 * テーマに紐づく回答者の意見行を取得する（回答一覧用・新しい順）。
 * filter で公開状態・モデレーション状態を任意に絞り込む（未指定なら制約しない＝全件）。
 */
export async function findRespondentRows(
  interviewConfigId: string,
  filter: OpinionRowFilter = {}
): Promise<RawRespondentRow[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("opinions")
    .select(RESPONDENT_SELECT)
    .eq("interview_sessions.interview_config_id", interviewConfigId);
  if (filter.reviewStatus !== undefined) {
    query = query.eq("review_status", filter.reviewStatus);
  }
  if (filter.moderationStatus !== undefined) {
    query = query.eq("moderation_status", filter.moderationStatus);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch respondents: ${error.message}`);
  }

  return (data ?? []).map((o) => ({
    id: o.id,
    role_title: o.role_title,
    summary: o.summary,
    final_text: o.final_text,
    created_at: o.created_at,
  }));
}

/**
 * web 公開ページ用: 公開済み（review_status='published'）の意見のみ取得する。
 *
 * k-匿名性ゲート（公開意見 >= 20 件）は適用しない生データ取得のため、
 * 公開経路からは必ず `getPublicRespondents` を経由すること。
 */
export async function findPublicBillRespondentRows(
  interviewConfigId: string
): Promise<RawRespondentRow[]> {
  return findRespondentRows(interviewConfigId, PUBLIC_OPINION_FILTER);
}

export type RespondentDetailData = {
  opinion: RawRespondentDetailRow;
  messages: RawTranscriptMessageRow[];
};

/** 回答者詳細の取得条件。未指定の公開状態／モデレーションは制約しない。 */
export type RespondentDetailFilter = OpinionRowFilter & {
  /** true のとき web と同じ k-匿名性ゲート（公開意見 >= 20 件）を適用。 */
  requireDisplayThreshold?: boolean;
};

/**
 * 意見1件の詳細（立場説明＋会話ログ）を生データで取得する（内部用途）。
 * filter で公開状態・モデレーション状態を任意に絞り込み、`requireDisplayThreshold` を
 * 指定したときのみ web 個別意見詳細と同じ k-匿名性ゲート（公開意見が
 * `shouldDisplayPublicReports` を満たす＝20件以上）を適用する。
 * 条件に合致しない・存在しない場合は null（呼び出し側で not_found 扱い）。会話メッセージは作成日時昇順。
 */
export async function findRespondentDetail(
  opinionId: string,
  filter: RespondentDetailFilter = {}
): Promise<RespondentDetailData | null> {
  const supabase = createAdminClient();

  let query = supabase
    .from("opinions")
    .select(
      "id, role_title, summary, final_text, role_description, created_at, interview_session_id, interview_sessions!inner(interview_config_id)"
    )
    .eq("id", opinionId);
  if (filter.reviewStatus !== undefined) {
    query = query.eq("review_status", filter.reviewStatus);
  }
  if (filter.moderationStatus !== undefined) {
    query = query.eq("moderation_status", filter.moderationStatus);
  }
  const { data: opinion, error } = await query.maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch respondent detail: ${error.message}`);
  }
  if (!opinion) return null;

  // k-匿名性ゲート（任意）: 公開意見が少数のテーマでは会話ログを返さない（web と統一）。
  if (filter.requireDisplayThreshold) {
    const session = opinion.interview_sessions as unknown as {
      interview_config_id: string;
    } | null;
    const interviewConfigId = session?.interview_config_id ?? null;
    if (!interviewConfigId) return null;
    const publicOpinionCount =
      await countPublicOpinionsByInterviewConfigId(interviewConfigId);
    if (!shouldDisplayPublicReports(publicOpinionCount)) return null;
  }

  const { data: messages, error: messagesError } = await supabase
    .from("interview_messages")
    .select("id, role, content, created_at")
    .eq("interview_session_id", opinion.interview_session_id)
    .order("created_at", { ascending: true });
  if (messagesError) {
    throw new Error(`Failed to fetch transcript: ${messagesError.message}`);
  }

  return {
    opinion: {
      id: opinion.id,
      role_title: opinion.role_title,
      summary: opinion.summary,
      final_text: opinion.final_text,
      role_description: opinion.role_description,
      created_at: opinion.created_at,
    },
    // select 列が RawTranscriptMessageRow と一致するためそのまま渡す。
    messages: messages ?? [],
  };
}
