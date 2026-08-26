import { randomUUID } from "node:crypto";
import {
  AUTO_PUBLISH_MAX_MODERATION_SCORE,
  AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
} from "@mirai-gikai/shared/report-publication/auto-publish";
import {
  adminClient,
  cleanupAll,
  cleanupTestUser,
  createTestOpinion,
  createTestPolicyWithConfig,
  createTestSession,
  createTestUser,
  type TestUser,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { updateReportPublicSetting } from "./interview-report-repository";

type OpinionOverrides = {
  is_public_by_admin?: boolean;
  is_public_by_user?: boolean;
  review_status?: "published" | "pending_review" | "hidden";
  moderation_score?: number | null;
  contentRichnessTotal?: number | null;
};

async function createReportFixture(
  userId: string,
  overrides: OpinionOverrides
) {
  const { config, cleanup } = await createTestPolicyWithConfig();
  try {
    const session = await createTestSession(config.id, userId);
    const { contentRichnessTotal, ...opinionOverrides } = overrides;
    const report = await createTestOpinion(session.id, {
      is_public_by_admin: opinionOverrides.is_public_by_admin ?? false,
      is_public_by_user: opinionOverrides.is_public_by_user ?? false,
      review_status: opinionOverrides.review_status ?? "pending_review",
      ...(opinionOverrides.moderation_score != null
        ? { moderation_score: opinionOverrides.moderation_score }
        : {}),
      ...(contentRichnessTotal != null
        ? { content_richness: { total: contentRichnessTotal } }
        : {}),
    });
    return { report, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function findPublicFlags(reportId: string) {
  const { data, error } = await adminClient
    .from("opinions")
    .select("is_public_by_user, is_public_by_admin, review_status")
    .eq("id", reportId)
    .single();
  expect(error).toBeNull();
  return data;
}

describe("updateReportPublicSetting 統合テスト", () => {
  let testUser: TestUser;
  const cleanups: Array<() => Promise<void>> = [];

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await cleanupAll(
      ...cleanups.splice(0).map((cleanup) => cleanup()),
      cleanupTestUser(testUser.id)
    );
  });

  it("公開許可時に自動公開条件を満たす未公開意見を公開済みにする", async () => {
    const { report, cleanup } = await createReportFixture(testUser.id, {
      moderation_score: AUTO_PUBLISH_MAX_MODERATION_SCORE,
      contentRichnessTotal: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
    });
    cleanups.push(cleanup);

    await updateReportPublicSetting(report.id, true);

    await expect(findPublicFlags(report.id)).resolves.toEqual({
      is_public_by_user: true,
      is_public_by_admin: true,
      review_status: "published",
    });
  });

  it("自動公開条件を満たさない場合はユーザー公開設定だけを更新する", async () => {
    const { report, cleanup } = await createReportFixture(testUser.id, {
      moderation_score: AUTO_PUBLISH_MAX_MODERATION_SCORE + 1,
      contentRichnessTotal: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
    });
    cleanups.push(cleanup);

    await updateReportPublicSetting(report.id, true);

    await expect(findPublicFlags(report.id)).resolves.toEqual({
      is_public_by_user: true,
      is_public_by_admin: false,
      review_status: "pending_review",
    });
  });

  it("職員が非公開にした意見はユーザー操作で再公開しない", async () => {
    const { report, cleanup } = await createReportFixture(testUser.id, {
      review_status: "hidden",
      moderation_score: AUTO_PUBLISH_MAX_MODERATION_SCORE,
      contentRichnessTotal: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
    });
    cleanups.push(cleanup);

    await updateReportPublicSetting(report.id, true);

    await expect(findPublicFlags(report.id)).resolves.toEqual({
      is_public_by_user: true,
      is_public_by_admin: false,
      review_status: "hidden",
    });
  });

  it("本人が公開を取り消したら公開済みからレビュー保留へ戻す", async () => {
    const { report, cleanup } = await createReportFixture(testUser.id, {
      is_public_by_admin: true,
      is_public_by_user: true,
      review_status: "published",
      moderation_score: AUTO_PUBLISH_MAX_MODERATION_SCORE,
      contentRichnessTotal: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
    });
    cleanups.push(cleanup);

    await updateReportPublicSetting(report.id, false);

    await expect(findPublicFlags(report.id)).resolves.toEqual({
      is_public_by_user: false,
      is_public_by_admin: true,
      review_status: "pending_review",
    });
  });

  it("公開設定更新前の意見取得に失敗したらエラーにする", async () => {
    await expect(updateReportPublicSetting(randomUUID(), true)).rejects.toThrow(
      "Failed to fetch opinion for public setting:"
    );
  });
});
