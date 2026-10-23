import {
  getModelPricing,
  type ModelPricingOverrides,
} from "@mirai-gikai/shared/ai/pricing";
import type { LanguageModelUsage } from "ai";

export {
  type ModelPricing,
  modelPricing,
} from "@mirai-gikai/shared/ai/pricing";

export type SanitizedUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

const COST_DECIMALS = 6;

export function sanitizeUsage(usage: LanguageModelUsage): SanitizedUsage {
  const inputTokens = ensureInteger(usage.inputTokens);
  const outputTokens = ensureInteger(usage.outputTokens);
  let totalTokens = ensureInteger(usage.totalTokens);

  if (inputTokens > 0 || outputTokens > 0) {
    if (totalTokens <= 0) {
      totalTokens = ensureInteger(inputTokens + outputTokens);
    }
    return { inputTokens, outputTokens, totalTokens };
  }

  if (totalTokens > 0) {
    const half = Math.floor(totalTokens / 2);
    return {
      inputTokens: half,
      outputTokens: totalTokens - half,
      totalTokens,
    };
  }

  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

export function calculateUsageCostUsd(
  model: string,
  usage: SanitizedUsage,
  overrides?: ModelPricingOverrides
): number {
  const pricing = getModelPricing(model, overrides);
  if (!pricing) {
    throw new Error(`Unknown pricing for model "${model}"`);
  }

  const inputCost =
    (pricing.inputTokensPerMillionUsd * usage.inputTokens) / 1_000_000;
  const outputCost =
    (pricing.outputTokensPerMillionUsd * usage.outputTokens) / 1_000_000;

  return roundCost(inputCost + outputCost);
}

export function roundCost(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const scale = 10 ** COST_DECIMALS;
  return Math.round(value * scale) / scale;
}

function ensureInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}
