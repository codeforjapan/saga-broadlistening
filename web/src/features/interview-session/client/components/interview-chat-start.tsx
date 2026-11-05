"use client";

import { Bot } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChikatServiceLogo } from "@/components/chikat-logo";
import { Button } from "@/components/ui/button";
import { ensureAnonymousSupabaseUser } from "@/features/chat/client/utils/ensure-anonymous-supabase-user";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { formatEstimatedDuration } from "@/features/interview-config/shared/utils/format-estimated-duration";
import { getInterviewLPLink } from "@/features/interview-config/shared/utils/interview-links";
import { routes } from "@/lib/routes";
import { startInterviewSession } from "../../server/actions/start-interview-session";
import { buildChatStartNotice } from "../../shared/utils/chat-start-notice";
import { InterviewChatInput } from "./interview-chat-input";
import { InterviewChatSurface } from "./interview-chat-surface";

interface InterviewChatStartProps {
  /** 参加導線の起点。「詳しく」のリンクと、プレビューのトークンに使う */
  target: InterviewTarget;
  interviewConfig: {
    id: string;
    name: string;
    estimated_duration: number | null;
  };
  /** テーマ名のリンク先（施策ページ。なければきかせてページ） */
  themeHref: string;
}

/**
 * チャットの開始画面（#158、デザイン「4b」）。チャット中と同じ白い面に冒頭の案内3行を出し、
 * 「はじめる」で同意を記録してセッションを作る。作成後はページを再描画して最初の質問を出す。
 */
export function InterviewChatStart({
  target,
  interviewConfig,
  themeHref,
}: InterviewChatStartProps) {
  const { name: themeName, estimated_duration: estimatedDuration } =
    interviewConfig;
  const aboutHref = getInterviewLPLink(target);
  // 職員プレビューは、参加条件と募集状態を問わずに始められる
  const preview =
    target.kind === "policy" && target.previewToken
      ? { policyId: target.policyId, token: target.previewToken }
      : undefined;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const notice = buildChatStartNotice({ themeName, estimatedDuration });
  const durationLabel = formatEstimatedDuration(estimatedDuration);

  const handleStart = () => {
    setError(null);
    startTransition(async () => {
      // AuthGate の匿名ログインより先に押されても始められるよう、確立を待つ（#228）
      if (!(await ensureAnonymousSupabaseUser())) {
        setError(
          "接続を確認できませんでした。ページを再読み込みしてお試しください"
        );
        return;
      }
      const result = await startInterviewSession(interviewConfig.id, preview);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    // ヘッダーの「保存して中断」は、この属性があるあいだ隠す（interview-header-actions）
    <InterviewChatSurface data-interview-chat-start="">
      <header className="flex items-center gap-3 border-b px-6 pb-4 md:px-12">
        <ChikatServiceLogo variant="kikasete" className="h-5" />
        <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
          {themeName}
        </span>
        {durationLabel && (
          <span className="ml-auto text-xs text-muted-foreground">
            {durationLabel}
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-10 md:px-12">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-kikasete-50 text-kikasete-700">
          <Bot className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-3 font-medium leading-relaxed">
          {notice.map((line) => (
            <p key={line.map((segment) => segment.text).join("")}>
              {line.map((segment) => {
                if (segment.kind === "theme") {
                  return (
                    <Link
                      key={segment.text}
                      href={themeHref as Route}
                      className="text-kikasete-700 underline underline-offset-4"
                    >
                      {segment.text}
                    </Link>
                  );
                }
                if (segment.kind === "strong") {
                  return <strong key={segment.text}>{segment.text}</strong>;
                }
                return <span key={segment.text}>{segment.text}</span>;
              })}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex flex-col-reverse gap-2 md:flex-row">
            <Button
              asChild
              variant="outline"
              className="h-11 border-kikasete-400 text-kikasete-700"
            >
              <Link href={aboutHref as Route}>
                このインタビューについて詳しく
              </Link>
            </Button>
            <Button
              type="button"
              variant="kikasete"
              className="h-11 px-8"
              disabled={isPending}
              onClick={handleStart}
            >
              {isPending ? "準備しています…" : "はじめる"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            「はじめる」を押すと、上の内容と
            <Link
              href={routes.terms() as Route}
              className="underline underline-offset-2"
            >
              利用規約
            </Link>
            ・
            <Link
              href={routes.privacy() as Route}
              className="underline underline-offset-2"
            >
              プライバシーポリシー
            </Link>
            に同意したものとします。
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* 入力欄はチャット中と同じ位置に出す。開始前なので入力も送信もできない */}
      <div className="px-6 pt-2 md:px-18">
        <InterviewChatInput
          input=""
          onInputChange={() => {}}
          onSubmit={() => {}}
          placeholder="AIの質問に回答する"
          isResponding={false}
          disabled
        />
      </div>
    </InterviewChatSurface>
  );
}
