import { describe, expect, it } from "vitest";
import { AI_MODELS, isKnownModel } from "./models";

describe("isKnownModel", () => {
  it("AI_MODELS に登録済みのIDは true", () => {
    expect(isKnownModel(AI_MODELS.gpt5_2)).toBe(true);
    expect(isKnownModel("anthropic/claude-sonnet-4.6")).toBe(true);
    expect(isKnownModel("bedrock:jp.anthropic.claude-sonnet-4-6")).toBe(true);
    expect(
      isKnownModel("bedrock:jp.anthropic.claude-haiku-4-5-20251001-v1:0")
    ).toBe(true);
    expect(isKnownModel("bedrock:openai.gpt-oss-120b-1:0")).toBe(true);
  });

  it("未登録のIDは false", () => {
    expect(isKnownModel("openai/gpt-3.5-turbo")).toBe(false);
    expect(isKnownModel("")).toBe(false);
    expect(isKnownModel("not-a-model")).toBe(false);
    expect(isKnownModel("openai:custom-model")).toBe(false);
  });
});
