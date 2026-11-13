import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestOpinion,
  createTestSession,
  createTestUser,
  type TestUser,
} from "../utils";
import { trackInterviewConfigs } from "./helpers";

describe("find_sessions_ordered_by_moderation_score() 関数", () => {
  let testUser: TestUser;
  const configs = trackInterviewConfigs();

  /** モデレーションスコア付きの意見を持つセッションを作成する */
  async function createSessionWithScore(
    configId: string,
    moderationScore: number | null
  ) {
    const session = await createTestSession(configId, testUser.id);
    await createTestOpinion(
      session.id,
      moderationScore != null ? { moderation_score: moderationScore } : {}
    );
    return session;
  }

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await configs.cleanup();
    await cleanupTestUser(testUser.id);
  });

  it("モデレーションスコアの降順でセッションIDを返す", async () => {
    const configId = await configs.createConfigId();

    const session1 = await createSessionWithScore(configId, 10);
    const session2 = await createSessionWithScore(configId, 80);
    const session3 = await createSessionWithScore(configId, 45);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_moderation_score",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(data?.[0].session_id).toBe(session2.id); // 80
    expect(data?.[1].session_id).toBe(session3.id); // 45
    expect(data?.[2].session_id).toBe(session1.id); // 10
  });

  it("モデレーションスコアの昇順でセッションIDを返す", async () => {
    const configId = await configs.createConfigId();

    const session1 = await createSessionWithScore(configId, 60);
    const session2 = await createSessionWithScore(configId, 20);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_moderation_score",
      {
        p_config_id: configId,
        p_ascending: true,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].session_id).toBe(session2.id); // 20
    expect(data?.[1].session_id).toBe(session1.id); // 60
  });

  it("NULLスコアのセッションは昇順・降順ともに末尾に配置される", async () => {
    const configId = await configs.createConfigId();

    const scored = await createSessionWithScore(configId, 50);
    // 意見なし（スコアNULL）
    await createTestSession(configId, testUser.id);
    // 意見はあるがスコアNULL
    await createSessionWithScore(configId, null);

    const { data: descData, error: descError } = await adminClient.rpc(
      "find_sessions_ordered_by_moderation_score",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(descError).toBeNull();
    expect(descData).toHaveLength(3);
    expect(descData?.[0].session_id).toBe(scored.id); // 50

    const { data: ascData, error: ascError } = await adminClient.rpc(
      "find_sessions_ordered_by_moderation_score",
      {
        p_config_id: configId,
        p_ascending: true,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(ascError).toBeNull();
    expect(ascData).toHaveLength(3);
    expect(ascData?.[0].session_id).toBe(scored.id); // 50
  });

  it("offset/limitでページネーションが正しく動作する", async () => {
    const configId = await configs.createConfigId();

    const sessions = [];
    for (let i = 0; i < 4; i++) {
      sessions.push(await createSessionWithScore(configId, (i + 1) * 20));
    }

    // 降順: 80, 60, 40, 20 → offset=1, limit=2 → 60, 40
    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_moderation_score",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 1,
        p_limit: 2,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].session_id).toBe(sessions[2].id); // 60
    expect(data?.[1].session_id).toBe(sessions[1].id); // 40
  });

  it("別のconfigのセッションは含まれない", async () => {
    const configId1 = await configs.createConfigId();
    const session1 = await createSessionWithScore(configId1, 30);

    const configId2 = await configs.createConfigId();
    await createSessionWithScore(configId2, 90);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_moderation_score",
      {
        p_config_id: configId1,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].session_id).toBe(session1.id);
  });

  it("存在しないconfig_idでは空配列を返す", async () => {
    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_moderation_score",
      {
        p_config_id: "00000000-0000-0000-0000-000000000000",
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
