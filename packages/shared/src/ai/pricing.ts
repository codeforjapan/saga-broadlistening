import { parseModelId } from "./config";
import { AI_MODELS } from "./models";

export type ModelPricing = {
  inputTokensPerMillionUsd: number;
  outputTokensPerMillionUsd: number;
};

/**
 * 標準オンデマンド推論の概算単価（キャッシュ・Batch・優先枠の割引/割増を除く）。
 * 既存のGateway料金に、東京/Japan経路で確認したBedrockの基準料金を追加する。
 * 未確認の接続先やモデルには他の料金を代用しない。
 */
export const modelPricing: Record<string, ModelPricing> = {
  // --- Amazon Bedrock: ap-northeast-1 / Japan, verified 2026-09-18 ---
  // AWS Price List (2026-09-11): Sonnet regional CRIS, Haiku regional.
  // https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrockFoundationModels/current/ap-northeast-1/index.json
  // Sonnet input/output SKUs: VFYW9EGDPE5FR2S3 / DRJPH2YRDBQTJV8Q
  [AI_MODELS.bedrock_sonnet_4_6]: {
    inputTokensPerMillionUsd: 3.3,
    outputTokensPerMillionUsd: 16.5,
  },
  // Haiku input/output SKUs: CUDWXBGUTQHMHKJX / TEKBTVMTEVXXBRTZ
  [AI_MODELS.bedrock_haiku_4_5]: {
    inputTokensPerMillionUsd: 1.1,
    outputTokensPerMillionUsd: 5.5,
  },
  // https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/ap-northeast-1/index.json
  // Standard on-demand input/output SKUs: DFN5T4HYJPM5CGU9 / FCYZ5PQ2VKGXJ3DH
  [AI_MODELS.bedrock_gpt_oss_120b]: {
    inputTokensPerMillionUsd: 0.18,
    outputTokensPerMillionUsd: 0.73,
  },
  // --- OpenAI ---
  [AI_MODELS.gpt4o]: {
    inputTokensPerMillionUsd: 2.5,
    outputTokensPerMillionUsd: 10,
  },
  [AI_MODELS.gpt4o_mini]: {
    inputTokensPerMillionUsd: 0.15,
    outputTokensPerMillionUsd: 0.6,
  },
  [AI_MODELS.gpt4_1]: {
    inputTokensPerMillionUsd: 2,
    outputTokensPerMillionUsd: 8,
  },
  [AI_MODELS.gpt4_1_mini]: {
    inputTokensPerMillionUsd: 0.4,
    outputTokensPerMillionUsd: 1.6,
  },
  [AI_MODELS.gpt4_1_nano]: {
    inputTokensPerMillionUsd: 0.1,
    outputTokensPerMillionUsd: 0.4,
  },
  [AI_MODELS.o3_mini]: {
    inputTokensPerMillionUsd: 1.1,
    outputTokensPerMillionUsd: 4.4,
  },
  [AI_MODELS.o4_mini]: {
    inputTokensPerMillionUsd: 1.1,
    outputTokensPerMillionUsd: 4.4,
  },
  [AI_MODELS.gpt5]: {
    inputTokensPerMillionUsd: 1.25,
    outputTokensPerMillionUsd: 10,
  },
  [AI_MODELS.gpt5_mini]: {
    inputTokensPerMillionUsd: 0.25,
    outputTokensPerMillionUsd: 2,
  },
  [AI_MODELS.gpt5_nano]: {
    inputTokensPerMillionUsd: 0.05,
    outputTokensPerMillionUsd: 0.4,
  },
  [AI_MODELS.gpt5_1_thinking]: {
    inputTokensPerMillionUsd: 1.25,
    outputTokensPerMillionUsd: 10,
  },
  [AI_MODELS.gpt5_2]: {
    inputTokensPerMillionUsd: 1.75,
    outputTokensPerMillionUsd: 14,
  },
  [AI_MODELS.gpt5_6_sol]: {
    inputTokensPerMillionUsd: 5,
    outputTokensPerMillionUsd: 30,
  },
  [AI_MODELS.gpt5_6_terra]: {
    inputTokensPerMillionUsd: 2.5,
    outputTokensPerMillionUsd: 15,
  },
  [AI_MODELS.gpt5_6_luna]: {
    inputTokensPerMillionUsd: 1,
    outputTokensPerMillionUsd: 6,
  },
  // --- Google ---
  [AI_MODELS.gemini3_flash]: {
    inputTokensPerMillionUsd: 0.5,
    outputTokensPerMillionUsd: 3,
  },
  [AI_MODELS.gemini3_1_flash_lite]: {
    inputTokensPerMillionUsd: 0.25,
    outputTokensPerMillionUsd: 1.5,
  },
  [AI_MODELS.gemini3_1_pro_preview]: {
    inputTokensPerMillionUsd: 2,
    outputTokensPerMillionUsd: 12,
  },
  [AI_MODELS.gemma4_26b_a4b]: {
    inputTokensPerMillionUsd: 0.06,
    outputTokensPerMillionUsd: 0.33,
  },
  // --- Anthropic ---
  [AI_MODELS.claude_haiku_4_5]: {
    inputTokensPerMillionUsd: 1,
    outputTokensPerMillionUsd: 5,
  },
  [AI_MODELS.claude_sonnet_4_6]: {
    inputTokensPerMillionUsd: 3,
    outputTokensPerMillionUsd: 15,
  },
  [AI_MODELS.claude_sonnet_5]: {
    inputTokensPerMillionUsd: 3,
    outputTokensPerMillionUsd: 15,
  },
  [AI_MODELS.claude_opus_4_6]: {
    inputTokensPerMillionUsd: 5,
    outputTokensPerMillionUsd: 25,
  },
};

