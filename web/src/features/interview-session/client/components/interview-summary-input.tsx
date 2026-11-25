"use client";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  type InterviewTarget,
  previewCredentialOf,
} from "@/features/interview-config/shared/types/interview-target";
import { useUserProfileForm } from "@/features/user-profile/client/hooks/use-user-profile-form";
import type { InterviewReportViewData } from "../../shared/schemas";
import { useEndInterview } from "../hooks/use-end-interview";
import { useInterviewCompletion } from "../hooks/use-interview-completion";
import { InterviewChatInput } from "./interview-chat-input";
import { InterviewSubmitDialog } from "./interview-submit-dialog";

interface InterviewSummaryInputProps {
  sessionId: string;
  /** 「インタビューを終了する」の戻り先を決めるための参加導線の起点 */
  target: InterviewTarget;
  /** いちばん新しいまとめ。まだできていなければ null */
  latestReport: { messageId: string; report: InterviewReportViewData } | null;
  /** まとめのモーダルの開閉。自動で開く判定は呼び出し側が持つ */
  isSubmitDialogOpen: boolean;
  onSubmitDialogOpenChange: (open: boolean) => void;
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
  latestReport,
  isSubmitDialogOpen,
  onSubmitDialogOpenChange,
  isComplete,
  input,
  onInputChange,
  onSubmit,
  onResume,
  isLoading,
  error,
}: InterviewSummaryInputProps) {
  const { isCompleting, completeError, handleSubmit } = useInterviewCompletion({
    sessionId,
    preview: previewCredentialOf(target),
  });
  const { endInterview, isEnding } = useEndInterview(sessionId, target);
  const profileForm = useUserProfileForm();

  if (!latestReport) {
    if (isLoading) return null;
    return (
      <div className="mb-3 flex flex-col gap-2">
        <p className="text-body text-foreground mb-2">
          お話しいただいた内容が短く、レポートを作成できませんでした。もう少しインタビューを続けると、レポートを作成できます。
        </p>
        {!isComplete && (
          <Button onClick={() => onResume?.()}>インタビューを続ける</Button>
        )}
        <Button variant="outline" onClick={endInterview} disabled={isEnding}>
          {isEnding ? "終了中..." : "インタビューを終了する"}
        </Button>
      </div>
    );
  }

  return (
    <>
      {!isLoading && (
        <div className="flex justify-end pb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSubmitDialogOpenChange(true)}
          >
            まとめを確認する
          </Button>
        </div>
      )}
      {!isComplete && (
        <InterviewChatInput
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          placeholder="直したいところがあれば、ここに入力してください"
          isResponding={isLoading}
          error={error}
        />
      )}
      <InterviewSubmitDialog
        open={isSubmitDialogOpen}
        onOpenChange={onSubmitDialogOpenChange}
        report={latestReport.report}
        profileForm={profileForm}
        canRevise={!isComplete}
        onSubmit={handleSubmit}
        isSubmitting={isCompleting}
        submitError={completeError}
      />
    </>
  );
}
