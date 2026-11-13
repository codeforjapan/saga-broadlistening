import { MODERATION_THRESHOLDS } from "../moderation/moderation";

export const AUTO_PUBLISH_MAX_MODERATION_SCORE =
  MODERATION_THRESHOLDS.WARNING - 1;
export const AUTO_PUBLISH_MIN_CONTENT_RICHNESS = 50;
export const MIN_PUBLIC_OPINIONS_FOR_DISPLAY = 20;

export type AutoPublishReportInput = {
  isPublicByUser: boolean;
  moderationScore: number | null;
  totalContentRichness: number | null;
};

export function isReportAutoPublishEligible({
  isPublicByUser,
  moderationScore,
  totalContentRichness,
}: AutoPublishReportInput): boolean {
  return (
    isPublicByUser &&
    moderationScore !== null &&
    moderationScore <= AUTO_PUBLISH_MAX_MODERATION_SCORE &&
    totalContentRichness !== null &&
    totalContentRichness >= AUTO_PUBLISH_MIN_CONTENT_RICHNESS
  );
}

/** 意見の公開状態の正本（opinions.review_status）。 */
export type OpinionReviewStatus = "published" | "pending_review" | "hidden";

export type UserSettingAutoPublishInput = AutoPublishReportInput & {
  isPublicByAdmin: boolean;
  reviewStatus: OpinionReviewStatus;
};

/**
 * ユーザーの公開設定変更に伴って is_public_by_admin を引き上げてよいかを判定する。
 * 職員が明示的に非公開にした意見（review_status = 'hidden'）は、
 * 自動公開条件を満たしていてもユーザー操作では再公開しない。
 */
export function shouldAutoPublishOnUserSettingChange({
  isPublicByAdmin,
  reviewStatus,
  ...eligibility
}: UserSettingAutoPublishInput): boolean {
  return (
    !isPublicByAdmin &&
    reviewStatus !== "hidden" &&
    isReportAutoPublishEligible(eligibility)
  );
}

export function shouldDisplayPublicReports(publicReportCount: number): boolean {
  return publicReportCount >= MIN_PUBLIC_OPINIONS_FOR_DISPLAY;
}

export type PublicReportVisibilityInput = {
  reviewStatus: OpinionReviewStatus;
  publicReportCount: number;
};

/**
 * 公開意見を表示してよいかを判定する。
 * 公開の正本は review_status = 'published'（is_public_by_user / is_public_by_admin は
 * その入力条件であって表示判定には使わない）。
 */
export function isPublicReportVisible({
  reviewStatus,
  publicReportCount,
}: PublicReportVisibilityInput): boolean {
  return (
    reviewStatus === "published" &&
    shouldDisplayPublicReports(publicReportCount)
  );
}
