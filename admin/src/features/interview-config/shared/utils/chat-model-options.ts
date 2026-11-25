import { type AiProvider, parseModelId } from "@mirai-gikai/shared/ai/config";
import { getAllowedModelOptions } from "@mirai-gikai/shared/ai/model-catalog";
import type { ModelPricingOverrides } from "@mirai-gikai/shared/ai/pricing";
import { isValidModelId } from "@mirai-gikai/shared/ai/validate-model-id";
import {
  estimateInterviewCostUsd,
  formatEstimatedCost,
} from "./estimate-interview-cost";

export type ChatModelGroup = {
  provider: string;
  options: { value: string; label: string; estimatedCost: string | null }[];
};

const PROVIDER_LABELS = {
  bedrock: "Amazon Bedrock",
  gateway: "Vercel AI Gateway",
  openai: "OpenAI（直接接続）",
  google: "Google（直接接続）",
} satisfies Record<AiProvider, string>;

export function isValidChatModel(
  model: string,
  allowedProviders?: readonly AiProvider[]
): boolean {
  return (
    isValidModelId(model) &&
    (!allowedProviders ||
      allowedProviders.includes(parseModelId(model).provider))
  );
}

export function getAllowedChatModelGroups(
  allowedProviders: readonly AiProvider[],
  pricingOverrides?: ModelPricingOverrides
): ChatModelGroup[] {
  const options = getAllowedModelOptions(allowedProviders);
  return [...new Set(allowedProviders)]
    .map((provider) => ({
      provider: PROVIDER_LABELS[provider],
      options: options
        .filter((option) => option.provider === provider)
        .map(({ value, label }) => {
          const cost = estimateInterviewCostUsd(value, pricingOverrides);
          return {
            value,
            label,
            estimatedCost: cost === null ? null : formatEstimatedCost(cost),
          };
        }),
    }))
    .filter((group) => group.options.length > 0);
}
