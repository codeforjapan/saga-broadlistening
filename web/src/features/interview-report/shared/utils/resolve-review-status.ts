import {
  type OpinionReviewStatus,
  shouldAutoPublishOnUserSettingChange,
} from "@mirai-gikai/shared/report-publication/auto-publish";

export type { OpinionReviewStatus };

export type OpinionPublicSettingInput = {
  /** 市民本人の公開同意（今回の操作後の値） */
  isPublicByUser: boolean;
  isPublicByAdmin: boolean;
  reviewStatus: OpinionReviewStatus;
  moderationScore: number | null;
  totalContentRichness: number | null;
};

export type OpinionPublicSettingUpdate = {
  is_public_by_admin?: boolean;
  review_status?: OpinionReviewStatus;
};

/**
 * 市民本人の公開設定変更に伴う opinions の更新差分を算出する。
 *
 * - 公開状態の正本は review_status。両者の同意が揃ったときだけ published にする
 * - 職員が非公開にした意見（hidden）は、本人操作では再公開も再開もしない
 *   （旧 admin_unpublished_at の役割）
 * - 本人が公開を取り消したら published から pending_review へ戻す
 */
export function resolveOpinionPublicSettingUpdate({
  isPublicByUser,
  isPublicByAdmin,
  reviewStatus,
  moderationScore,
  totalContentRichness,
}: OpinionPublicSettingInput): OpinionPublicSettingUpdate {
  if (reviewStatus === "hidden") {
    return {};
  }

  if (!isPublicByUser) {
    return reviewStatus === "published"
      ? { review_status: "pending_review" }
      : {};
  }

  if (isPublicByAdmin) {
    return { review_status: "published" };
  }

  const shouldAutoPublish = shouldAutoPublishOnUserSettingChange({
    isPublicByAdmin,
    reviewStatus,
    isPublicByUser,
    moderationScore,
    totalContentRichness,
  });

  return shouldAutoPublish
    ? { is_public_by_admin: true, review_status: "published" }
    : {};
}
