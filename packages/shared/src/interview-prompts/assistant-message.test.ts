import { describe, expect, it } from "vitest";
import {
  collectAssistantTurnMetas,
  containsMaskedPii,
  resolvePiiNotice,
} from "./assistant-message";

describe("collectAssistantTurnMetas", () => {
  it("assistant 発話の question_id と予算の除外を読む", () => {
    expect(
      collectAssistantTurnMetas([
        { role: "assistant", content: '{"text":"a","question_id":"q1"}' },
        { role: "user", content: "答え" },
        {
          role: "assistant",
          content: '{"text":"b","question_id":"q1","budget_exempt":true}',
        },
        { role: "assistant", content: "旧形式のテキスト" },
      ])
    ).toEqual([
      { questionId: "q1", budgetExempt: false },
      { questionId: "q1", budgetExempt: true },
      { questionId: null, budgetExempt: false },
    ]);
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
