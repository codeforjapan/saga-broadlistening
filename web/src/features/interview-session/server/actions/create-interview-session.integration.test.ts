import {
  adminClient,
  cleanupTestExternalIdentityByUid,
  cleanupTestUser,
  createTestPolicyWithConfig,
  createTestUser,
  type TestUser,
  uniqueSuffix,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveExternalIdentities } from "@/features/external-identity/server/services/resolve-external-identities";
import { createInterviewSessionCore } from "../services/create-interview-session-core";
import type { GetUserFn } from "../utils/verify-session-ownership";

function createGetUser(userId: string): GetUserFn {
  return async () => ({
    data: { user: { id: userId } },
    error: null,
  });
}

const getUnauthenticatedUser: GetUserFn = async () => ({
  data: { user: null },
  error: new Error("Not authenticated"),
});

describe("createInterviewSession 統合テスト", () => {
  let testUser: TestUser;
  let configId: string;
  let cleanupPolicyWithConfig: () => Promise<void>;
  let externalUid: string | undefined;

  beforeEach(async () => {
    testUser = await createTestUser();

    const { config, cleanup } = await createTestPolicyWithConfig();
    configId = config.id;
    cleanupPolicyWithConfig = cleanup;
  });

  afterEach(async () => {
    // 意見募集を先に消す。施策 ↔ 意見募集は多対多で、施策の CASCADE は
    // 中間テーブルまでしか届かずセッションが残るため。
    await cleanupPolicyWithConfig();
    if (externalUid) {
      await cleanupTestExternalIdentityByUid("saga_super_app", externalUid);
      externalUid = undefined;
    }
    await cleanupTestUser(testUser.id);
  });

  it("認証済みユーザーが新しいインタビューセッションを作成できる", async () => {
    const session = await createInterviewSessionCore({
      interviewConfigId: configId,
      deps: { getUser: createGetUser(testUser.id) },
    });

    expect(session).toBeDefined();
    expect(session.interview_config_id).toBe(configId);
    expect(session.user_id).toBe(testUser.id);
    expect(session.started_at).toBeTruthy();
    expect(session.completed_at).toBeNull();
    expect(session.archived_at).toBeNull();

    // DB にセッションが保存されていることを確認
    const { data: dbSession } = await adminClient
      .from("interview_sessions")
      .select("*")
      .eq("id", session.id)
      .single();

    expect(dbSession).toBeTruthy();
    expect(dbSession?.user_id).toBe(testUser.id);
    expect(dbSession?.interview_config_id).toBe(configId);
    // 外部IDの紐付きが無ければ null
    expect(dbSession?.external_identity_id).toBeNull();
  });

  it("紐付いた外部IDがあれば external_identity_id に保存し、所有者は user_id のまま", async () => {
    externalUid = `uid-${uniqueSuffix()}`;
    const identities = await resolveExternalIdentities({
      userId: testUser.id,
      claims: [{ providerKey: "saga_super_app", externalUid }],
    });

    const session = await createInterviewSessionCore({
      interviewConfigId: configId,
      deps: {
        getUser: createGetUser(testUser.id),
        getExternalIdentities: async () => identities,
      },
    });

    expect(session.external_identity_id).toBe(identities[0].id);

    const { data: dbSession } = await adminClient
      .from("interview_sessions")
      .select("external_identity_id, user_id")
      .eq("id", session.id)
      .single();
    expect(dbSession?.external_identity_id).toBe(identities[0].id);
    expect(dbSession?.user_id).toBe(testUser.id);
  });

  it("認証失敗時はエラーを throw する", async () => {
    await expect(
      createInterviewSessionCore({
        interviewConfigId: configId,
        deps: { getUser: getUnauthenticatedUser },
      })
    ).rejects.toThrow("Failed to get user");
  });
});
