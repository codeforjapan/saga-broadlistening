import { SITE_NAME } from "@mirai-gikai/branding/site";
import { describe, expect, it } from "vitest";
import { buildBillChatSystemNormalPrompt } from "./bill-chat-system-normal";

describe("buildBillChatSystemNormalPrompt", () => {
  it("4つのパラメータがプロンプトに埋め込まれる", () => {
    const result = buildBillChatSystemNormalPrompt(
      "テスト施策名",
      "テスト施策タイトル",
      "テスト施策要約",
      "テスト施策詳細"
    );

    expect(result).toContain("テスト施策名");
    expect(result).toContain("テスト施策タイトル");
    expect(result).toContain("テスト施策要約");
    expect(result).toContain("テスト施策詳細");
  });

  it("難易度「ふつう」セクションが含まれる", () => {
    const result = buildBillChatSystemNormalPrompt("a", "b", "c", "d");

    expect(result).toContain("回答の難易度：ふつう");
  });

  it("サービスの説明が含まれ、旧ブランド表記を含まない", () => {
    const result = buildBillChatSystemNormalPrompt("a", "b", "c", "d");

    expect(result).toContain(SITE_NAME);
    expect(result).not.toContain("みらい議会");
    expect(result).not.toContain("チームみらい");
  });

  it("knowledgeSource を渡すと <knowledge_source> セクションが含まれる", () => {
    const result = buildBillChatSystemNormalPrompt(
      "a",
      "b",
      "c",
      "d",
      "補足知識"
    );

    expect(result).toContain("補足ナレッジ");
    expect(result).toContain("補足知識");
  });

  it("knowledgeSource を省略するとセクションごと出ない", () => {
    const result = buildBillChatSystemNormalPrompt("a", "b", "c", "d");

    expect(result).not.toContain("<knowledge_source>");
  });
});
