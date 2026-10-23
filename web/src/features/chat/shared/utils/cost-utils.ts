import { parseModelId } from "@mirai-gikai/shared/ai/config";
import {
  getModelPricing,
  type ModelPricingOverrides,
} from "@mirai-gikai/shared/ai/pricing";
import {
  calculateUsageCostUsd,
  roundCost,
  type SanitizedUsage,
} from "@/lib/ai/calculate-ai-cost";

/**
 * cost_usdカラムの値を安全にパースする
 */
export function parseCost(row: { cost_usd: number | null }): number {
  const value = Number(row.cost_usd);
  return Number.isFinite(value) ? value : 0;
}

/**
 * プロバイダーの実費を優先し、未指定なら確認済み単価で計算する。未知単価を0円にしない。
 */
export function resolveCostUsd(
  model: string,
  usage: SanitizedUsage,
  costOverride?: number | null,
  pricingOverrides?: ModelPricingOverrides,
  webSearchCalls = 0
): number {
  if (typeof costOverride === "number" && Number.isFinite(costOverride)) {
    return roundCost(costOverride);
  }

  let cost =
    usage.inputTokens > 0 || usage.outputTokens > 0
      ? calculateUsageCostUsd(model, usage, pricingOverrides)
      : 0;
  if (webSearchCalls > 0) {
    // 概算: web_search $10/1k calls、4o-miniの検索入力は1回8,000 tokens。
    // https://developers.openai.com/api/docs/pricing (2026-09-18確認)
    cost += webSearchCalls * 0.01;
    const parsed = parseModelId(model);
    if (
      (parsed.provider === "openai" && parsed.modelId === "gpt-4o-mini") ||
      (parsed.provider === "gateway" && parsed.modelId === "openai/gpt-4o-mini")
    ) {
      const pricing = getModelPricing(model, pricingOverrides);
      if (!pricing) throw new Error(`Unknown pricing for model "${model}"`);
      cost +=
        (webSearchCalls * 8_000 * pricing.inputTokensPerMillionUsd) / 1_000_000;
    }
  }
  return roundCost(cost);
}
