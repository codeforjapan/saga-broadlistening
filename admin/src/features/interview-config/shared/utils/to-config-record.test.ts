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
        participation_mode: "public",
        allowed_provider_keys: [],
      })
    ).toEqual({
      name: "市民意見",
      slug: "citizen-voices",
      status: "draft",
      description: null,
      chat_model: "",
      estimated_duration: null,
      thumbnail_url: null,
      participation_mode: "public",
      allowed_provider_keys: [],
    });
  });

  it("public では連携元の指定を保存しない", () => {
    expect(
      toConfigRecord({
        name: "市民意見",
        slug: "citizen-voices",
        status: "draft",
        participation_mode: "public",
        allowed_provider_keys: ["saga_super_app"],
      }).allowed_provider_keys
    ).toEqual([]);
  });

  it("external_identity では選んだ連携元をそのまま保存する", () => {
    expect(
      toConfigRecord({
        name: "市民意見",
        slug: "citizen-voices",
        status: "draft",
        participation_mode: "external_identity",
        allowed_provider_keys: ["saga_super_app"],
      }).allowed_provider_keys
    ).toEqual(["saga_super_app"]);
  });

  it("明示された既存モデルを別プロバイダーへ書き換えない", () => {
    expect(
      toConfigRecord({
        name: "市民意見",
        slug: "citizen-voices",
        status: "draft",
        chat_model: "openai/gpt-5.2",
        participation_mode: "public",
        allowed_provider_keys: [],
      }).chat_model
    ).toBe("openai/gpt-5.2");
  });
});
