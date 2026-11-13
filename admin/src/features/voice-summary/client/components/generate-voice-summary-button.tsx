"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

interface GenerateVoiceSummaryButtonProps {
  interviewConfigId: string;
  /** 生成できない理由（公開意見が足りない・公開中の分析がない）。null なら生成できる */
  disabledReason: string | null;
}

/** 公開中のトピック分析から、まとめの下書きを AI で作る */
export function GenerateVoiceSummaryButton({
  interviewConfigId,
  disabledReason,
}: GenerateVoiceSummaryButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      let response: Response;
      try {
        response = await fetch("/api/voice-summary/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewConfigId }),
        });
      } catch {
        // 通信が切れた（生成は長いので起こりうる）。画面は残したままメッセージを出す
        setError(
          "通信が切れました。生成が終わっている場合があるので、ページを読み込み直して履歴を確かめてください"
        );
        return;
      }
      const result = (await response.json().catch(() => null)) as
        | { success: true; id: string }
        | { success: false; error: string }
        | null;
      if (!result?.success) {
        setError(result?.error ?? "まとめを生成できませんでした");
        return;
      }
      router.push(
        routes.interviewVoiceSummary(interviewConfigId, result.id) as Route
      );
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={isPending || disabledReason !== null}
          onClick={handleGenerate}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isPending ? "生成しています（1〜2分かかります）" : "まとめを生成"}
        </Button>
        <p className="text-sm text-gray-500">
          公開中のトピック分析から、下書きを新しく作ります
        </p>
      </div>
      {disabledReason && (
        <p className="text-sm text-gray-600">{disabledReason}</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
