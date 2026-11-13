"use client";

import {
  type PublicChatSettings,
  supportsPublicChatWebSearch,
} from "@mirai-gikai/shared/ai/public-chat-settings";
import { useState, useTransition } from "react";
import { AiModelSelect } from "@/components/ai-model-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ChatModelGroup } from "@/features/interview-config/shared/utils/chat-model-options";
import { updatePublicChatSettings } from "../../server/actions/update-public-chat-settings";

export function PublicChatSettingsForm({
  initialSettings,
  defaultModel,
  groups,
}: {
  initialSettings: PublicChatSettings;
  defaultModel: string | null;
  groups: ChatModelGroup[];
}) {
  const [model, setModel] = useState(initialSettings.chat_model);
  const [searchEnabled, setSearchEnabled] = useState(
    initialSettings.web_search_enabled
  );
  const [domains, setDomains] = useState(
    initialSettings.allowed_domains.join("\n")
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const searchSupported = supportsPublicChatWebSearch(
    model ?? defaultModel ?? ""
  );

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        setSaved(false);
        startTransition(async () => {
          try {
            const result = await updatePublicChatSettings({
              chat_model: model,
              web_search_enabled: searchEnabled,
              allowed_domains: domains
                .split("\n")
                .map((domain) => domain.trim())
                .filter(Boolean),
            });
            if (!result.success) setError(result.error);
            else setSaved(true);
          } catch {
            setError(
              "設定を保存できませんでした。ログイン状態を確認して再度お試しください。"
            );
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="public-chat-model">AIモデル</Label>
        <AiModelSelect
          id="public-chat-model"
          value={model}
          groups={groups}
          defaultModelAvailable={defaultModel !== null}
          disabled={pending}
          onValueChange={(next) => {
            setModel(next);
            setSaved(false);
            if (!supportsPublicChatWebSearch(next ?? defaultModel ?? ""))
              setSearchEnabled(false);
          }}
        />
        <p className="text-sm text-muted-foreground break-all">
          {defaultModel
            ? `環境の既定モデル: ${defaultModel}`
            : "環境の既定モデルが利用できません。AIモデルを選択してください。"}
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="public-chat-search">Web検索</Label>
          <Switch
            id="public-chat-search"
            checked={searchEnabled}
            disabled={pending || (!searchSupported && !searchEnabled)}
            onCheckedChange={(checked) => {
              setSearchEnabled(checked);
              setSaved(false);
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          初期値はOFFです。ONにすると、必要に応じて許可ドメイン内を検索します。検索には追加料金が発生します。
        </p>
        {!searchSupported && (
          <p className="text-sm text-muted-foreground">
            選択中のモデルはこのWeb検索機能に対応していません。
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="public-chat-domains">許可ドメイン</Label>
        <Textarea
          id="public-chat-domains"
          value={domains}
          disabled={pending}
          placeholder="city.saga.lg.jp"
          rows={5}
          onChange={(event) => {
            setDomains(event.target.value);
            setSaved(false);
          }}
          aria-describedby="public-chat-domains-description"
        />
        <p
          id="public-chat-domains-description"
          className="text-sm text-muted-foreground"
        >
          1行に1件、最大100件。https://
          やパスを含めずに入力してください。サブドメインも検索対象に含まれます。検索ONの場合は1件以上必要です。
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm">
          設定を保存しました。次のチャット送信から適用されます。
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}
