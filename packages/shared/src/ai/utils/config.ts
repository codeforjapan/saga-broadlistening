export const AI_PROVIDERS = ["bedrock", "gateway", "openai", "google"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

const PURPOSE_ENV = {
  default: "AI_DEFAULT_MODEL",
  chat: "AI_CHAT_MODEL",
  interview: "AI_INTERVIEW_MODEL",
  summary: "AI_SUMMARY_MODEL",
  moderation: "AI_MODERATION_MODEL",
  contentRichness: "AI_CONTENT_RICHNESS_MODEL",
  configGeneration: "AI_CONFIG_GENERATION_MODEL",
  simulation: "AI_SIMULATION_MODEL",
  topicAnalysis: "AI_TOPIC_ANALYSIS_MODEL",
  topicWriting: "AI_TOPIC_WRITING_MODEL",
  opinionBackfill: "AI_OPINION_BACKFILL_MODEL",
  opinionTags: "AI_OPINION_TAGS_MODEL",
} as const;
export type AiModelPurpose = keyof typeof PURPOSE_ENV;
export const AI_MODEL_PURPOSES = Object.keys(PURPOSE_ENV) as AiModelPurpose[];
export type AiEnvironment = Record<string, string | undefined>;
export interface AiConfig {
  allowedProviders: AiProvider[];
  models: Partial<Record<AiModelPurpose, string>>;
  awsRegion: string;
  guardrail?: { guardrailIdentifier: string; guardrailVersion: string };
}

function isProvider(value: string): value is AiProvider {
  return AI_PROVIDERS.some((provider) => provider === value);
}

/** Normalize only routing syntax. Never substitute a different model. */
export function parseModelId(value: string): {
  provider: AiProvider;
  modelId: string;
  qualifiedId: `${AiProvider}:${string}`;
} {
  const input = value.trim();
  const separator = input.indexOf(":");
  const provider = separator < 0 ? "gateway" : input.slice(0, separator);
  const modelId = separator < 0 ? input : input.slice(separator + 1);
  if (
    !isProvider(provider) ||
    !modelId ||
    /\s/.test(modelId) ||
    (provider === "gateway" && !/^[^/:]+\/[^\s]+$/.test(modelId))
  ) {
    throw new Error(
      "Invalid AI model ID; use provider:modelId (legacy provider/model routes to gateway)"
    );
  }
  return { provider, modelId, qualifiedId: `${provider}:${modelId}` };
}

function optionalSetting(env: AiEnvironment, key: string): string | undefined {
  const value = env[key];
  if (value === undefined) return undefined;
  if (!value.trim()) throw new Error(`${key} must not be empty`);
  return value.trim();
}

export function parseAiConfig(env: AiEnvironment): AiConfig {
  const providers = (optionalSetting(env, "AI_ALLOWED_PROVIDERS") ?? "bedrock")
    .split(",")
    .map((value) => value.trim());
  const allowedProviders: AiProvider[] = [];
  for (const provider of providers) {
    if (!isProvider(provider))
      throw new Error(
        "AI_ALLOWED_PROVIDERS contains an unknown or empty provider"
      );
    if (!allowedProviders.includes(provider)) allowedProviders.push(provider);
  }
  const models: AiConfig["models"] = {};
  for (const purpose of AI_MODEL_PURPOSES) {
    const value = optionalSetting(env, PURPOSE_ENV[purpose]);
    if (value !== undefined) models[purpose] = parseModelId(value).qualifiedId;
  }
  const guardrailIdentifier = optionalSetting(env, "AWS_BEDROCK_GUARDRAIL_ID");
  const guardrailVersion = optionalSetting(
    env,
    "AWS_BEDROCK_GUARDRAIL_VERSION"
  );
  if (
    (guardrailIdentifier === undefined) !==
    (guardrailVersion === undefined)
  ) {
    throw new Error(
      "AWS_BEDROCK_GUARDRAIL_ID and AWS_BEDROCK_GUARDRAIL_VERSION must be configured together"
    );
  }
  return {
    allowedProviders,
    models,
    awsRegion: optionalSetting(env, "AWS_REGION") ?? "ap-northeast-1",
    ...(guardrailIdentifier && guardrailVersion
      ? { guardrail: { guardrailIdentifier, guardrailVersion } }
      : {}),
  };
}

export function resolveModelId(
  config: AiConfig,
  purpose: AiModelPurpose,
  override?: string | null
): `${AiProvider}:${string}` {
  const defaultModel =
    purpose === "interview" ||
    purpose === "topicAnalysis" ||
    purpose === "opinionTags"
      ? "bedrock:jp.anthropic.claude-haiku-4-5-20251001-v1:0"
      : "bedrock:jp.anthropic.claude-sonnet-4-6";
  const selected = parseModelId(
    override ?? config.models[purpose] ?? config.models.default ?? defaultModel
  );
  if (!config.allowedProviders.includes(selected.provider)) {
    throw new Error(
      `AI provider "${selected.provider}" is not allowed by AI_ALLOWED_PROVIDERS`
    );
  }
  return selected.qualifiedId;
}
