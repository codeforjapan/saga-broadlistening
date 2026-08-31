import { describe, expect, it } from "vitest";
import type { BillWithContent } from "@/features/bills/shared/types";
import { buildSummarySystemPrompt } from "./build-summary-system-prompt";

const makeBill = (
  overrides: Partial<BillWithContent> = {}
): BillWithContent => ({
  id: "bill-1",
  name: "テスト施策",
  slug: "test-policy",
  department: null,
  contact: null,
  is_featured: false,
  approved_by: null,
  approved_at: null,
  publish_status: "published",
  published_at: null,
  share_thumbnail_url: null,
  thumbnail_url: null,
  knowledge_source: "厚生労働省の報告書",
  enable_ai_chat: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  bill_content: {
    id: "bc-1",
    policy_id: "bill-1",
    title: "テスト施策タイトル",
    summary: "テスト施策の要約です",
    content: "テスト施策の内容",
    difficulty_level: "normal",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  tags: [],
  ...overrides,
});

describe("buildSummarySystemPrompt", () => {
  it("正常なbill情報・テーマ・メッセージでプロンプトに全情報が含まれる", () => {
    const result = buildSummarySystemPrompt({
      bill: makeBill(),
      interviewConfig: { description: "- 医療\n- 教育" },
      messages: [
        { role: "assistant", content: "こんにちは" },
        { role: "user", content: "賛成です" },
      ],
    });

    expect(result).toContain("テスト施策");
    expect(result).toContain("テスト施策タイトル");
    expect(result).toContain("テスト施策の要約です");
    expect(result).toContain("- 医療");
    expect(result).toContain("- 教育");
    expect(result).toContain("assistant: こんにちは");
    expect(result).toContain("user: 賛成です");
  });

  it("bill=nullの場合は施策の欄を作らず、テーマを対象として載せる", () => {
    const result = buildSummarySystemPrompt({
      bill: null,
      interviewConfig: { name: "佐賀市のみらい", description: "- テーマ1" },
      messages: [{ role: "user", content: "テスト" }],
    });

    expect(result).toContain("## インタビューの対象");
    expect(result).toContain("テーマ名: 佐賀市のみらい");
    expect(result).not.toContain("- 施策名:");
  });

  it("テーマ未設定の場合「（テーマ未設定）」が含まれる", () => {
    const result = buildSummarySystemPrompt({
      bill: makeBill(),
      interviewConfig: null,
      messages: [{ role: "user", content: "テスト" }],
    });

    expect(result).toContain("（テーマ未設定）");
  });

  it("テーマが複数ある場合、全テーマが「- テーマ名」形式で含まれる", () => {
    const result = buildSummarySystemPrompt({
      bill: makeBill(),
      interviewConfig: { description: "- 経済\n- 環境\n- 安全保障" },
      messages: [],
    });

    expect(result).toContain("- 経済");
    expect(result).toContain("- 環境");
    expect(result).toContain("- 安全保障");
  });

  it("メッセージ空配列の場合エラーなく動く", () => {
    const result = buildSummarySystemPrompt({
      bill: makeBill(),
      interviewConfig: { description: "- テーマ1" },
      messages: [],
    });

    expect(result).toContain("## 会話履歴\n\n");
  });

  it("会話履歴が 'role: content' フォーマットで含まれる", () => {
    const result = buildSummarySystemPrompt({
      bill: makeBill(),
      interviewConfig: { description: null },
      messages: [
        { role: "assistant", content: "質問1" },
        { role: "user", content: "回答1" },
        { role: "assistant", content: "質問2" },
        { role: "user", content: "回答2" },
      ],
    });

    expect(result).toContain(
      "assistant: 質問1\nuser: 回答1\nassistant: 質問2\nuser: 回答2"
    );
  });

  it("IDつきのuserメッセージが msg_id 付きフォーマットで含まれる", () => {
    const result = buildSummarySystemPrompt({
      bill: makeBill(),
      interviewConfig: { description: null },
      messages: [
        { role: "assistant", content: "質問1" },
        { role: "user", content: "回答1", id: "msg-uuid-1" },
        { role: "assistant", content: "質問2" },
        { role: "user", content: "回答2", id: "msg-uuid-2" },
      ],
    });

    expect(result).toContain("user [msg_id:msg-uuid-1]: 回答1");
    expect(result).toContain("user [msg_id:msg-uuid-2]: 回答2");
    expect(result).toContain("assistant: 質問1");
    expect(result).toContain("assistant: 質問2");
  });

  it("source_message_idの指示がプロンプトに含まれる", () => {
    const result = buildSummarySystemPrompt({
      bill: makeBill(),
      interviewConfig: { description: null },
      messages: [],
    });

    expect(result).toContain("source_message_id");
  });
});
