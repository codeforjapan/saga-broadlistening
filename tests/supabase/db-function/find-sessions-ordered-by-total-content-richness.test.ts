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

describe("find_sessions_ordered_by_total_content_richness() 関数", () => {
  let testUser: TestUser;
  const configs = trackInterviewConfigs();

  /** 情報充実度を指定した意見を持つセッションを作成する */
  async function createSessionWithRichness(
    configId: string,
    totalContentRichness: number | null
  ) {
    const session = await createTestSession(configId, testUser.id);
    await createTestOpinion(
      session.id,
      totalContentRichness != null
        ? { content_richness: { total: totalContentRichness } }
        : {}
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

  it("充実度の降順でセッションIDを返す", async () => {
    const configId = await configs.createConfigId();

    const session1 = await createSessionWithRichness(configId, 60);
    const session2 = await createSessionWithRichness(configId, 90);
    const session3 = await createSessionWithRichness(configId, 30);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(data?.[0].session_id).toBe(session2.id); // 90
    expect(data?.[1].session_id).toBe(session1.id); // 60
    expect(data?.[2].session_id).toBe(session3.id); // 30
  });

  it("充実度の昇順でセッションIDを返す", async () => {
    const configId = await configs.createConfigId();

    const session1 = await createSessionWithRichness(configId, 80);
    const session2 = await createSessionWithRichness(configId, 20);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
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
    expect(data?.[1].session_id).toBe(session1.id); // 80
  });

  it("充実度がnullのセッションはNULLS LASTで末尾に配置される", async () => {
    const configId = await configs.createConfigId();

    const withRichness = await createSessionWithRichness(configId, 50);
    // 意見なし → total_content_richness = null
    await createTestSession(configId, testUser.id);
    // 意見はあるが content_richness が null
    await createSessionWithRichness(configId, null);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(data?.[0].session_id).toBe(withRichness.id); // 50
    // null 系は末尾
  });

  it("offset/limitでページネーションが正しく動作する", async () => {
    const configId = await configs.createConfigId();

    const sessions = [];
    for (let i = 0; i < 5; i++) {
      sessions.push(await createSessionWithRichness(configId, (i + 1) * 10));
    }

    // 降順: 50, 40, 30, 20, 10 → offset=1, limit=2 → 40, 30
    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 1,
        p_limit: 2,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].session_id).toBe(sessions[3].id); // 40
    expect(data?.[1].session_id).toBe(sessions[2].id); // 30
  });

  it("別のconfigのセッションは含まれない", async () => {
    const configId1 = await configs.createConfigId();
    const session1 = await createSessionWithRichness(configId1, 90);

    const configId2 = await configs.createConfigId();
    await createSessionWithRichness(configId2, 50);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
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
      "find_sessions_ordered_by_total_content_richness",
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
