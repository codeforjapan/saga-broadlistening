import { describe, expect, it } from "vitest";
import {
  collectAssistantTurnMetas,
  containsMaskedPii,
  resolvePiiNotice,
} from "./assistant-message";

describe("collectAssistantTurnMetas", () => {
  it("assistant 発話の question_id・予算の除外・ステージを読む", () => {
    expect(
      collectAssistantTurnMetas([
        {
          role: "assistant",
          content: '{"text":"a","question_id":"q1","stage":"chat"}',
        },
        { role: "user", content: "答え" },
        {
          role: "assistant",
          content: '{"text":"b","question_id":"q1","budget_exempt":true}',
        },
        { role: "assistant", content: '{"text":"c","stage":"summary"}' },
        { role: "assistant", content: "旧形式のテキスト" },
      ])
    ).toEqual([
      { questionId: "q1", budgetExempt: false, stage: "chat" },
      { questionId: "q1", budgetExempt: true, stage: null },
      { questionId: null, budgetExempt: false, stage: "summary" },
      { questionId: null, budgetExempt: false, stage: null },
    ]);
  });

  it("知らないステージの値は null にする", () => {
    expect(
      collectAssistantTurnMetas([
        { role: "assistant", content: '{"text":"a","stage":"unknown"}' },
      ])
    ).toEqual([{ questionId: null, budgetExempt: false, stage: null }]);
  });
});

describe("resolvePiiNotice", () => {
  it("伏せ字が無ければ null", () => {
    expect(resolvePiiNotice([{ role: "user", content: "こんにちは" }])).toBe(
      null
    );
  });

  it("伏せ字の後にまだ返していなければ pending、返していれば done", () => {
    const masked = { role: "user", content: "[電話番号]に連絡ください" };
    expect(resolvePiiNotice([masked])).toBe("pending");
    expect(
      resolvePiiNotice([masked, { role: "assistant", content: "{}" }])
    ).toBe("done");
  });

  it("伏せ字のラベルだけを個人情報とみなす", () => {
    expect(containsMaskedPii("[氏名]さん")).toBe(true);
    expect(containsMaskedPii("[参考]資料")).toBe(false);
  });
});
