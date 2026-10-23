import { describe, expect, it } from "vitest";
import { isValidModelId } from "./is-valid-model-id";

describe("isValidModelId", () => {
  it.each([
    "anthropic/claude-sonnet-4.6",
    "bedrock:jp.anthropic.claude-haiku-4-5-20251001-v1:0",
    "bedrock:arn:aws:bedrock:ap-northeast-1:123456789012:application-inference-profile/custom",
    "openai:custom-model",
    "google:gemini-custom",
    "gateway:custom/new-model",
  ])("accepts known legacy and explicit qualified models: %s", (model) => {
    expect(isValidModelId(model)).toBe(true);
  });
  it.each([
    "",
    "unknown:model",
    "bedrock:",
    "openai:model with spaces",
    "openai/nonexistent",
    "invalid-model",
  ])("rejects malformed and unknown legacy IDs: %s", (model) => {
    expect(isValidModelId(model)).toBe(false);
  });
});
