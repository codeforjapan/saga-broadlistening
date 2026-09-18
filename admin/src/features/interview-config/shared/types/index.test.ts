import { describe, expect, it } from "vitest";
import { interviewConfigSchema } from "./index";

const config = { name: "募集設定", slug: "example", status: "draft" };

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
