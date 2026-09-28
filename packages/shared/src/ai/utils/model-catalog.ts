import { parseModelId, type AiProvider } from "../config";
import { AI_MODELS, type AiModel, isKnownModel } from "../models";

const MODEL_LABELS = {
  [AI_MODELS.bedrock_sonnet_4_6]: "Claude Sonnet 4.6",
  [AI_MODELS.bedrock_haiku_4_5]: "Claude Haiku 4.5",
  [AI_MODELS.bedrock_opus_4_8]: "Claude Opus 4.8",
  [AI_MODELS.bedrock_gpt_oss_120b]: "GPT OSS 120B",
  [AI_MODELS.gpt4o]: "GPT-4o",
  [AI_MODELS.gpt4o_mini]: "GPT-4o mini",
  [AI_MODELS.gpt4_1]: "GPT-4.1",
  [AI_MODELS.gpt4_1_mini]: "GPT-4.1 mini",
  [AI_MODELS.gpt4_1_nano]: "GPT-4.1 nano",
  [AI_MODELS.o3_mini]: "o3 mini",
  [AI_MODELS.o4_mini]: "o4 mini",
  [AI_MODELS.gpt5]: "GPT-5",
  [AI_MODELS.gpt5_mini]: "GPT-5 mini",
  [AI_MODELS.gpt5_nano]: "GPT-5 nano",
  [AI_MODELS.gpt5_1_thinking]: "GPT-5.1 Thinking",
  [AI_MODELS.gpt5_2]: "GPT-5.2",
  [AI_MODELS.gpt5_6_sol]: "GPT-5.6 Sol",
  [AI_MODELS.gpt5_6_terra]: "GPT-5.6 Terra",
  [AI_MODELS.gpt5_6_luna]: "GPT-5.6 Luna",
  [AI_MODELS.gemini3_flash]: "Gemini 3 Flash",
  [AI_MODELS.gemini3_1_flash_lite]: "Gemini 3.1 Flash Lite",
  [AI_MODELS.gemini3_1_pro_preview]: "Gemini 3.1 Pro Preview",
  [AI_MODELS.gemma4_26b_a4b]: "Gemma 4 26B A4B (MoE)",
  [AI_MODELS.claude_haiku_4_5]: "Claude Haiku 4.5",
  [AI_MODELS.claude_sonnet_4_6]: "Claude Sonnet 4.6",
  [AI_MODELS.claude_sonnet_5]: "Claude Sonnet 5",
  [AI_MODELS.claude_opus_4_6]: "Claude Opus 4.6",
} satisfies Record<AiModel, string>;

export function getModelLabel(model: string): string {
  const parsed = parseModelId(model);
  let key: string = parsed.qualifiedId;
  if (parsed.provider === "gateway") key = parsed.modelId;
  if (parsed.provider === "openai" || parsed.provider === "google") {
    key = `${parsed.provider}/${parsed.modelId}`;
  }
  return isKnownModel(key) ? MODEL_LABELS[key] : "カスタムモデル";
}

export function getAllowedModelOptions(
  allowedProviders: readonly AiProvider[]
) {
  return Object.values(AI_MODELS).flatMap((value) => {
    const parsed = parseModelId(value);
    const options: { value: string; label: string; provider: AiProvider }[] =
      [];
    if (allowedProviders.includes(parsed.provider)) {
      options.push({
        value,
        label: getModelLabel(value),
        provider: parsed.provider,
      });
    }
    if (parsed.provider === "gateway") {
      for (const provider of ["openai", "google"] as const) {
        if (
          allowedProviders.includes(provider) &&
          parsed.modelId.startsWith(`${provider}/`)
        ) {
          options.push({
            value: `${provider}:${parsed.modelId.slice(provider.length + 1)}`,
            label: getModelLabel(value),
            provider,
          });
        }
      }
    }
    return options;
  });
}
