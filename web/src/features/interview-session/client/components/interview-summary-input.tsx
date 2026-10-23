"use client";

import { useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  type InterviewTarget,
  previewCredentialOf,
} from "@/features/interview-config/shared/types/interview-target";
import { InterviewPublicConsentModal } from "@/features/interview-report/client/components/interview-public-consent-modal";
import { useEndInterview } from "../hooks/use-end-interview";
import { useInterviewCompletion } from "../hooks/use-interview-completion";
import { InterviewChatInput } from "./interview-chat-input";

interface InterviewSummaryInputProps {
  sessionId: string;
  /** 「インタビューを終了する」の戻り先を決めるための参加導線の起点 */
  target: InterviewTarget;
  hasReport: boolean;
  /** 締めの発話まで終わった（これ以上 AI は発話しない） */
  isComplete: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  /** レポート未生成時の「インタビューを続ける」で呼ぶ再開処理 */
  onResume?: () => void;
  isLoading: boolean;
  error: Error | null | undefined;
}

export function InterviewSummaryInput({
  sessionId,
  target,
  hasReport,
  isComplete,
  input,
  onInputChange,
  onSubmit,
  onResume,
  isLoading,
  error,
}: InterviewSummaryInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isCompleting, completeError, handleSubmit } = useInterviewCompletion({
    sessionId,
    preview: previewCredentialOf(target),
  });
  const { endInterview, isEnding } = useEndInterview(sessionId, target);

  return (
    <>
      {!isLoading && (
        <div className="mb-3 flex flex-col gap-2">
          {hasReport ? (
            <Button
              onClick={() => setIsModalOpen(true)}
              disabled={isCompleting}
            >
              {isCompleting ? "送信中..." : "レポート内容に同意して提出"}
            </Button>
          ) : (
            <>
              <p className="text-sm font-medium leading-[1.8] text-foreground mb-2">
                お話しいただいた内容が短く、レポートを作成できませんでした。もう少しインタビューを続けると、レポートを作成できます。
              </p>
              {!isComplete && (
                <Button onClick={() => onResume?.()}>
                  インタビューを続ける
                </Button>
              )}
              <Button
                variant="outline"
                onClick={endInterview}
                disabled={isEnding}
              >
                {isEnding ? "終了中..." : "インタビューを終了する"}
              </Button>
            </>
          )}
          {completeError && (
            <p className="text-sm text-red-500">{completeError}</p>
          )}
        </div>
      )}
      {hasReport && !isComplete && (
        <>
          <p className="mb-2 text-sm font-medium leading-[1.8] text-foreground">
            こちらの内容で問題ありませんか？違和感がある箇所があれば指摘してください。
          </p>
          <InterviewChatInput
            input={input}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            placeholder="レポートの修正要望を入力する"
            isResponding={isLoading}
            error={error}
          />
        </>
      )}
      <InterviewPublicConsentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleSubmit}
        isSubmitting={isCompleting}
      />
    </>
  );
}
