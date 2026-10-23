import { randomUUID } from "node:crypto";
import { MIN_PUBLIC_OPINIONS_FOR_DISPLAY } from "@mirai-gikai/shared/report-publication/auto-publish";
import {
  cleanupAll,
  cleanupTestUser,
  createTestOpinion,
  createTestPolicyWithConfig,
  createTestPublicOpinions,
  createTestSession,
  createTestUser,
  type TestUser,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getReportPublicStatus } from "./report-reaction-repository";

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

/** 件数ゲート用の公開意見をまとめて作る（1回の一括 INSERT で済ませる）。 */
async function createPublicReports(
  configId: string,
  userId: string,
  count: number
) {
  await createTestPublicOpinions({
    interviewConfigId: configId,
    userId,
    count,
    opinion: () => ({ content_richness: { total: 70 } }),
  });
}

describe("getReportPublicStatus 統合テスト", () => {
  let testUser: TestUser;
  const cleanups: Array<() => Promise<void>> = [];

  /** 施策 + 紐づく意見募集を1組作り、後片付け対象に登録する。 */
  async function createPolicyWithConfig() {
    const { config, cleanup } = await createTestPolicyWithConfig();
    cleanups.push(cleanup);
    return config;
  }

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await cleanupAll(
      ...cleanups.splice(0).map((cleanup) => cleanup()),
      cleanupTestUser(testUser.id)
    );
  });

  it("意見の取得に失敗したら false を返す", async () => {
    await expect(getReportPublicStatus(randomUUID())).resolves.toBe(false);
  });

  it("公開済みかつ表示件数ゲートを満たす場合だけ true を返す", async () => {
    const config = await createPolicyWithConfig();
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
    const config = await createPolicyWithConfig();
    const report = await createTestReport(config.id, testUser.id, reviewStatus);
    await createPublicReports(
      config.id,
      testUser.id,
      MIN_PUBLIC_OPINIONS_FOR_DISPLAY
    );

    await expect(getReportPublicStatus(report.id)).resolves.toBe(false);
  });

  it("公開済み件数が表示閾値未満なら false を返す", async () => {
    const config = await createPolicyWithConfig();
    const report = await createTestReport(config.id, testUser.id);
    await createPublicReports(
      config.id,
      testUser.id,
      MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 2
    );

    await expect(getReportPublicStatus(report.id)).resolves.toBe(false);
  });
});
