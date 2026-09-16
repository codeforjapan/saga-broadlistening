import type { ModelPricingOverrides } from "@mirai-gikai/shared/ai/pricing";
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
  pricingOverrides?: ModelPricingOverrides
): number {
  if (typeof costOverride === "number" && Number.isFinite(costOverride)) {
    return roundCost(costOverride);
  }

  if (usage.inputTokens > 0 || usage.outputTokens > 0) {
    return calculateUsageCostUsd(model, usage, pricingOverrides);
  }

  return 0;
}
