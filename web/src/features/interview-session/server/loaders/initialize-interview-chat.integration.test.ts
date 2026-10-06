import {
  adminClient,
  cleanupTestExternalIdentityByUid,
  cleanupTestUser,
  createTestInterviewData,
  createTestInterviewMessages,
  createTestUser,
  type TestUser,
  uniqueSuffix,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveExternalIdentities } from "@/features/external-identity/server/services/resolve-external-identities";
import { createGenerateMock } from "@/test-utils/mock-language-model";
import type { GetUserFn } from "../utils/verify-session-ownership";
import { initializeInterviewChat } from "./initialize-interview-chat";

function createGetUser(userId: string): GetUserFn {
  return async () => ({
    data: { user: { id: userId } },
    error: null,
  });
}

// interviewChatTextSchema に準拠したモックレスポンス
// LLMのレスポンスはtopic_title: nullだが、overrideInitialTopicTitleにより「はじめに」に上書きされる
const llmResponse = JSON.stringify({
  text: "こんにちは！テストインタビューを始めましょう。最初の質問です。",
  quick_replies: ["はい", "いいえ"],
  question_id: null,
  topic_title: null,
  next_stage: "chat",
});
const expectedResponse = JSON.stringify({
  text: "こんにちは！テストインタビューを始めましょう。最初の質問です。",
  quick_replies: ["はい", "いいえ"],
  question_id: null,
  topic_title: "はじめに",
  next_stage: "chat",
});

describe("initializeInterviewChat 統合テスト", () => {
  let testUser: TestUser;
  let sessionId: string;
  let cleanupInterviewData: () => Promise<void>;
  let config: Awaited<ReturnType<typeof createTestInterviewData>>["config"];
  let interviewConfigId: string;
  // 初期質問の生成はモデルをモックするため、施策の中身はここでは効かない。
  // 施策なし（抽象テーマ型）でもセッション初期化が通ることを兼ねて null で呼ぶ。
  const bill = null;

  beforeEach(async () => {
    testUser = await createTestUser();
    const data = await createTestInterviewData(testUser.id);
    sessionId = data.session.id;
    cleanupInterviewData = data.cleanup;
    config = data.config;
    interviewConfigId = data.config.id;
  });

  afterEach(async () => {
    await cleanupInterviewData();
    await cleanupTestUser(testUser.id);
  });

  it("既存セッションとメッセージをそのまま返す", async () => {
    // メッセージを事前に作成してLLM呼び出しを回避する
    await createTestInterviewMessages(sessionId, 2);

    const result = await initializeInterviewChat(config, bill, {
      deps: {
        getUser: createGetUser(testUser.id),
      },
    });

    expect(result.session.id).toBe(sessionId);
    expect(result.session.interview_config_id).toBe(interviewConfigId);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].interview_session_id).toBe(sessionId);
  });

  it("セッションが存在しない場合は新しいセッションを作成する", async () => {
    const mockModel = createGenerateMock(llmResponse);

    // 既存セッションをアーカイブして「セッションなし」の状態にする
    await adminClient
      .from("interview_sessions")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", sessionId);

    const result = await initializeInterviewChat(config, bill, {
      deps: {
        getUser: createGetUser(testUser.id),
        model: mockModel,
      },
    });

    // 新しいセッションが作成されていること
    expect(result.session.id).not.toBe(sessionId);
    expect(result.session.interview_config_id).toBe(interviewConfigId);
    expect(result.session.user_id).toBe(testUser.id);
    // MockModelが生成した初期質問メッセージが含まれること
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("assistant");
    expect(result.messages[0].content).toBe(expectedResponse);
  });

  it("外部IDが未記録の進行中セッションに、紐付いた外部IDを後から記録する", async () => {
    await createTestInterviewMessages(sessionId, 2);
    const uid = `uid-${uniqueSuffix()}`;
    try {
      const identities = await resolveExternalIdentities({
        userId: testUser.id,
        claims: [{ providerKey: "saga_super_app", externalUid: uid }],
      });

      const result = await initializeInterviewChat(config, bill, {
        deps: {
          getUser: createGetUser(testUser.id),
          getExternalIdentities: async () => identities,
        },
      });

      expect(result.session.id).toBe(sessionId);
      expect(result.session.external_identity_id).toBe(identities[0].id);

      const { data } = await adminClient
        .from("interview_sessions")
        .select("external_identity_id")
        .eq("id", sessionId)
        .single();
      expect(data?.external_identity_id).toBe(identities[0].id);
    } finally {
      await cleanupTestExternalIdentityByUid("saga_super_app", uid);
    }
  });
});
