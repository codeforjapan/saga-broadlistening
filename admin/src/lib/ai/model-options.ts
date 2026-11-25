import "server-only";

import { parseAiConfig } from "@mirai-gikai/shared/ai/config";
import { parseModelPricingOverrides } from "@mirai-gikai/shared/ai/pricing";
import { getAllowedChatModelGroups } from "@/features/interview-config/shared/utils/chat-model-options";

export function getConfiguredModelGroups() {
  return getAllowedChatModelGroups(
    parseAiConfig(process.env).allowedProviders,
    parseModelPricingOverrides(process.env.AI_MODEL_PRICING)
  );
}
