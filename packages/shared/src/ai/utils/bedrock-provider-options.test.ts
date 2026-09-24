import { describe, expect, it } from "vitest";
import { buildBedrockProviderOptions } from "./bedrock-provider-options";

const guardrail = { guardrailIdentifier: "guardrail", guardrailVersion: "1" };

describe("buildBedrockProviderOptions", () => {
  it("付ける設定がなければ undefined を返す", () => {
    expect(
      buildBedrockProviderOptions("jp.anthropic.claude-sonnet-4-6", undefined)
    ).toBeUndefined();
  });

  it("gpt-oss には reasoning effort を付ける", () => {
    expect(
      buildBedrockProviderOptions("openai.gpt-oss-120b-1:0", undefined)
    ).toEqual({ reasoningConfig: { maxReasoningEffort: "medium" } });
  });

  it("gpt-oss 以外には reasoning effort を付けない", () => {
    expect(
      buildBedrockProviderOptions("jp.anthropic.claude-sonnet-4-6", guardrail)
    ).toEqual({ guardrailConfig: guardrail });
  });

  it("gpt-oss でも guardrail と併用できる", () => {
    expect(
      buildBedrockProviderOptions("openai.gpt-oss-120b-1:0", guardrail)
    ).toEqual({
      guardrailConfig: guardrail,
      reasoningConfig: { maxReasoningEffort: "medium" },
    });
  });
});
