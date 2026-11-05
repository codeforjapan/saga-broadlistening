"use client";

import {
  renderVoiceSummaryHtml,
  validateVoiceSummaryMarkdown,
} from "@mirai-gikai/shared/voice-summary/markdown";
import { Copy, Eye, EyeOff, Loader2, Save } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { routes } from "@/lib/routes";
import {
  duplicateVoiceSummaryAction,
  publishVoiceSummaryAction,
  saveVoiceSummaryDraftAction,
  unpublishVoiceSummaryAction,
  type VoiceSummaryActionResult,
} from "../../server/actions/voice-summary-actions";
import type { VoiceSummaryStatus } from "../../shared/utils/voice-summary-status";

interface VoiceSummaryEditorProps {
  interviewConfigId: string;
  summary: {
    id: string;
    status: VoiceSummaryStatus;
    contentMd: string;
  };
}

/**
 * まとめの編集とプレビュー（左に Markdown、右にプレビュー）。
 * プレビューは web の公開画面と同じ描画（renderVoiceSummaryHtml + .voice-summary-content）を使う。
 * 編集できるのは下書きだけで、公開中・公開終了の版は複製してから直す。
 */
export function VoiceSummaryEditor({
  interviewConfigId,
  summary,
}: VoiceSummaryEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(summary.contentMd);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDraft = summary.status === "draft";
  const isDirty = content !== summary.contentMd;

  const validation = useMemo(
    () => validateVoiceSummaryMarkdown(content),
    [content]
  );
  // 入力は記法の検証（生の HTML は出力しない）を通した Markdown なので、HTML として描画してよい
  const previewHtml = useMemo(() => renderVoiceSummaryHtml(content), [content]);

  const run = (
    action: () => Promise<VoiceSummaryActionResult>,
    successMessage: string
  ) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setMessage(
          [result.error, ...(result.validationErrors ?? [])].join(" / ")
        );
        return;
      }
      setMessage(successMessage);
      if (result.id) {
        router.push(
          routes.interviewVoiceSummary(interviewConfigId, result.id) as Route
        );
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-gray-700">Markdown</p>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            readOnly={!isDraft}
            className="min-h-[560px] font-mono text-sm"
          />
          {!validation.ok && (
            <ul className="list-disc pl-5 text-sm text-red-600">
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-gray-700">
            プレビュー（公開画面と同じ表示）
          </p>
          <div
            className="voice-summary-content min-h-[560px] rounded-md border bg-white p-6"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isDraft && (
          <Button
            type="button"
            disabled={isPending || !isDirty || !validation.ok}
            onClick={() =>
              run(
                () =>
                  saveVoiceSummaryDraftAction({
                    id: summary.id,
                    contentMd: content,
                  }),
                "保存しました"
              )
            }
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            下書きを保存
          </Button>
        )}
        {summary.status !== "published" && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending || isDirty}
            onClick={() =>
              run(() => publishVoiceSummaryAction(summary.id), "公開しました")
            }
          >
            <Eye className="size-4" />
            この版を公開する
          </Button>
        )}
        {summary.status === "published" && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              run(
                () => unpublishVoiceSummaryAction(summary.id),
                "非公開にしました"
              )
            }
          >
            <EyeOff className="size-4" />
            非公開にする
          </Button>
        )}
        {!isDraft && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              run(
                () => duplicateVoiceSummaryAction(summary.id),
                "複製して下書きを作りました"
              )
            }
          >
            <Copy className="size-4" />
            複製して下書きを作る
          </Button>
        )}
        {isDraft && isDirty && (
          <p className="text-sm text-gray-500">
            公開する前に下書きを保存してください
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-gray-700">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
