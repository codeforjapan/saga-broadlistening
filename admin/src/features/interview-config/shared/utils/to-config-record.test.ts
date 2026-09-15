import { describe, expect, it } from "vitest";
import { toConfigRecord } from "./to-config-record";

describe("toConfigRecord", () => {
  it.each([
    undefined,
    null,
    "",
  ])("モデル未指定 (%s) は固定モデルで保存せず環境設定への追従を維持する", (chatModel) => {
    expect(
      toConfigRecord({
        name: "市民意見",
        slug: "citizen-voices",
        status: "draft",
        chat_model: chatModel,
      })
    ).toEqual({
      name: "市民意見",
      slug: "citizen-voices",
      status: "draft",
      description: null,
      chat_model: "",
      estimated_duration: null,
      thumbnail_url: null,
    });
  });

  it("明示された既存モデルを別プロバイダーへ書き換えない", () => {
    expect(
      toConfigRecord({
        name: "市民意見",
        slug: "citizen-voices",
        status: "draft",
        chat_model: "openai/gpt-5.2",
      }).chat_model
    ).toBe("openai/gpt-5.2");
  });
});
