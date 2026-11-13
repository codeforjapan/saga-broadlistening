import {
  adminClient,
  cleanupTestPolicy,
  cleanupTestUser,
  createTestInterviewData,
  createTestPolicy,
  createTestPreviewToken,
  createTestUser,
  type TestUser,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startInterviewSessionCore } from "./start-interview-session-core";
import type { GetUserFn } from "../utils/verify-session-ownership";

function createGetUser(userId: string): GetUserFn {
  return async () => ({
    data: { user: { id: userId } },
    error: null,
  });
}

/**
 * 開始画面の「はじめる」（同意の記録とセッションの作成、#158）の統合テスト。
 */
describe("startInterviewSession 統合テスト", () => {
  let testUser: TestUser;
  let configId: string;
  let policyId: string;
  let existingSessionId: string;
  let cleanupInterviewData: () => Promise<void>;

  beforeEach(async () => {
    testUser = await createTestUser();
    const data = await createTestInterviewData(testUser.id);
    configId = data.config.id;
    policyId = data.policy.id;
    existingSessionId = data.session.id;
    cleanupInterviewData = data.cleanup;
    // 公開中の施策につながるテーマにする（非公開の施策だけにつながるテーマは始められない）
    await adminClient
      .from("policies")
      .update({
        publish_status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", data.policy.id);
    // 「まだ始めていない」状態にする
    await adminClient
      .from("interview_sessions")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", existingSessionId);
  });

  afterEach(async () => {
    await cleanupInterviewData();
    await cleanupTestUser(testUser.id);
  });

  async function activeSessions() {
    const { data } = await adminClient
      .from("interview_sessions")
      .select("id, consented_at, user_id")
      .eq("interview_config_id", configId)
      .is("archived_at", null);
    return data ?? [];
  }

  it("同意日時を記録してセッションを作る", async () => {
    const before = Date.now();

    const result = await startInterviewSessionCore(configId, {
      deps: { getUser: createGetUser(testUser.id) },
    });

    expect(result).toEqual({ success: true });
    const sessions = await activeSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toBe(testUser.id);
    expect(sessions[0].consented_at).not.toBeNull();
    expect(
      new Date(sessions[0].consented_at as string).getTime()
    ).toBeGreaterThanOrEqual(before - 1000);
  });

  it("二重に押しても進行中のセッションは1件", async () => {
    const deps = { getUser: createGetUser(testUser.id) };
    await startInterviewSessionCore(configId, { deps });
    await startInterviewSessionCore(configId, { deps });

    expect(await activeSessions()).toHaveLength(1);
  });

  it("未認証では作らない", async () => {
    const result = await startInterviewSessionCore(configId, {
      deps: {
        getUser: async () => ({
          data: { user: null },
          error: new Error("Not authenticated"),
        }),
      },
    });

    expect(result.success).toBe(false);
    expect(await activeSessions()).toHaveLength(0);
  });

  it("募集中でないテーマでは作らない", async () => {
    await adminClient
      .from("interview_configs")
      .update({ status: "closed" })
      .eq("id", configId);

    const result = await startInterviewSessionCore(configId, {
      deps: { getUser: createGetUser(testUser.id) },
    });

    expect(result).toEqual({
      success: false,
      error: "このインタビューは現在募集していません",
    });
    expect(await activeSessions()).toHaveLength(0);
  });

  it("参加条件（外部アプリの利用者のみ）を満たさなければ作らない", async () => {
    await adminClient
      .from("interview_configs")
      .update({
        participation_mode: "external_identity",
        allowed_provider_keys: ["saga_super_app"],
      })
      .eq("id", configId);

    const result = await startInterviewSessionCore(configId, {
      deps: {
        getUser: createGetUser(testUser.id),
        getExternalIdentities: async () => [],
      },
    });

    expect(result.success).toBe(false);
    expect(await activeSessions()).toHaveLength(0);
  });

  describe("職員プレビュー", () => {
    async function closeConfig() {
      await adminClient
        .from("interview_configs")
        .update({ status: "closed" })
        .eq("id", configId);
    }

    it("テーマにつながる施策の有効なトークンなら、募集中でなくても始められる", async () => {
      await closeConfig();
      const token = await createTestPreviewToken(policyId);

      const result = await startInterviewSessionCore(configId, {
        preview: { policyId, token: token.token },
        deps: { getUser: createGetUser(testUser.id) },
      });

      expect(result).toEqual({ success: true });
      expect(await activeSessions()).toHaveLength(1);
    });

    it("テーマにつながらない施策のトークンでは免除しない", async () => {
      await closeConfig();
      const other = await createTestPolicy();
      try {
        const token = await createTestPreviewToken(other.id);

        const result = await startInterviewSessionCore(configId, {
          preview: { policyId: other.id, token: token.token },
          deps: { getUser: createGetUser(testUser.id) },
        });

        expect(result.success).toBe(false);
        expect(await activeSessions()).toHaveLength(0);
      } finally {
        await cleanupTestPolicy(other.id);
      }
    });
  });
});
