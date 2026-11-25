import { describe, expect, it } from "vitest";
import {
  AUTO_PUBLISH_MAX_MODERATION_SCORE,
  AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
  MIN_PUBLIC_OPINIONS_FOR_DISPLAY,
  isPublicReportVisible,
  isReportAutoPublishEligible,
  shouldAutoPublishOnUserSettingChange,
  shouldDisplayPublicReports,
} from "./auto-publish";

describe("isReportAutoPublishEligible", () => {
  const baseInput = {
    isPublicByUser: true,
    moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE,
    totalContentRichness: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
  };

  it("ユーザー公開許可済みで閾値を満たすレポートを自動公開対象にする", () => {
    expect(isReportAutoPublishEligible(baseInput)).toBe(true);
  });

  it("ユーザーが公開を許可していないレポートは対象外にする", () => {
    expect(
      isReportAutoPublishEligible({ ...baseInput, isPublicByUser: false })
    ).toBe(false);
  });

  it.each([
    {
      moderationScore: null,
      totalContentRichness: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
    },
    {
      moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE + 1,
      totalContentRichness: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
    },
    {
      moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE,
      totalContentRichness: null,
    },
    {
      moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE,
      totalContentRichness: AUTO_PUBLISH_MIN_CONTENT_RICHNESS - 1,
    },
  ])(
    "未採点または閾値未達のレポートを対象外にする",
    ({ moderationScore, totalContentRichness }) => {
      expect(
        isReportAutoPublishEligible({
          ...baseInput,
          moderationScore,
          totalContentRichness,
        })
      ).toBe(false);
    }
  );
});

describe("shouldAutoPublishOnUserSettingChange", () => {
  const baseInput = {
    isPublicByAdmin: false,
    reviewStatus: "pending_review" as const,
    isPublicByUser: true,
    moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE,
    totalContentRichness: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
  };

  it("職員操作を受けていない未公開の意見は自動公開する", () => {
    expect(shouldAutoPublishOnUserSettingChange(baseInput)).toBe(true);
  });

  it("職員が非公開にした意見はユーザー操作で再公開しない", () => {
    expect(
      shouldAutoPublishOnUserSettingChange({
        ...baseInput,
        reviewStatus: "hidden",
      })
    ).toBe(false);
  });

  it("すでに職員公開済みの意見は対象外にする", () => {
    expect(
      shouldAutoPublishOnUserSettingChange({
        ...baseInput,
        isPublicByAdmin: true,
      })
    ).toBe(false);
  });

  it("自動公開条件を満たさない意見は対象外にする", () => {
    expect(
      shouldAutoPublishOnUserSettingChange({
        ...baseInput,
        moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE + 1,
      })
    ).toBe(false);
  });
});

describe("shouldDisplayPublicReports", () => {
  it.each([
    { count: 0, expected: false },
    { count: MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 1, expected: false },
    { count: MIN_PUBLIC_OPINIONS_FOR_DISPLAY, expected: true },
    { count: MIN_PUBLIC_OPINIONS_FOR_DISPLAY + 1, expected: true },
  ])("公開件数 $count の表示可否を判定する", ({ count, expected }) => {
    expect(shouldDisplayPublicReports(count)).toBe(expected);
  });
});

describe("isPublicReportVisible", () => {
  const baseInput = {
    reviewStatus: "published" as const,
    publicReportCount: MIN_PUBLIC_OPINIONS_FOR_DISPLAY,
  };

  it("公開済みかつ N 件以上揃っている意見だけ表示する", () => {
    expect(isPublicReportVisible(baseInput)).toBe(true);
  });

  it.each([
    { reviewStatus: "pending_review" as const },
    { reviewStatus: "hidden" as const },
    { publicReportCount: MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 1 },
  ])("公開条件が欠ける意見を非表示にする", (override) => {
    expect(isPublicReportVisible({ ...baseInput, ...override })).toBe(false);
  });
});
