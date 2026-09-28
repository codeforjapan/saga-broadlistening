import "server-only";

import { parseAiConfig } from "@mirai-gikai/shared/ai/config";
import { resolveDefaultPublicChatModel } from "@mirai-gikai/shared/ai/public-chat-settings";
import { getPublicChatSettings } from "@mirai-gikai/shared/ai/public-chat-settings-repository";
import Link from "next/link";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getConfiguredModelGroups } from "@/lib/ai/model-options";
import { routes } from "@/lib/routes";
import { PublicChatSettingsForm } from "../../client/components/public-chat-settings-form";

export async function PublicChatSettingsPage() {
  await requireAdmin();
  const settings = await getPublicChatSettings();
  const config = parseAiConfig(process.env);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">公開チャット設定</h1>
        <p className="text-sm text-muted-foreground">
          トップページと施策詳細ページのチャットに共通で適用されます。AIインタビューの設定は意見募集ごとに変更できます。
        </p>
      </div>
      <Link
        href={routes.publicChatPrompts()}
        className="inline-block text-sm text-primary underline underline-offset-4"
      >
        公開チャットのプロンプトを編集する
      </Link>
      <PublicChatSettingsForm
        initialSettings={settings}
        defaultModel={resolveDefaultPublicChatModel(config)}
        groups={getConfiguredModelGroups()}
      />
    </div>
  );
}
