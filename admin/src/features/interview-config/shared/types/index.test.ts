import { describe, expect, it } from "vitest";
import { interviewConfigSchema } from "./index";

const config = {
  name: "募集設定",
  slug: "example",
  status: "draft",
  participation_mode: "public",
  allowed_provider_keys: [],
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

describe("interviewConfigSchema publication", () => {
  it("まとまり次第お知らせなら時期と場所はいらない", () => {
    expect(
      interviewConfigSchema.safeParse({
        ...config,
        publication_mode: "when_ready",
      }).success
    ).toBe(true);
  });

  it("時期と場所を決めて知らせるなら、時期と場所の両方が必要", () => {
    expect(
      interviewConfigSchema.safeParse({
        ...config,
        publication_mode: "scheduled",
        publication_timing: "2027年3月ごろ",
      }).success
    ).toBe(false);
    expect(
      interviewConfigSchema.safeParse({
        ...config,
        publication_mode: "scheduled",
        publication_timing: "2027年3月ごろ",
        publication_place: "koho",
      }).success
    ).toBe(true);
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
