import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestInterviewMessages,
  createTestUser,
  type TestUser,
} from "../utils";
import { cleanupTestInterviewConfig, createTestSession } from "./helpers";

describe("find_sessions_ordered_by_message_count() 関数", () => {
  let testUser: TestUser;
  const configIds: string[] = [];

  async function createConfig(): Promise<string> {
    const config = await createTestInterviewConfig();
    configIds.push(config.id);
    return config.id;
  }

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    for (const configId of configIds) {
      await cleanupTestInterviewConfig(configId);
    }
    configIds.length = 0;
    await cleanupTestUser(testUser.id);
  });

  it("メッセージ数の降順でセッションIDを返す", async () => {
    const configId = await createConfig();

    const session1 = await createTestSession(configId, testUser.id);
    await createTestInterviewMessages(session1.id, 2);

    const session2 = await createTestSession(configId, testUser.id);
    await createTestInterviewMessages(session2.id, 5);

    const session3 = await createTestSession(configId, testUser.id);
    await createTestInterviewMessages(session3.id, 1);

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
    expect(data).toHaveLength(3);
    expect(data?.[0].session_id).toBe(session2.id);
    expect(data?.[1].session_id).toBe(session1.id);
    expect(data?.[2].session_id).toBe(session3.id);
  });

  it("メッセージ数の昇順でセッションIDを返す", async () => {
    const configId = await createConfig();

    const session1 = await createTestSession(configId, testUser.id);
    await createTestInterviewMessages(session1.id, 3);

    const session2 = await createTestSession(configId, testUser.id);
    await createTestInterviewMessages(session2.id, 1);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_message_count",
      {
        p_config_id: configId,
        p_ascending: true,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].session_id).toBe(session2.id);
    expect(data?.[1].session_id).toBe(session1.id);
  });

  it("offset/limitでページネーションが正しく動作する", async () => {
    const configId = await createConfig();

    const sessions = [];
    for (let i = 0; i < 5; i++) {
      const session = await createTestSession(configId, testUser.id);
      await createTestInterviewMessages(session.id, (i + 1) * 2);
      sessions.push(session);
    }

    // 降順: 10, 8, 6, 4, 2 → offset=1, limit=2 → 8, 6
    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_message_count",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 1,
        p_limit: 2,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].session_id).toBe(sessions[3].id); // 8メッセージ
    expect(data?.[1].session_id).toBe(sessions[2].id); // 6メッセージ
  });

  it("別のconfigのセッションは含まれない", async () => {
    const configId1 = await createConfig();
    const session1 = await createTestSession(configId1, testUser.id);
    await createTestInterviewMessages(session1.id, 10);

    const configId2 = await createConfig();
    const session2 = await createTestSession(configId2, testUser.id);
    await createTestInterviewMessages(session2.id, 5);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_message_count",
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

  it("メッセージが0件のセッションも結果に含まれる", async () => {
    const configId = await createConfig();

    const sessionWithMessages = await createTestSession(configId, testUser.id);
    await createTestInterviewMessages(sessionWithMessages.id, 3);

    const sessionEmpty = await createTestSession(configId, testUser.id);
    // メッセージを追加しない

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
    // 降順: 3件のセッションが先、0件が後
    expect(data?.[0].session_id).toBe(sessionWithMessages.id);
    expect(data?.[1].session_id).toBe(sessionEmpty.id);
  });

  it("存在しないconfig_idでは空配列を返す", async () => {
    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_message_count",
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
