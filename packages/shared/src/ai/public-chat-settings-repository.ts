import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import {
  publicChatSettingsSchema,
  type PublicChatSettings,
} from "./utils/public-chat-settings";

export async function getPublicChatSettings(): Promise<PublicChatSettings> {
  const { data, error } = await createAdminClient()
    .from("public_chat_settings")
    .select("chat_model, web_search_enabled, allowed_domains")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return publicChatSettingsSchema.parse(data ?? {});
}

/** 呼び出し側のServer Actionで管理者認可を行う。 */
export async function savePublicChatSettings(
  settings: PublicChatSettings
): Promise<void> {
  const { error } = await createAdminClient()
    .from("public_chat_settings")
    .upsert({ id: true, ...settings });
  if (error) throw error;
}