export type ModelPricingOverrides = Readonly<Record<string, ModelPricing>>;

/** AI_MODEL_PRICING の料金設定を検証する。キーは接続先を含む正規形のみ。 */
export function parseModelPricingOverrides(
  raw?: string
): ModelPricingOverrides {
  if (raw === undefined) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI_MODEL_PRICING must be a JSON object");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI_MODEL_PRICING must be a JSON object");
  }
  const overrides: Record<string, ModelPricing> = {};
  for (const [key, value] of Object.entries(parsed)) {
    let qualifiedId: string;
    try {
      qualifiedId = parseModelId(key).qualifiedId;
    } catch {
      throw new Error("AI_MODEL_PRICING keys must use provider:modelId");
    }
    if (key !== qualifiedId) {
      throw new Error(
        "AI_MODEL_PRICING keys must use canonical provider:modelId"
      );
    }
    const rate: unknown = value;
    if (
      !rate ||
      typeof rate !== "object" ||
      Array.isArray(rate) ||
      Object.keys(rate).length !== 2 ||
      !("inputTokensPerMillionUsd" in rate) ||
      !("outputTokensPerMillionUsd" in rate) ||
      typeof rate.inputTokensPerMillionUsd !== "number" ||
      typeof rate.outputTokensPerMillionUsd !== "number" ||
      !Number.isFinite(rate.inputTokensPerMillionUsd) ||
      !Number.isFinite(rate.outputTokensPerMillionUsd) ||
      rate.inputTokensPerMillionUsd < 0 ||
      rate.outputTokensPerMillionUsd < 0
    ) {
      throw new Error(
        "AI_MODEL_PRICING rates require finite nonnegative inputTokensPerMillionUsd and outputTokensPerMillionUsd"
      );
    }
    overrides[key] = {
      inputTokensPerMillionUsd: rate.inputTokensPerMillionUsd,
      outputTokensPerMillionUsd: rate.outputTokensPerMillionUsd,
    };
  }
  return overrides;
}

/** 接続先を維持して料金を解決する。未登録の接続先・モデルは undefined。 */
export function getModelPricing(
  model: string,
  overrides?: ModelPricingOverrides
): ModelPricing | undefined {
  try {
    const parsed = parseModelId(model);
    if (overrides && Object.hasOwn(overrides, parsed.qualifiedId)) {
      return overrides[parsed.qualifiedId];
    }
    const key =
      parsed.provider === "gateway" ? parsed.modelId : parsed.qualifiedId;
    return Object.hasOwn(modelPricing, key) ? modelPricing[key] : undefined;
  } catch {
    return undefined;
  }
}
