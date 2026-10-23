import { describe, expect, it } from "vitest";
import { pickChatKnowledgeSource } from "./pick-chat-knowledge-source";

describe("pickChatKnowledgeSource", () => {
  it("policy が null/undefined なら空文字", () => {
    expect(pickChatKnowledgeSource(null)).toBe("");
    expect(pickChatKnowledgeSource(undefined)).toBe("");
  });

  it("AI質問機能 OFF なら空文字（ナレッジ本文があっても無視）", () => {
    expect(
      pickChatKnowledgeSource({
        knowledge_source: "本文",
        enable_ai_chat: false,
      })
    ).toBe("");
  });

  it("AI質問機能 ON でナレッジ本文があればその文字列を返す", () => {
    expect(
      pickChatKnowledgeSource({
        knowledge_source: "本文",
        enable_ai_chat: true,
      })
    ).toBe("本文");
  });

  it("AI質問機能 ON でナレッジが null なら空文字", () => {
    expect(
      pickChatKnowledgeSource({
        knowledge_source: null,
        enable_ai_chat: true,
      })
    ).toBe("");
  });
});
