import { enrichOpinionsWithSourceContent } from "@mirai-gikai/shared/interview-report/enrich-opinions";
import { shouldAutoPublishOnUserSettingChange } from "@mirai-gikai/shared/report-publication/auto-publish";
import type { OpinionReviewStatus } from "@mirai-gikai/shared/report-publication/review-status";
import type { InterviewReportData } from "../schemas";
import type { InterviewMessage, InterviewReportInsert } from "../types";

type CompleteInterviewMessage = Pick<
  InterviewMessage,
  "id" | "role" | "content"
>;

type BuildCompletedInterviewReportInsertParams = {
  sessionId: string;
  reportData: InterviewReportData;
  moderationScore: number | null;
  moderationReasoning: string | null;
  isPublicByUser?: boolean;
  isDataReuseConsented?: boolean;
  /** 保存前の公開状態（新規作成時は undefined） */
  current?: {
    isPublicByAdmin: boolean;
    reviewStatus: OpinionReviewStatus;
  };
};

/**
 * 意見（opinions）の保存payloadを組み立てる。
 *
 * Epic #54 で stance / role / opinions(JSONB) が廃止され、論点単位の意見は
 * opinion_segments へ切り出された。公開状態の正本は review_status。
 */
export function buildCompletedInterviewReportInsert({
  sessionId,
  reportData,
  moderationScore,
  moderationReasoning,
  isPublicByUser,
  isDataReuseConsented,
  current,
}: BuildCompletedInterviewReportInsertParams): InterviewReportInsert {
  // 職員が非公開にした意見（hidden）は、本人が再完了しても自動再公開しない。
  // 判定は公開遷移の正本（@mirai-gikai/shared）へ寄せる。
  const shouldAutoPublish = shouldAutoPublishOnUserSettingChange({
    isPublicByAdmin: current?.isPublicByAdmin ?? false,
    reviewStatus: current?.reviewStatus ?? "pending_review",
    isPublicByUser: isPublicByUser ?? false,
    moderationScore,
    totalContentRichness: reportData.content_richness.total,
  });

  return {
    interview_session_id: sessionId,
    final_text: reportData.final_text,
    summary: reportData.summary,
    role_description: reportData.role_description,
    role_title: reportData.role_title,
    // 完了（再完了含む）時は意見内容が（再）確定するため、意見再抽出の
    // ウォーターマークを未処理(NULL)に戻す。これにより再完了で opinion_segments が
    // 同期され直しても、次回バックフィルが再抽出して品質を復旧できる。
    opinions_reextracted_at: null,
    content_richness: reportData.content_richness,
    moderation_score: moderationScore,
    moderation_reasoning: moderationReasoning,
    ...(typeof isPublicByUser === "boolean"
      ? { is_public_by_user: isPublicByUser }
      : {}),
    ...(typeof isDataReuseConsented === "boolean"
      ? { is_data_reuse_consented: isDataReuseConsented }
      : {}),
    ...(shouldAutoPublish
      ? { is_public_by_admin: true, review_status: "published" as const }
      : {}),
  };
}

/**
 * opinion_segments へ書き込む前に、意見へ根拠メッセージ本文を補完する。
 */
export function buildCompletedOpinionSources({
  reportData,
  messages,
}: {
  reportData: InterviewReportData;
  messages: CompleteInterviewMessage[];
}) {
  return enrichOpinionsWithSourceContent(reportData.opinions, messages);
}
