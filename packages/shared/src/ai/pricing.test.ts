import { describe, expect, it } from "vitest";
import { getModelPricing, parseModelPricingOverrides } from "./pricing";

describe("getModelPricing", () => {
  it.each([
    "openai/gpt-4o",
    "gateway:openai/gpt-4o",
  ])("resolves legacy Gateway rates: %s", (model) => {
    expect(getModelPricing(model)).toEqual({
      inputTokensPerMillionUsd: 2.5,
      outputTokensPerMillionUsd: 10,
    });
  });
  it.each([
    "openai:gpt-4o",
    "openai:gpt-5.6-sol",
    "google:gemini-3-flash",
    "bedrock:global.anthropic.claude-sonnet-4-6",
    "bedrock:custom-profile",
    "bedrock:unknown-model",
    "gateway:unknown/model",
    "gateway:gateway:openai/gpt-4o",
    "constructor",
    "__proto__",
    "",
  ])("leaves unverified model and provider rates unknown: %s", (model) => {
    expect(getModelPricing(model)).toBeUndefined();
  });
});

it.each([
  ["bedrock:jp.anthropic.claude-sonnet-4-6", 3.3, 16.5],
  ["bedrock:jp.anthropic.claude-haiku-4-5-20251001-v1:0", 1.1, 5.5],
  ["bedrock:openai.gpt-oss-120b-1:0", 0.18, 0.73],
])("uses verified Tokyo/Japan standard Bedrock rates for %s", (model, input, output) => {
  expect(getModelPricing(model)).toEqual({
    inputTokensPerMillionUsd: input,
    outputTokensPerMillionUsd: output,
  });
});

describe("parseModelPricingOverrides", () => {
  it("has no overrides when the environment variable is unset", () => {
    expect(parseModelPricingOverrides()).toEqual({});
  });
  it("accepts explicit finite nonnegative rates for qualified provider IDs", () => {
    expect(
      parseModelPricingOverrides(
        '{"openai:custom":{"inputTokensPerMillionUsd":0.4,"outputTokensPerMillionUsd":2},"bedrock:custom:0":{"inputTokensPerMillionUsd":0,"outputTokensPerMillionUsd":0}}'
      )
    ).toEqual({
      "openai:custom": {
        inputTokensPerMillionUsd: 0.4,
        outputTokensPerMillionUsd: 2,
      },
      "bedrock:custom:0": {
        inputTokensPerMillionUsd: 0,
        outputTokensPerMillionUsd: 0,
      },
    });
  });
  it.each([
    "",
    "   ",
    "broken",
    "null",
    "[]",
    "1",
    '"text"',
  ])("rejects invalid pricing configuration: %s", (raw) => {
    expect(() => parseModelPricingOverrides(raw)).toThrow("AI_MODEL_PRICING");
  });
  it.each([
    "openai/gpt-4o",
    "unknown:model",
    "bedrock:",
    " openai:custom",
    "openai:model with spaces",
  ])("rejects noncanonical model keys: %s", (key) => {
    expect(() =>
      parseModelPricingOverrides(
        JSON.stringify({
          [key]: { inputTokensPerMillionUsd: 1, outputTokensPerMillionUsd: 2 },
        })
      )
    ).toThrow("AI_MODEL_PRICING");
  });
  it.each([
    null,
    [],
    4,
    { inputTokensPerMillionUsd: 1 },
    { inputTokensPerMillionUsd: "1", outputTokensPerMillionUsd: 2 },
    { inputTokensPerMillionUsd: -1, outputTokensPerMillionUsd: 2 },
    { inputTokensPerMillionUsd: 1, outputTokensPerMillionUsd: -2 },
    { inputTokensPerMillionUsd: 1, outputTokensPerMillionUsd: 2, typo: 3 },
  ])("rejects invalid rate entries: %j", (entry) => {
    expect(() =>
      parseModelPricingOverrides(JSON.stringify({ "openai:custom": entry }))
    ).toThrow("AI_MODEL_PRICING");
  });
  it("rejects numeric overflow in JSON", () => {
    expect(() =>
      parseModelPricingOverrides(
        '{"openai:custom":{"inputTokensPerMillionUsd":1e999,"outputTokensPerMillionUsd":2}}'
      )
    ).toThrow("AI_MODEL_PRICING");
  });
});

describe("explicit price overrides", () => {
  const overrides = {
    "openai:gpt-4o": {
      inputTokensPerMillionUsd: 0.4,
      outputTokensPerMillionUsd: 2,
    },
    "gateway:openai/gpt-4o": {
      inputTokensPerMillionUsd: 1,
      outputTokensPerMillionUsd: 3,
    },
  };
  it("keeps direct pricing separate from Gateway pricing for the same model", () => {
    expect(getModelPricing("openai:gpt-4o", overrides)).toEqual({
      inputTokensPerMillionUsd: 0.4,
      outputTokensPerMillionUsd: 2,
    });
    expect(getModelPricing("openai/gpt-4o", overrides)).toEqual({
      inputTokensPerMillionUsd: 1,
      outputTokensPerMillionUsd: 3,
    });
    expect(getModelPricing("gateway:openai/gpt-4o", overrides)).toEqual({
      inputTokensPerMillionUsd: 1,
      outputTokensPerMillionUsd: 3,
    });
  });
  it("keeps an unconfigured model unknown", () => {
    expect(getModelPricing("google:custom", overrides)).toBeUndefined();
  });
  it("falls back to existing rates when no exact override exists", () => {
    expect(
      getModelPricing("bedrock:jp.anthropic.claude-sonnet-4-6", overrides)
    ).toEqual({
      inputTokensPerMillionUsd: 3.3,
      outputTokensPerMillionUsd: 16.5,
    });
  });
});
