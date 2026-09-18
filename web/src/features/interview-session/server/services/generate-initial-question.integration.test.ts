import {
  adminClient,
  cleanupTestUser,
  createTestInterviewData,
  createTestUser,
  type TestUser,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGenerateMock } from "@/test-utils/mock-language-model";
import { generateInitialQuestion } from "./generate-initial-question";

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

describe("generateInitialQuestion 統合テスト", () => {
  let testUser: TestUser;
  let sessionId: string;
  let cleanupInterviewData: () => Promise<void>;
  // 施策なし（抽象テーマ型）でも初期質問を生成できることを兼ねて bill: null で呼ぶ
  let interviewConfig: Awaited<
    ReturnType<typeof createTestInterviewData>
  >["config"];

  beforeEach(async () => {
    testUser = await createTestUser();
    const data = await createTestInterviewData(testUser.id);
    sessionId = data.session.id;
    cleanupInterviewData = data.cleanup;
    interviewConfig = data.config;
  });

  afterEach(async () => {
    await cleanupInterviewData();
    await cleanupTestUser(testUser.id);
  });

  it.each([
    { quickReplies: ["はい", "いいえ"] },
    { quickReplies: [] },
  ])("選択肢 $quickReplies を含む初回質問がDBに保存される", async ({
    quickReplies,
  }) => {
    const response = JSON.stringify({
      ...JSON.parse(llmResponse),
      quick_replies: quickReplies,
    });
    const expected = JSON.stringify({
      ...JSON.parse(expectedResponse),
      quick_replies: quickReplies,
    });
    const mockModel = createGenerateMock(response);

    const result = await generateInitialQuestion({
      sessionId,
      interviewConfig,
      bill: null,
      userId: testUser.id,
      deps: { model: mockModel },
    });

    // 戻り値を検証
    expect(result).not.toBeNull();
    expect(result?.role).toBe("assistant");
    expect(result?.content).toBe(expected);

    // DB 状態を検証: assistantメッセージが保存されていること
    const { data: messages } = await adminClient
      .from("interview_messages")
      .select("*")
      .eq("interview_session_id", sessionId)
      .order("created_at", { ascending: true });

    expect(messages).toHaveLength(1);
    expect(messages?.[0].role).toBe("assistant");
    expect(messages?.[0].content).toBe(expected);
    expect(messages?.[0].interview_session_id).toBe(sessionId);
  });

  it.each([
    { name: "空テキスト", response: "  " },
    {
      name: "quick_replies欠落",
      response: JSON.stringify({
        text: "こんにちは。公園の改善についてご意見を教えてください。",
        question_id: "question-1",
        topic_title: "公園の改善",
        next_stage: "chat",
      }),
    },
  ])("$name は検証で拒否しDBに保存しない", async ({ response }) => {
    const mockModel = createGenerateMock(response);

    const result = await generateInitialQuestion({
      sessionId,
      interviewConfig,
      bill: null,
      userId: testUser.id,
      deps: { model: mockModel },
    });

    // null が返ること
    expect(result).toBeNull();

    // DB 状態を検証: メッセージが保存されていないこと
    const { data: messages } = await adminClient
      .from("interview_messages")
      .select("*")
      .eq("interview_session_id", sessionId);

    expect(messages).toHaveLength(0);
  });
});
