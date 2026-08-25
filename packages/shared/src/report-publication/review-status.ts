import {
  type OpinionReviewStatus,
  shouldAutoPublishOnUserSettingChange,
} from "./auto-publish";

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

export type AdminVisibilityInput = {
  /** 職員が公開を許可したか（今回の操作後の値） */
  isPublic: boolean;
  /** 市民本人の公開同意（現在値） */
  isPublicByUser: boolean;
};

export type AdminVisibilityUpdate = {
  is_public_by_admin: boolean;
  review_status: OpinionReviewStatus;
};

/**
 * 職員の公開設定変更に伴う opinions の更新差分を算出する。
 *
 * published にできるのは市民本人の公開同意が揃っているときだけ。
 * 職員が許可しても本人が同意していない意見は pending_review に留める
 * （旧スキーマの `is_public_by_admin AND is_public_by_user` の読み取りゲートを、
 *   review_status を正本とする新モデルで維持するための条件）。
 */
export function resolveAdminVisibilityUpdate({
  isPublic,
  isPublicByUser,
}: AdminVisibilityInput): AdminVisibilityUpdate {
  if (!isPublic) {
    return { is_public_by_admin: false, review_status: "hidden" };
  }

  return {
    is_public_by_admin: true,
    review_status: isPublicByUser ? "published" : "pending_review",
  };
}
