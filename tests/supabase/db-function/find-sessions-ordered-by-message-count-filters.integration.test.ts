import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestInterviewMessages,
  createTestOpinion,
  createTestSession,
  createTestUser,
  type TestUser,
} from "../utils";
import { trackInterviewConfigs } from "./helpers";

let sessionCounter = 0;

/** 作成順を started_at で確定させたセッションを作る */
async function createOrderedSession(
  configId: string,
  userId: string,
  completedAt?: string
) {
  sessionCounter++;
  return await createTestSession(configId, userId, {
    started_at: new Date(Date.now() - sessionCounter * 1000).toISOString(),
    completed_at: completedAt ?? null,
  });
}

describe("find_sessions_ordered_by_message_count() フィルタパラメータ", () => {
  let testUser: TestUser;
  const configs = trackInterviewConfigs();

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await configs.cleanup();
    await cleanupTestUser(testUser.id);
  });

  it("p_statusでcompletedセッションのみフィルタできる", async () => {
    const configId = await configs.createConfigId();

    const completed = await createOrderedSession(
      configId,
      testUser.id,
      new Date().toISOString()
    );
    await createTestInterviewMessages(completed.id, 3);

    const inProgress = await createOrderedSession(configId, testUser.id);
    await createTestInterviewMessages(inProgress.id, 5);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_message_count",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
        p_status: "completed",
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].session_id).toBe(completed.id);
  });

  it("p_visibility='public'は公開済み(published)の意見を持つセッションのみ返す", async () => {
    const configId = await configs.createConfigId();

    const published = await createOrderedSession(configId, testUser.id);
    await createTestInterviewMessages(published.id, 2);
    await createTestOpinion(published.id, { review_status: "published" });

    const pending = await createOrderedSession(configId, testUser.id);
    await createTestInterviewMessages(pending.id, 4);
    await createTestOpinion(pending.id, { review_status: "pending_review" });

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_message_count",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
        p_visibility: "public",
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].session_id).toBe(published.id);
  });

  it("p_visibility='private'は未公開の意見と意見なしのセッションを返す", async () => {
    const configId = await configs.createConfigId();

    const published = await createOrderedSession(configId, testUser.id);
    await createTestOpinion(published.id, { review_status: "published" });

    const hidden = await createOrderedSession(configId, testUser.id);
    await createTestOpinion(hidden.id, { review_status: "hidden" });

    // 意見が未作成のセッションも非公開扱い
    const noOpinion = await createOrderedSession(configId, testUser.id);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_message_count",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
        p_visibility: "private",
      }
    );

    expect(error).toBeNull();
    const sessionIds = (data ?? []).map((r) => r.session_id);
    expect(sessionIds).toHaveLength(2);
    expect(sessionIds).toContain(hidden.id);
    expect(sessionIds).toContain(noOpinion.id);
    expect(sessionIds).not.toContain(published.id);
  });

  it("複数フィルタを組み合わせて絞り込める", async () => {
    const configId = await configs.createConfigId();

    // 完了 × 公開済み（唯一の該当）
    const target = await createOrderedSession(
      configId,
      testUser.id,
      new Date().toISOString()
    );
    await createTestInterviewMessages(target.id, 5);
    await createTestOpinion(target.id, { review_status: "published" });

    // 完了だが未公開
    const completedPrivate = await createOrderedSession(
      configId,
      testUser.id,
      new Date().toISOString()
    );
    await createTestInterviewMessages(completedPrivate.id, 3);
    await createTestOpinion(completedPrivate.id, {
      review_status: "pending_review",
    });

    // 公開済みだが未完了
    const inProgressPublic = await createOrderedSession(configId, testUser.id);
    await createTestInterviewMessages(inProgressPublic.id, 7);
    await createTestOpinion(inProgressPublic.id, {
      review_status: "published",
    });

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_message_count",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
        p_status: "completed",
        p_visibility: "public",
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].session_id).toBe(target.id);
  });

  it("フィルタパラメータがNULLの場合はフィルタしない", async () => {
    const configId = await configs.createConfigId();

    const s1 = await createOrderedSession(configId, testUser.id);
    await createTestInterviewMessages(s1.id, 2);

    const s2 = await createOrderedSession(configId, testUser.id);
    await createTestInterviewMessages(s2.id, 4);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_message_count",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });
});
