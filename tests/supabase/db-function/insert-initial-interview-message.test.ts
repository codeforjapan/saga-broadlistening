import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestInterviewConfig,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestSession,
  createTestUser,
  getAnonClient,
} from "../utils";

describe("insert_initial_interview_message", () => {
  let user: { id: string };
  let configId: string;

  beforeAll(async () => {
    user = await createTestUser();
    configId = (await createTestInterviewConfig({ status: "open" })).id;
  });

  afterAll(async () => {
    await cleanupTestInterviewConfig(configId);
    await cleanupTestUser(user.id);
  });

  async function countMessages(sessionId: string) {
    const { count } = await adminClient
      .from("interview_messages")
      .select("id", { count: "exact", head: true })
      .eq("interview_session_id", sessionId);
    return count;
  }

  it("最初の質問を保存して返す", async () => {
    const session = await createTestSession(configId, user.id);

    const { data, error } = await adminClient.rpc(
      "insert_initial_interview_message",
      { p_session_id: session.id, p_content: "最初の質問" }
    );

    expect(error).toBeNull();
    expect(data).toMatchObject({
      interview_session_id: session.id,
      role: "assistant",
      content: "最初の質問",
      is_initial_question: true,
    });
    expect(await countMessages(session.id)).toBe(1);
  });

  it("2回目は保存せず、保存済みの最初の質問を返す", async () => {
    const session = await createTestSession(configId, user.id);
    const first = await adminClient.rpc("insert_initial_interview_message", {
      p_session_id: session.id,
      p_content: "1回目の生成",
    });

    const second = await adminClient.rpc("insert_initial_interview_message", {
      p_session_id: session.id,
      p_content: "2回目の生成",
    });

    expect(second.error).toBeNull();
    expect(second.data?.id).toBe(first.data?.id);
    expect(second.data?.content).toBe("1回目の生成");
    expect(await countMessages(session.id)).toBe(1);
  });

  it("同時に呼ばれても最初の質問は1件だけ保存する", async () => {
    const session = await createTestSession(configId, user.id);

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        adminClient.rpc("insert_initial_interview_message", {
          p_session_id: session.id,
          p_content: `並行${i}`,
        })
      )
    );

    for (const { error } of results) expect(error).toBeNull();
    const ids = new Set(results.map(({ data }) => data?.id));
    expect(ids.size).toBe(1);
    expect(await countMessages(session.id)).toBe(1);
  });

  it("セッションごとに別々に保存する", async () => {
    const sessionA = await createTestSession(configId, user.id);
    const sessionB = await createTestSession(configId, user.id);

    await adminClient.rpc("insert_initial_interview_message", {
      p_session_id: sessionA.id,
      p_content: "A",
    });
    await adminClient.rpc("insert_initial_interview_message", {
      p_session_id: sessionB.id,
      p_content: "B",
    });

    expect(await countMessages(sessionA.id)).toBe(1);
    expect(await countMessages(sessionB.id)).toBe(1);
  });

  it("通常のメッセージは制約の対象外で、何件でも保存できる", async () => {
    const session = await createTestSession(configId, user.id);
    await adminClient.rpc("insert_initial_interview_message", {
      p_session_id: session.id,
      p_content: "最初の質問",
    });

    const { error } = await adminClient.from("interview_messages").insert([
      { interview_session_id: session.id, role: "user", content: "回答" },
      {
        interview_session_id: session.id,
        role: "assistant",
        content: "次の質問",
      },
    ]);

    expect(error).toBeNull();
    expect(await countMessages(session.id)).toBe(3);
  });

  it("ブラウザの権限（anon）からは呼べない", async () => {
    const session = await createTestSession(configId, user.id);

    const { error } = await getAnonClient().rpc(
      "insert_initial_interview_message",
      { p_session_id: session.id, p_content: "不正な保存" }
    );

    expect(error).not.toBeNull();
    expect(await countMessages(session.id)).toBe(0);
  });
});
