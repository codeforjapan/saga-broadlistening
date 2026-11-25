"use client";

import { diffLines } from "diff";

export function PromptDiff({
  original,
  current,
  publishedVersion,
}: {
  original: string;
  current: string;
  publishedVersion?: number;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">公開中の本文との差分</h2>
      <p className="text-sm text-muted-foreground">
        比較元:{" "}
        {publishedVersion ? `公開中の第${publishedVersion}版` : "初期文面"}
        。比較先: 編集中の本文。
      </p>
      <div className="max-h-80 overflow-auto rounded-md border border-border font-mono text-xs">
        {diffLines(original, current).map((part, index) => (
          <div
            key={`${index}-${part.value.length}`}
            className={
              part.added
                ? "bg-primary/10 text-primary"
                : part.removed
                  ? "bg-destructive/10 text-destructive"
                  : "bg-background text-foreground"
            }
          >
            <span className="mr-2 inline-block w-12 shrink-0 select-none">
              {part.added ? "追加" : part.removed ? "削除" : "共通"}
            </span>
            <span className="whitespace-pre-wrap">{part.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
