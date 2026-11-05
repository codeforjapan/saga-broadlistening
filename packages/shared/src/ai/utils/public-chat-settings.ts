import { z } from "zod";
import { type AiConfig, parseModelId, resolveModelId } from "./config";
import { isValidModelId } from "./is-valid-model-id";

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/,
    "URLではなくドメインを入力してください（例: city.saga.lg.jp）"
  );

export const publicChatSettingsSchema = z
  .object({
    chat_model: z
      .string()
      .trim()
      .refine(isValidModelId, "無効なAIモデルです")
      .nullable()
      .default(null),
    web_search_enabled: z.boolean().default(false),
    allowed_domains: z
      .array(domainSchema)
      .max(100, "許可ドメインは100件までです")
      .default([])
      .transform((domains) => [...new Set(domains)]),
  })
  .refine(
    (settings) =>
      !settings.web_search_enabled || settings.allowed_domains.length > 0,
    {
      message: "Web検索をONにする場合は許可ドメインを1件以上入力してください",
      path: ["allowed_domains"],
    }
  );

export type PublicChatSettings = z.infer<typeof publicChatSettingsSchema>;

// OpenAI Responsesの検索ツールで利用するモデル。未確認モデルには送信しない。
const SEARCH_MODELS = new Set([
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5.2",
]);

export function supportsPublicChatWebSearch(modelId: string): boolean {
  try {
    const parsed = parseModelId(modelId);
    if (parsed.provider === "openai") return SEARCH_MODELS.has(parsed.modelId);
    return (
      parsed.provider === "gateway" &&
      parsed.modelId.startsWith("openai/") &&
      SEARCH_MODELS.has(parsed.modelId.slice("openai/".length))
    );
  } catch {
    return false;
  }
}

export function validatePublicChatModel(
  settings: PublicChatSettings,
  modelId: string
): void {
  if (settings.web_search_enabled && !supportsPublicChatWebSearch(modelId)) {
    throw new Error(
      "選択されたAIモデルは、このWeb検索機能に対応していません。検索をOFFにするか、対応モデルを選択してください。"
    );
  }
}

export function resolveDefaultPublicChatModel(config: AiConfig): string | null {
  try {
    return resolveModelId(config, "chat");
  } catch {
    return null;
  }
}
