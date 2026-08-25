import { randomUUID } from "node:crypto";
import { MIN_PUBLIC_OPINIONS_FOR_DISPLAY } from "@mirai-gikai/shared/report-publication/auto-publish";
import {
  adminClient,
  cleanupTestPolicy,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestOpinion,
  createTestPolicy,
  createTestUser,
  linkPolicyToInterviewConfig,
  type TestUser,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getReportPublicStatus } from "./report-reaction-repository";

async function createTestSession(configId: string, userId: string) {
  const { data, error } = await adminClient
    .from("interview_sessions")
    .insert({
      interview_config_id: configId,
      user_id: userId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`interview_session 作成失敗: ${error.message}`);
  return data;
}

async function createTestReport(
  configId: string,
  userId: string,
  reviewStatus: "published" | "pending_review" | "hidden" = "published"
) {
  const session = await createTestSession(configId, userId);
  return createTestOpinion(session.id, {
    review_status: reviewStatus,
    is_public_by_admin: reviewStatus === "published",
    is_public_by_user: reviewStatus === "published",
    content_richness: { total: 70 },
  });
}

async function createPublicReports(
  configId: string,
  userId: string,
  count: number
) {
  for (let index = 0; index < count; index++) {
    await createTestReport(configId, userId);
  }
}

/** 施策 + 紐づく意見募集を1組作る。 */
async function createPolicyWithConfig(billIds: string[]) {
  const policy = await createTestPolicy();
  billIds.push(policy.id);
  const config = await createTestInterviewConfig();
  await linkPolicyToInterviewConfig(policy.id, config.id);
  return config;
}

describe("getReportPublicStatus 統合テスト", () => {
  let testUser: TestUser;
  const billIds: string[] = [];

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    const billCleanupResults = await Promise.allSettled(
      billIds.map((billId) => cleanupTestPolicy(billId))
    );
    billIds.length = 0;
    const userCleanupResults = await Promise.allSettled([
      cleanupTestUser(testUser.id),
    ]);
    const rejected = [...billCleanupResults, ...userCleanupResults].filter(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    if (rejected.length > 0) {
      throw new Error(
        `テストデータのクリーンアップに失敗しました: ${rejected
          .map((result) => String(result.reason))
          .join(", ")}`
      );
    }
  });

  it("意見の取得に失敗したら false を返す", async () => {
    await expect(getReportPublicStatus(randomUUID())).resolves.toBe(false);
  });

  it("公開済みかつ表示件数ゲートを満たす場合だけ true を返す", async () => {
    const config = await createPolicyWithConfig(billIds);
    const report = await createTestReport(config.id, testUser.id);
    await createPublicReports(
      config.id,
      testUser.id,
      MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 1
    );

    await expect(getReportPublicStatus(report.id)).resolves.toBe(true);
  });

  it.each([
    "pending_review" as const,
    "hidden" as const,
  ])("review_status が %s なら false を返す", async (reviewStatus) => {
    const config = await createPolicyWithConfig(billIds);
    const report = await createTestReport(config.id, testUser.id, reviewStatus);
    await createPublicReports(
      config.id,
      testUser.id,
      MIN_PUBLIC_OPINIONS_FOR_DISPLAY
    );

    await expect(getReportPublicStatus(report.id)).resolves.toBe(false);
  });

  it("公開済み件数が表示閾値未満なら false を返す", async () => {
    const config = await createPolicyWithConfig(billIds);
    const report = await createTestReport(config.id, testUser.id);
    await createPublicReports(
      config.id,
      testUser.id,
      MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 2
    );

    await expect(getReportPublicStatus(report.id)).resolves.toBe(false);
  });
});
