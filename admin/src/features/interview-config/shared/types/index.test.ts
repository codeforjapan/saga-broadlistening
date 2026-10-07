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
