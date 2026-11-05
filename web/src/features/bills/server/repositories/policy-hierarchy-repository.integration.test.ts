import {
  cleanupTestPolicy,
  createTestPolicy,
  createTestPolicyWithConfig,
  createTestSession,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import { findKikaseteThemesByPolicyId } from "@/features/interview-config/server/repositories/interview-config-repository";
import { findPublishedChildPolicies } from "./bill-repository";

describe("施策の親子・テーマの取得（統合テスト）", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup();
    }
  });

  const published = (publishedAt = new Date().toISOString()) => ({
    publish_status: "published" as const,
    published_at: publishedAt,
  });

  async function newPolicy(
    overrides: Parameters<typeof createTestPolicy>[0] = {}
  ) {
    const policy = await createTestPolicy(overrides);
    cleanups.push(() => cleanupTestPolicy(policy.id));
    return policy;
  }

  it("公開中の子施策だけを sort_order, 公開日の新しい順で返す", async () => {
    const parent = await newPolicy(published());
    const later = await newPolicy({
      ...published("2026-09-02T00:00:00Z"),
      parent_policy_id: parent.id,
      sort_order: 1,
    });
    const newer = await newPolicy({
      ...published("2026-09-03T00:00:00Z"),
      parent_policy_id: parent.id,
      sort_order: 0,
    });
    const older = await newPolicy({
      ...published("2026-09-01T00:00:00Z"),
      parent_policy_id: parent.id,
      sort_order: 0,
    });
    await newPolicy({ publish_status: "draft", parent_policy_id: parent.id });

    const children = await findPublishedChildPolicies(parent.id);

    expect(children.map((child) => child.id)).toEqual([
      newer.id,
      older.id,
      later.id,
    ]);
  });

  it("施策につながるテーマを、完了したセッション数つきで返す", async () => {
    const { policy, config, cleanup } = await createTestPolicyWithConfig({
      policy: published(),
    });
    cleanups.push(cleanup);
    const now = new Date().toISOString();
    await createTestSession(config.id, null, { completed_at: now });
    await createTestSession(config.id, null, { completed_at: null });

    const themes = await findKikaseteThemesByPolicyId(policy.id);

    expect(themes).toHaveLength(1);
    expect(themes[0]?.slug).toBe(config.slug);
    expect(themes[0]?.interview_sessions).toEqual([{ count: 1 }]);
  });
});
