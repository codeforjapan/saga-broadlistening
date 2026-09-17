import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { MockLanguageModelV3, MockProviderV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import {
  type AiModelResolverDependencies,
  createAiModelResolver,
} from "./model-resolver";

const fakeModel = new MockLanguageModelV3({
  provider: "fake",
  modelId: "test",
});
function setup(env: Record<string, string | undefined>) {
  const createProvider = vi.fn<AiModelResolverDependencies["createProvider"]>(
    () =>
      new MockProviderV3({
        languageModels: {
          "gpt-4o": fakeModel,
          "gemini-2.5-flash": fakeModel,
          "openai/gpt-4o": fakeModel,
          "jp.anthropic.claude-sonnet-4-6": fakeModel,
        },
      })
  );
  const readEnv = vi.fn(() => env);
  return {
    createProvider,
    readEnv,
    resolve: createAiModelResolver({ readEnv, createProvider }),
  };
}

describe("shared model resolution", () => {
  it("bypasses config and credentials for an injected model", () => {
    const { resolve, readEnv, createProvider } = setup({
      AI_ALLOWED_PROVIDERS: "invalid",
    });
    expect(resolve("chat", fakeModel)).toEqual({
      model: fakeModel,
      modelId: "fake:test",
    });
    expect(readEnv).not.toHaveBeenCalled();
    expect(createProvider).not.toHaveBeenCalled();
  });
  it.each([
    ["openai", "OPENAI_API_KEY", "openai:gpt-4o"],
    ["google", "GOOGLE_GENERATIVE_AI_API_KEY", "google:gemini-2.5-flash"],
    ["gateway", "AI_GATEWAY_API_KEY", "gateway:openai/gpt-4o"],
  ])("requires only the selected %s provider's key", (provider, key, id) => {
    const env = {
      AI_ALLOWED_PROVIDERS: "bedrock,openai,google,gateway",
      AI_DEFAULT_MODEL: id,
    };
    const missing = setup(env);
    expect(() => missing.resolve("chat")).toThrow(key);
    expect(missing.createProvider).not.toHaveBeenCalled();
    const selected = setup({ ...env, [key]: "test-key" });
    expect(selected.resolve("chat")).toEqual({ model: fakeModel, modelId: id });
    expect(selected.createProvider).toHaveBeenCalledOnce();
    expect(selected.createProvider.mock.calls[0]?.[0]).toBe(provider);
  });
  it("rejects disallowed overrides before creating providers", () => {
    const { resolve, createProvider } = setup({});
    expect(() => resolve("chat", "openai:gpt-4o")).toThrow(/not allowed/);
    expect(createProvider).not.toHaveBeenCalled();
  });
  it("preserves colon-bearing Bedrock model IDs through the actual SDK registry", () => {
    const resolve = createAiModelResolver({
      readEnv: () => ({}),
      createProvider: () =>
        new MockProviderV3({ languageModels: { "model:0": fakeModel } }),
    });
    expect(resolve("chat", "bedrock:model:0").modelId).toBe("bedrock:model:0");
    expect(resolve("chat", "bedrock:model:0").model).toBe(fakeModel);
  });
  it("passes guardrails only to Bedrock, and keeps gateway legacy logging explicit", () => {
    const { resolve } = setup({
      AI_ALLOWED_PROVIDERS: "bedrock,gateway",
      AI_GATEWAY_API_KEY: "test-key",
      AWS_BEDROCK_GUARDRAIL_ID: "guardrail",
      AWS_BEDROCK_GUARDRAIL_VERSION: "1",
    });
    expect(resolve("chat").providerOptions).toEqual({
      bedrock: {
        guardrailConfig: {
          guardrailIdentifier: "guardrail",
          guardrailVersion: "1",
        },
      },
    });
    expect(resolve("chat", "openai/gpt-4o")).toEqual({
      model: fakeModel,
      modelId: "gateway:openai/gpt-4o",
    });
  });
  it("sends guardrails in the Bedrock Converse request using SDK 6", async () => {
    const requests: unknown[] = [];
    const credentials = vi.fn(async () => ({
      accessKeyId: "test",
      secretAccessKey: "test",
    }));
    const resolve = createAiModelResolver({
      readEnv: () => ({
        AWS_BEDROCK_GUARDRAIL_ID: "guardrail",
        AWS_BEDROCK_GUARDRAIL_VERSION: "1",
      }),
      createProvider: (_provider, config) =>
        createAmazonBedrock({
          region: config.awsRegion,
          credentialProvider: credentials,
          fetch: async (_url, init) => {
            requests.push(JSON.parse(String(init?.body)));
            return Response.json({
              output: {
                message: { role: "assistant", content: [{ text: "OK" }] },
              },
              stopReason: "end_turn",
              usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            });
          },
        }),
    });
    const selected = resolve("chat");
    expect(credentials).not.toHaveBeenCalled();
    const result = await generateText({
      ...selected,
      prompt: "Hello",
      maxRetries: 0,
    });
    expect(result.text).toBe("OK");
    expect(credentials).toHaveBeenCalledOnce();
    expect(requests).toEqual([
      expect.objectContaining({
        guardrailConfig: {
          guardrailIdentifier: "guardrail",
          guardrailVersion: "1",
        },
      }),
    ]);
  });
});
