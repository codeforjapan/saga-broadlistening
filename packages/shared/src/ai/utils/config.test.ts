import { describe, expect, it } from "vitest";
import {
  AI_MODEL_PURPOSES,
  parseAiConfig,
  parseModelId,
  resolveModelId,
} from "./config";

describe("AI configuration", () => {
  it("defaults to Bedrock with Haiku for interview, analysis and tags", () => {
    const config = parseAiConfig({});
    expect(config.allowedProviders).toEqual(["bedrock"]);
    expect(config.awsRegion).toBe("ap-northeast-1");
    for (const purpose of AI_MODEL_PURPOSES) {
      expect(resolveModelId(config, purpose)).toBe(
        ["interview", "topicAnalysis", "opinionTags"].includes(purpose)
          ? "bedrock:jp.anthropic.claude-haiku-4-5-20251001-v1:0"
          : "bedrock:jp.anthropic.claude-sonnet-4-6"
      );
    }
  });
  it("applies override > purpose > default, including Haiku purposes", () => {
    const config = parseAiConfig({
      AI_ALLOWED_PROVIDERS: "bedrock,openai,google",
      AI_DEFAULT_MODEL: "openai:gpt-4o",
      AI_INTERVIEW_MODEL: "google:gemini-2.5-flash",
    });
    for (const purpose of AI_MODEL_PURPOSES.filter((p) => p !== "interview")) {
      expect(resolveModelId(config, purpose)).toBe("openai:gpt-4o");
    }
    expect(resolveModelId(config, "interview")).toBe("google:gemini-2.5-flash");
    expect(resolveModelId(config, "interview", "bedrock:custom:0")).toBe(
      "bedrock:custom:0"
    );
    expect(resolveModelId(config, "chat", null)).toBe("openai:gpt-4o");
  });
  it("permits configuration in production and checks the selected provider", () => {
    const config = parseAiConfig({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      AI_ALLOWED_PROVIDERS: "openai",
      AI_DEFAULT_MODEL: "openai:gpt-4o",
    });
    expect(resolveModelId(config, "chat")).toBe("openai:gpt-4o");
    expect(() =>
      resolveModelId(config, "chat", "google:gemini-2.5-flash")
    ).toThrow(/not allowed/);
  });
  it.each([
    "",
    " ",
    "unknown",
    "bedrock,",
    "bedrock,unknown",
  ])("rejects invalid provider allowlist %j", (value) => {
    expect(() => parseAiConfig({ AI_ALLOWED_PROVIDERS: value })).toThrow(
      /AI_ALLOWED_PROVIDERS/
    );
  });
  it.each([
    "AI_DEFAULT_MODEL",
    "AI_CHAT_MODEL",
    "AI_CONTENT_RICHNESS_MODEL",
    "AWS_REGION",
  ])("rejects empty %s", (key) => {
    expect(() => parseAiConfig({ [key]: " " })).toThrow(key);
  });
  it("normalizes legacy strings without changing the model or provider route", () => {
    expect(parseModelId("anthropic/claude-haiku-4.5")).toEqual({
      provider: "gateway",
      modelId: "anthropic/claude-haiku-4.5",
      qualifiedId: "gateway:anthropic/claude-haiku-4.5",
    });
    expect(() =>
      resolveModelId(parseAiConfig({}), "chat", "anthropic/claude-haiku-4.5")
    ).toThrow(/gateway.*not allowed/);
  });
  it("preserves colons inside Bedrock model IDs and ARNs", () => {
    const id =
      "arn:aws:bedrock:ap-northeast-1:123456789012:inference-profile/example";
    expect(parseModelId(`bedrock:${id}`).modelId).toBe(id);
    expect(
      parseModelId("bedrock:jp.anthropic.claude-haiku-4-5-20251001-v1:0")
        .modelId
    ).toBe("jp.anthropic.claude-haiku-4-5-20251001-v1:0");
  });
  it.each([
    "",
    "openai:",
    "unknown:model",
    "gpt-4o",
    "gateway:gpt-4o",
    "openai/gpt 4o",
    "/gpt-4o",
    "openai/",
  ])("rejects invalid model ID %j", (value) => {
    expect(() => parseModelId(value)).toThrow(/model/i);
  });
  it("validates guardrail setting pairs", () => {
    expect(() =>
      parseAiConfig({ AWS_BEDROCK_GUARDRAIL_ID: "guardrail" })
    ).toThrow(/GUARDRAIL/);
    expect(() => parseAiConfig({ AWS_BEDROCK_GUARDRAIL_VERSION: "1" })).toThrow(
      /GUARDRAIL/
    );
    expect(
      parseAiConfig({
        AWS_BEDROCK_GUARDRAIL_ID: "guardrail",
        AWS_BEDROCK_GUARDRAIL_VERSION: "1",
      }).guardrail
    ).toEqual({ guardrailIdentifier: "guardrail", guardrailVersion: "1" });
  });
  it.each([
    ["chat", "AI_CHAT_MODEL"],
    ["interview", "AI_INTERVIEW_MODEL"],
    ["summary", "AI_SUMMARY_MODEL"],
    ["moderation", "AI_MODERATION_MODEL"],
    ["contentRichness", "AI_CONTENT_RICHNESS_MODEL"],
    ["configGeneration", "AI_CONFIG_GENERATION_MODEL"],
    ["simulation", "AI_SIMULATION_MODEL"],
    ["topicAnalysis", "AI_TOPIC_ANALYSIS_MODEL"],
    ["topicWriting", "AI_TOPIC_WRITING_MODEL"],
    ["opinionBackfill", "AI_OPINION_BACKFILL_MODEL"],
    ["opinionTags", "AI_OPINION_TAGS_MODEL"],
  ] as const)("reads the %s purpose environment setting", (purpose, key) => {
    const config = parseAiConfig({ [key]: "bedrock:custom-model" });
    expect(resolveModelId(config, purpose)).toBe("bedrock:custom-model");
  });
  it("rejects an empty explicit override instead of falling back", () => {
    expect(() => resolveModelId(parseAiConfig({}), "chat", "")).toThrow(
      /model/i
    );
  });
});
