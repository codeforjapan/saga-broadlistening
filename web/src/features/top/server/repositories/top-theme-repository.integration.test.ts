import {
  cleanupTestPolicy,
  createTestPolicy,
  createTestPolicyWithConfig,
  createTestSession,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import { findTopLevelPublishedPoliciesWithThemes } from "./top-theme-repository";

describe("top-theme-repository 統合テスト", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup();
    }
  });

  const published = () => ({
    publish_status: "published" as const,
    published_at: new Date().toISOString(),
  });

  it("親を持たない公開施策を、子施策とつながるテーマつきで返す", async () => {
    const {
      policy: parent,
      config,
      cleanup,
    } = await createTestPolicyWithConfig({ policy: published() });
    cleanups.push(cleanup);
    const child = await createTestPolicy({
      ...published(),
      parent_policy_id: parent.id,
    });
    cleanups.push(() => cleanupTestPolicy(child.id));

    const rows = await findTopLevelPublishedPoliciesWithThemes();

    const found = rows.find((row) => row.id === parent.id);
    expect(found?.child_policies).toEqual([{ publish_status: "published" }]);
    expect(
      found?.policies_interview_configs.map(
        (link) => link.interview_configs?.id
      )
    ).toEqual([config.id]);
    // 子施策そのものは候補に入らない
    expect(rows.some((row) => row.id === child.id)).toBe(false);
  });

  it("子施策を持たない施策は子施策が空配列になる", async () => {
    const policy = await createTestPolicy(published());
    cleanups.push(() => cleanupTestPolicy(policy.id));

    const rows = await findTopLevelPublishedPoliciesWithThemes();

    expect(rows.find((row) => row.id === policy.id)?.child_policies).toEqual(
      []
    );
  });

  it("つながるテーマには完了したセッションの件数だけを付ける", async () => {
    const { policy, config, cleanup } = await createTestPolicyWithConfig({
      policy: published(),
    });
    cleanups.push(cleanup);
    const now = new Date().toISOString();
    await createTestSession(config.id, null, { completed_at: now });
    await createTestSession(config.id, null, { completed_at: now });
    await createTestSession(config.id, null, { completed_at: null });

    const rows = await findTopLevelPublishedPoliciesWithThemes();

    const theme = rows.find((row) => row.id === policy.id)
      ?.policies_interview_configs[0]?.interview_configs;
    expect(theme?.interview_sessions).toEqual([{ count: 2 }]);
  });
});
