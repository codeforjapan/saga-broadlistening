import { createProviderRegistry, type JSONValue, type LanguageModel } from "ai";
import {
  type AiConfig,
  type AiEnvironment,
  type AiModelPurpose,
  type AiProvider,
  parseAiConfig,
  parseModelId,
  resolveModelId,
} from "./config";

export interface ResolvedAiModel {
  model: Exclude<LanguageModel, string>;
  modelId: string;
  providerOptions?: Record<string, Record<string, JSONValue>>;
}
export type AiProviderInstance = Parameters<
  typeof createProviderRegistry
>[0][string];
export interface AiModelResolverDependencies {
  readEnv: () => AiEnvironment;
  createProvider: (
    provider: AiProvider,
    config: AiConfig,
    env: AiEnvironment
  ) => AiProviderInstance;
}

const API_KEYS = {
  gateway: "AI_GATEWAY_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
} as const;

/** Dependencies keep env access and authentication outside injected model tests. */
export function createAiModelResolver({
  readEnv,
  createProvider,
}: AiModelResolverDependencies) {
  return (
    purpose: AiModelPurpose,
    override?: LanguageModel | null
  ): ResolvedAiModel => {
    if (override != null && typeof override !== "string") {
      return {
        model: override,
        modelId: `${override.provider}:${override.modelId}`,
      };
    }
    const env = readEnv();
    const config = parseAiConfig(env);
    const modelId = resolveModelId(config, purpose, override);
    const { provider } = parseModelId(modelId);
    if (provider !== "bedrock" && !env[API_KEYS[provider]]?.trim()) {
      throw new Error(
        `${API_KEYS[provider]} is required for AI provider "${provider}"`
      );
    }
    const registry = createProviderRegistry({
      [provider]: createProvider(provider, config, env),
    });
    return {
      model: registry.languageModel(modelId),
      modelId,
      ...(provider === "bedrock" && config.guardrail
        ? {
            providerOptions: { bedrock: { guardrailConfig: config.guardrail } },
          }
        : {}),
    };
  };
}
