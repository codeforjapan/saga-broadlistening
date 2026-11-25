import {
  getModelPricing,
  type ModelPricingOverrides,
} from "@mirai-gikai/shared/ai/pricing";

/** 料金制限の対象モデルは、推論前に単価が分かることを必須とする。 */
export function requireModelPricing(
  modelId: string,
  overrides: ModelPricingOverrides
): void {
  if (!getModelPricing(modelId, overrides)) {
    throw new Error(
      `Pricing for "${modelId}" is unknown; configure AI_MODEL_PRICING before using this model for chat`
    );
  }
}
