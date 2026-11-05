import "server-only";
import { parseModelPricingOverrides } from "@mirai-gikai/shared/ai/pricing";
import {
  getAiModel,
  type AiModelPurpose,
} from "@mirai-gikai/shared/ai/registry";
import type { LanguageModel } from "ai";
import { requireModelPricing } from "./require-model-pricing";

/** 使用量を記録する対話では、未知単価によるコスト上限の迂回を防ぐ。 */
export function getMeteredAiModel(
  purpose: AiModelPurpose,
  override?: LanguageModel | null
) {
  const selection = getAiModel(purpose, override);
  // DIされたSDKモデルは呼出側が管理する（外部認証・環境設定を要求しない）。
  if (override == null || typeof override === "string") {
    requireModelPricing(
      selection.modelId,
      parseModelPricingOverrides(process.env.AI_MODEL_PRICING)
    );
  }
  return selection;
}
