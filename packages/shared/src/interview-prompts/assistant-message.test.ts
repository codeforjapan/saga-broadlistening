import { describe, expect, it } from "vitest";
import { collectAssistantTurnMetas } from "./assistant-message";

describe("collectAssistantTurnMetas", () => {
  it("assistant 発話の question_id とステージを読む", () => {
    expect(
      collectAssistantTurnMetas([
        {
          role: "assistant",
          content: '{"text":"a","question_id":"q1","stage":"chat"}',
        },
        { role: "user", content: "答え" },
        {
          role: "assistant",
          content: '{"text":"b","question_id":"q1"}',
        },
        { role: "assistant", content: '{"text":"c","stage":"summary"}' },
        { role: "assistant", content: "旧形式のテキスト" },
      ])
    ).toEqual([
      { questionId: "q1", stage: "chat" },
      { questionId: "q1", stage: null },
      { questionId: null, stage: "summary" },
      { questionId: null, stage: null },
    ]);
  });

  it("知らないステージの値は null にする", () => {
    expect(
      collectAssistantTurnMetas([
        { role: "assistant", content: '{"text":"a","stage":"unknown"}' },
      ])
    ).toEqual([{ questionId: null, stage: null }]);
  });
});
