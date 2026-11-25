import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestOpinion,
  createTestSession,
  createTestUser,
  type TestUser,
} from "../utils";
import { createTestReactions, trackInterviewConfigs } from "./helpers";

describe("find_sessions_ordered_by_helpful_count() 関数", () => {
  let testUsers: TestUser[] = [];
  const configs = trackInterviewConfigs();

  beforeEach(async () => {
    // リアクションは1ユーザー1意見につき1件のため複数ユーザーを用意する
    for (let i = 0; i < 5; i++) {
      testUsers.push(await createTestUser());
    }
  });

  afterEach(async () => {
    await configs.cleanup();
    for (const user of testUsers) {
      await cleanupTestUser(user.id);
    }
    testUsers = [];
  });

  it("参考になるリアクション数の降順でセッションIDを返す", async () => {
    const configId = await configs.createConfigId();

    // session1: 1 helpful
    const session1 = await createTestSession(configId, testUsers[0].id);
    const opinion1 = await createTestOpinion(session1.id);
    await createTestReactions(opinion1.id, [testUsers[0].id]);

    // session2: 3 helpful
    const session2 = await createTestSession(configId, testUsers[0].id);
    const opinion2 = await createTestOpinion(session2.id);
    await createTestReactions(opinion2.id, [
      testUsers[0].id,
      testUsers[1].id,
      testUsers[2].id,
    ]);

    // session3: 2 helpful
    const session3 = await createTestSession(configId, testUsers[0].id);
    const opinion3 = await createTestOpinion(session3.id);
    await createTestReactions(opinion3.id, [testUsers[0].id, testUsers[1].id]);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_helpful_count",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(data?.[0].session_id).toBe(session2.id); // 3
    expect(data?.[1].session_id).toBe(session3.id); // 2
    expect(data?.[2].session_id).toBe(session1.id); // 1
  });

  it("参考になるリアクション数の昇順でセッションIDを返す", async () => {
    const configId = await configs.createConfigId();

    const session1 = await createTestSession(configId, testUsers[0].id);
    const opinion1 = await createTestOpinion(session1.id);
    await createTestReactions(opinion1.id, [testUsers[0].id, testUsers[1].id]);

    const session2 = await createTestSession(configId, testUsers[0].id);
    const opinion2 = await createTestOpinion(session2.id);
    await createTestReactions(opinion2.id, [testUsers[0].id]);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_helpful_count",
      {
        p_config_id: configId,
        p_ascending: true,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].session_id).toBe(session2.id); // 1
    expect(data?.[1].session_id).toBe(session1.id); // 2
  });

  it("リアクションなしのセッションは0として扱われる", async () => {
    const configId = await configs.createConfigId();

    // session1: 2 helpful
    const session1 = await createTestSession(configId, testUsers[0].id);
    const opinion1 = await createTestOpinion(session1.id);
    await createTestReactions(opinion1.id, [testUsers[0].id, testUsers[1].id]);

    // session2: 意見なし（リアクションもなし）
    await createTestSession(configId, testUsers[0].id);

    // session3: 意見はあるがリアクションなし
    const session3 = await createTestSession(configId, testUsers[0].id);
    await createTestOpinion(session3.id);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_helpful_count",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(data?.[0].session_id).toBe(session1.id); // 2
    // 残る2件は 0 件同士なので started_at 降順で並ぶ
  });

  it("hmmリアクションはhelpfulカウントに含まれない", async () => {
    const configId = await configs.createConfigId();

    // session1: 1 helpful + 3 hmm
    const session1 = await createTestSession(configId, testUsers[0].id);
    const opinion1 = await createTestOpinion(session1.id);
    await createTestReactions(opinion1.id, [testUsers[0].id], "helpful");
    await createTestReactions(
      opinion1.id,
      [testUsers[1].id, testUsers[2].id, testUsers[3].id],
      "hmm"
    );

    // session2: 2 helpful
    const session2 = await createTestSession(configId, testUsers[0].id);
    const opinion2 = await createTestOpinion(session2.id);
    await createTestReactions(
      opinion2.id,
      [testUsers[0].id, testUsers[1].id],
      "helpful"
    );

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_helpful_count",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].session_id).toBe(session2.id); // helpful 2件
    expect(data?.[1].session_id).toBe(session1.id); // helpful 1件
  });

  it("offset/limitでページネーションが正しく動作する", async () => {
    const configId = await configs.createConfigId();

    const sessions = [];
    for (let i = 0; i < 4; i++) {
      const session = await createTestSession(configId, testUsers[0].id);
      const opinion = await createTestOpinion(session.id);
      // i+1 件の helpful リアクション
      await createTestReactions(
        opinion.id,
        testUsers.slice(0, i + 1).map((u) => u.id)
      );
      sessions.push(session);
    }

    // 降順: 4, 3, 2, 1 → offset=1, limit=2 → 3, 2
    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_helpful_count",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 1,
        p_limit: 2,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].session_id).toBe(sessions[2].id); // helpful 3件
    expect(data?.[1].session_id).toBe(sessions[1].id); // helpful 2件
  });

  it("別のconfigのセッションは含まれない", async () => {
    const configId1 = await configs.createConfigId();
    const session1 = await createTestSession(configId1, testUsers[0].id);
    const opinion1 = await createTestOpinion(session1.id);
    await createTestReactions(opinion1.id, [testUsers[0].id]);

    const configId2 = await configs.createConfigId();
    const session2 = await createTestSession(configId2, testUsers[0].id);
    const opinion2 = await createTestOpinion(session2.id);
    await createTestReactions(opinion2.id, [
      testUsers[0].id,
      testUsers[1].id,
      testUsers[2].id,
    ]);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_helpful_count",
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

  it("p_visibilityで公開状態フィルタできる", async () => {
    const configId = await configs.createConfigId();

    const publicSession = await createTestSession(configId, testUsers[0].id);
    await createTestOpinion(publicSession.id, { review_status: "published" });

    const privateSession = await createTestSession(configId, testUsers[0].id);
    await createTestOpinion(privateSession.id, {
      review_status: "pending_review",
    });

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_helpful_count",
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
    expect(data?.[0].session_id).toBe(publicSession.id);
  });

  it("存在しないconfig_idでは空配列を返す", async () => {
    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_helpful_count",
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
