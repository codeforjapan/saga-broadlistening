import { describe, expect, it } from "vitest";
import {
  resolveAdminVisibilityUpdate,
  resolveOpinionPublicSettingUpdate,
} from "./review-status";

const eligible = {
  moderationScore: 10,
  totalContentRichness: 80,
};

const notEligible = {
  moderationScore: 90,
  totalContentRichness: 10,
};

describe("resolveOpinionPublicSettingUpdate", () => {
  it("職員が非公開にした意見（hidden）は本人操作で変更しない", () => {
    expect(
      resolveOpinionPublicSettingUpdate({
        isPublicByUser: true,
        isPublicByAdmin: false,
        reviewStatus: "hidden",
        ...eligible,
      })
    ).toEqual({});
  });

  it("自動公開条件を満たす公開同意で公開済みにする", () => {
    expect(
      resolveOpinionPublicSettingUpdate({
        isPublicByUser: true,
        isPublicByAdmin: false,
        reviewStatus: "pending_review",
        ...eligible,
      })
    ).toEqual({ is_public_by_admin: true, review_status: "published" });
  });

  it("自動公開条件を満たさない場合はレビュー保留のままにする", () => {
    expect(
      resolveOpinionPublicSettingUpdate({
        isPublicByUser: true,
        isPublicByAdmin: false,
        reviewStatus: "pending_review",
        ...notEligible,
      })
    ).toEqual({});
  });

  it("職員が公開を許可済みなら条件を満たさなくても公開済みにする", () => {
    expect(
      resolveOpinionPublicSettingUpdate({
        isPublicByUser: true,
        isPublicByAdmin: true,
        reviewStatus: "pending_review",
        ...notEligible,
      })
    ).toEqual({ review_status: "published" });
  });

  it("公開済みの意見を本人が非公開にしたらレビュー保留へ戻す", () => {
    expect(
      resolveOpinionPublicSettingUpdate({
        isPublicByUser: false,
        isPublicByAdmin: true,
        reviewStatus: "published",
        ...eligible,
      })
    ).toEqual({ review_status: "pending_review" });
  });

  it("未公開の意見を本人が非公開にしても変更しない", () => {
    expect(
      resolveOpinionPublicSettingUpdate({
        isPublicByUser: false,
        isPublicByAdmin: false,
        reviewStatus: "pending_review",
        ...eligible,
      })
    ).toEqual({});
  });
});

describe("resolveAdminVisibilityUpdate", () => {
  it("本人が公開に同意済みなら published にする", () => {
    expect(
      resolveAdminVisibilityUpdate({ isPublic: true, isPublicByUser: true })
    ).toEqual({ is_public_by_admin: true, review_status: "published" });
  });

  it("本人が公開に同意していなければ published にせず pending_review に留める", () => {
    expect(
      resolveAdminVisibilityUpdate({ isPublic: true, isPublicByUser: false })
    ).toEqual({ is_public_by_admin: true, review_status: "pending_review" });
  });

  it("職員が非公開にしたら本人の同意によらず hidden にする", () => {
    expect(
      resolveAdminVisibilityUpdate({ isPublic: false, isPublicByUser: true })
    ).toEqual({ is_public_by_admin: false, review_status: "hidden" });
  });
});
