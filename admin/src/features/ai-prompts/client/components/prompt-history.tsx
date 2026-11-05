"use client";

import { Button } from "@/components/ui/button";
import type { loadPromptEditor } from "../../server/loaders/load-prompt-editor";

type Prompt = Awaited<ReturnType<typeof loadPromptEditor>>["prompts"][number];

export function PromptHistory({
  prompt,
  pending,
  onSelect,
}: {
  prompt: Prompt;
  pending: boolean;
  onSelect: (version: Prompt["versions"][number]) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">保存履歴</h2>
      {prompt.versions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          保存済みの版はありません。
        </p>
      )}
      <ul className="space-y-2">
        {prompt.versions.map((version) => (
          <li
            key={version.id}
            className="rounded-md border border-border p-3 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span>第{version.version}版</span>
              {version.id === prompt.publishedVersionId && (
                <span className="rounded bg-primary px-2 py-0.5 text-primary-foreground">
                  公開中
                </span>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => onSelect(version)}
              >
                編集欄に読み込む
              </Button>
            </div>
            <p className="text-muted-foreground">
              {new Date(version.createdAt).toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
              })}{" "}
              / 作成者: {version.createdBy ?? "不明"}
            </p>
            <p>{version.changeNote}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
