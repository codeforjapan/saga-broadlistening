import { describe, expect, it } from "vitest";
import { interviewConfigSchema } from "./index";

const config = {
  name: "募集設定",
  slug: "example",
  status: "draft",
  participation_mode: "public",
  allowed_provider_keys: [],
  rating_enabled: false,
  chat_log_public: false,
};

describe("interviewConfigSchema model validation", () => {
  it.each([
    undefined,
    null,
    "",
    "openai:custom-model",
    "bedrock:custom-profile",
    "gateway:custom/new-model",
    "anthropic/claude-sonnet-4.6",
  ])("accepts environment default or a valid explicit model: %s", (chat_model) => {
    expect(
      interviewConfigSchema.safeParse({ ...config, chat_model }).success
    ).toBe(true);
  });
  it.each([
    "openai/nonexistent",
    "unknown:model",
    "google:",
    "   ",
  ])("rejects invalid model IDs: %s", (chat_model) => {
    expect(
      interviewConfigSchema.safeParse({ ...config, chat_model }).success
    ).toBe(false);
  });
});

describe("interviewConfigSchema participation", () => {
  it("participation_mode は必須", () => {
    const { participation_mode: _omit, ...withoutMode } = config;
    expect(interviewConfigSchema.safeParse(withoutMode).success).toBe(false);
  });

  it("external_identity は連携元を1つ以上要求する", () => {
    expect(
      interviewConfigSchema.safeParse({
        ...config,
        participation_mode: "external_identity",
      }).success
    ).toBe(false);
    expect(
      interviewConfigSchema.safeParse({
        ...config,
        participation_mode: "external_identity",
        allowed_provider_keys: ["saga_super_app"],
      }).success
    ).toBe(true);
  });

  it("未登録の連携元は受け付けない", () => {
    expect(
      interviewConfigSchema.safeParse({
        ...config,
        participation_mode: "external_identity",
        allowed_provider_keys: ["unknown_app"],
      }).success
    ).toBe(false);
  });
});

describe("interviewConfigSchema の設計項目", () => {
  it("意見がほしい点は60文字ちょうどなら保存できる", () => {
    expect(
      interviewConfigSchema.safeParse({
        ...config,
        opinion_focus: "あ".repeat(60),
      }).success
    ).toBe(true);
  });

  it("決まっていることは40文字まで", () => {
    expect(
      interviewConfigSchema.safeParse({
        ...config,
        decided_matters: "あ".repeat(40),
      }).success
    ).toBe(true);
    expect(
      interviewConfigSchema.safeParse({
        ...config,
        decided_matters: "あ".repeat(41),
      }).success
    ).toBe(false);
  });

  it("意見がほしい点は60文字まで", () => {
    expect(
      interviewConfigSchema.safeParse({
        ...config,
        opinion_focus: "あ".repeat(61),
      }).success
    ).toBe(false);
  });
});

describe("interviewConfigSchema の表示の切り替え", () => {
  it("星評価と会話ログの切り替えは必須（既定値はフォームで入れる）", () => {
    const { rating_enabled: _, ...withoutRating } = config;
    expect(interviewConfigSchema.safeParse(withoutRating).success).toBe(false);
    const { chat_log_public: __, ...withoutChatLog } = config;
    expect(interviewConfigSchema.safeParse(withoutChatLog).success).toBe(false);
  });
});
