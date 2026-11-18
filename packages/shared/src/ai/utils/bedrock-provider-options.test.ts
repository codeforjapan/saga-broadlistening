import { describe, expect, it } from "vitest";
import { buildBedrockProviderOptions } from "./bedrock-provider-options";

const guardrail = { guardrailIdentifier: "guardrail", guardrailVersion: "1" };

describe("buildBedrockProviderOptions", () => {
  it("付ける設定がなければ undefined を返す", () => {
    expect(
      buildBedrockProviderOptions(
        "jp.anthropic.claude-sonnet-4-6",
        undefined,
        "chat"
      )
    ).toBeUndefined();
  });

  it("gpt-oss には reasoning effort を付ける", () => {
    expect(
      buildBedrockProviderOptions("openai.gpt-oss-120b-1:0", undefined, "chat")
    ).toEqual({ reasoningConfig: { maxReasoningEffort: "medium" } });
  });

  it("gpt-oss 以外には reasoning effort を付けない", () => {
    expect(
      buildBedrockProviderOptions(
        "jp.anthropic.claude-sonnet-4-6",
        guardrail,
        "chat"
      )
    ).toEqual({ guardrailConfig: guardrail });
  });

  it("Opus 5.5 にはネイティブ構造化出力を指定する", () => {
    expect(
      buildBedrockProviderOptions(
        "jp.anthropic.claude-opus-5-5",
        guardrail,
        "chat"
      )
    ).toEqual({
      guardrailConfig: guardrail,
      structuredOutputMode: "outputFormat",
    });
  });

  it("Haiku 5.5 は既定の構造化出力のまま", () => {
    expect(
      buildBedrockProviderOptions(
        "jp.anthropic.claude-haiku-5-5",
        undefined,
        "chat"
      )
    ).toBeUndefined();
  });

  it("gpt-oss でも guardrail と併用できる", () => {
    expect(
      buildBedrockProviderOptions("openai.gpt-oss-120b-1:0", guardrail, "chat")
    ).toEqual({
      guardrailConfig: guardrail,
      reasoningConfig: { maxReasoningEffort: "medium" },
    });
  });

  it("インタビューの Sonnet 4.6 と Haiku 4.5 には outputFormat を指定する", () => {
    for (const model of [
      "jp.anthropic.claude-sonnet-4-6",
      "jp.anthropic.claude-haiku-4-5-20251001-v1:0",
    ]) {
      expect(
        buildBedrockProviderOptions(model, undefined, "interview")
      ).toEqual({ structuredOutputMode: "outputFormat" });
    }
  });

  it("インタビュー以外の用途では SDK の既定のまま", () => {
    expect(
      buildBedrockProviderOptions(
        "jp.anthropic.claude-sonnet-4-6",
        undefined,
        "summary"
      )
    ).toBeUndefined();
  });

  it("インタビューでも確かめていないモデルには指定しない", () => {
    expect(
      buildBedrockProviderOptions(
        "jp.anthropic.claude-haiku-5-5",
        undefined,
        "interview"
      )
    ).toBeUndefined();
    expect(
      buildBedrockProviderOptions(
        "openai.gpt-oss-120b-1:0",
        undefined,
        "interview"
      )
    ).toEqual({ reasoningConfig: { maxReasoningEffort: "medium" } });
  });
});
