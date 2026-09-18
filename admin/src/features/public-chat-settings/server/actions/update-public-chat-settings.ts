"use server";

import "server-only";

import { parseAiConfig, resolveModelId } from "@mirai-gikai/shared/ai/config";
import {
  publicChatSettingsSchema,
  validatePublicChatModel,
} from "@mirai-gikai/shared/ai/public-chat-settings";
import { savePublicChatSettings } from "@mirai-gikai/shared/ai/public-chat-settings-repository";
import {
  getModelPricing,
  parseModelPricingOverrides,
} from "@mirai-gikai/shared/ai/pricing";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { routes } from "@/lib/routes";

export async function updatePublicChatSettings(
  input: unknown
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAdmin();
  const parsed = publicChatSettingsSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "設定を確認してください",
    };
  try {
    const modelId = resolveModelId(
      parseAiConfig(process.env),
      "chat",
      parsed.data.chat_model
    );
    validatePublicChatModel(parsed.data, modelId);
    if (
      !getModelPricing(
        modelId,
        parseModelPricingOverrides(process.env.AI_MODEL_PRICING)
      )
    ) {
      throw new Error(
        "このモデルの料金が未設定です。AI_MODEL_PRICINGを設定してください。"
      );
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "AIモデルの設定を確認してください",
    };
  }
  try {
    await savePublicChatSettings(parsed.data);
    revalidatePath(routes.publicChatSettings());
    return { success: true };
  } catch (error) {
    console.error("Failed to save public chat settings", error);
    return {
      success: false,
      error: "設定を保存できませんでした。時間をおいて再度お試しください。",
    };
  }
}
