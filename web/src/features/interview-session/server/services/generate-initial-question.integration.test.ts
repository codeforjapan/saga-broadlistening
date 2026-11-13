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

// interviewInitialSchema に準拠したモックレスポンス
// question_id・選択肢・話題名（「はじめに」）はコードが決めて保存する
const llmResponse = JSON.stringify({
  question_id: "Q1",
  topic_title: "関わり",
  text: "こんにちは！テストインタビューを始めましょう。最初の質問です。",
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
    { quickReplies: ["はい", "いいえ"] as string[] | null },
    { quickReplies: null },
  ])("最初の質問（選択肢 $quickReplies）の ID と選択肢を付けて保存する", async ({
    quickReplies,
  }) => {
    const { data: question, error } = await adminClient
      .from("interview_questions")
      .insert({
        interview_config_id: interviewConfig.id,
        question: "関わりはありますか？",
        question_order: 1,
        quick_replies: quickReplies,
      })
      .select("id")
      .single();
    if (error) throw error;
    const mockModel = createGenerateMock(llmResponse);

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
    expect(JSON.parse(result?.content ?? "{}")).toMatchObject({
      text: "こんにちは！テストインタビューを始めましょう。最初の質問です。",
      question_id: question.id,
      topic_title: "はじめに",
      quick_replies: [...(quickReplies ?? []), "この質問はとばす"],
      stage: "chat",
    });

    // DB 状態を検証: assistantメッセージが保存されていること
    const { data: messages } = await adminClient
      .from("interview_messages")
      .select("*")
      .eq("interview_session_id", sessionId)
      .order("created_at", { ascending: true });

    expect(messages).toHaveLength(1);
    expect(messages?.[0].content).toBe(result?.content);
  });

  it.each([
    { name: "空テキスト", response: "  " },
    {
      name: "question_id欠落",
      response: JSON.stringify({
        topic_title: "公園の改善",
        text: "こんにちは。公園の改善についてご意見を教えてください。",
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
