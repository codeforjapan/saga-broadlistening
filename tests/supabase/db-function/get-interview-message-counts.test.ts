import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestInterviewData,
  createTestInterviewMessages,
  createTestUser,
  type TestUser,
} from "../utils";

describe("get_interview_message_counts() 関数", () => {
  let testUser: TestUser;
  let cleanups: Array<() => Promise<void>> = [];

  /** 施策 ─ 意見募集 ─ セッションを作り、後片付け対象に登録する */
  async function createInterviewData() {
    const data = await createTestInterviewData(testUser.id);
    cleanups.push(data.cleanup);
    return data;
  }

  beforeEach(async () => {
    testUser = await createTestUser();
    cleanups = [];
  });

  afterEach(async () => {
    for (const cleanup of cleanups) {
      await cleanup();
    }
    await cleanupTestUser(testUser.id);
  });

  it("複数セッションのメッセージ数を正しく返す", async () => {
    const data1 = await createInterviewData();
    await createTestInterviewMessages(data1.session.id, 3);

    const data2 = await createInterviewData();
    await createTestInterviewMessages(data2.session.id, 5);

    const { data, error } = await adminClient.rpc(
      "get_interview_message_counts",
      { session_ids: [data1.session.id, data2.session.id] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);

    const count1 = data?.find(
      (r) => r.interview_session_id === data1.session.id
    );
    const count2 = data?.find(
      (r) => r.interview_session_id === data2.session.id
    );
    expect(count1?.message_count).toBe(3);
    expect(count2?.message_count).toBe(5);
  });

  it("メッセージが0件のセッションは結果に含まれない", async () => {
    const data1 = await createInterviewData();
    // メッセージを追加しない

    const { data, error } = await adminClient.rpc(
      "get_interview_message_counts",
      { session_ids: [data1.session.id] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("空の session_ids 配列を渡すと空の結果を返す", async () => {
    const { data, error } = await adminClient.rpc(
      "get_interview_message_counts",
      { session_ids: [] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("存在しない UUID を渡してもエラーにならない", async () => {
    const { data, error } = await adminClient.rpc(
      "get_interview_message_counts",
      { session_ids: ["00000000-0000-0000-0000-000000000000"] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
