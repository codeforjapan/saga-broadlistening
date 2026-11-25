"use client";

import { ArrowRight, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InterviewPublicConsentStep } from "@/features/interview-report/client/components/interview-public-consent-step";
import type { UserProfileForm } from "@/features/user-profile/client/hooks/use-user-profile-form";
import type { InterviewReportViewData } from "../../shared/schemas";
import { InterviewProfileStep } from "./interview-profile-step";
import {
  InterviewStepDialog,
  InterviewStepFrame,
} from "./interview-step-dialog";
import { InterviewSummary } from "./interview-summary";

type Step = 1 | 2 | 3;

interface InterviewSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: InterviewReportViewData;
  /** STEP 2 の入力状態（useUserProfileForm） */
  profileForm: UserProfileForm;
  /** まだチャットでまとめを直せるか。締めの発話のあとは直せないので、提出だけを案内する */
  canRevise: boolean;
  onSubmit: (isPublic: boolean) => void;
  isSubmitting: boolean;
  submitError?: string | null;
}

/**
 * まとめの確認（STEP 1）→ 属性の質問（STEP 2）→ 公開設定（STEP 3）を1つのモーダルで進める（#274〜#276）。
 * 「直したいところを伝える」や閉じる操作ではモーダルを閉じ、次に開いたときは STEP 1 から始める
 */
export function InterviewSubmitDialog({
  open,
  onOpenChange,
  report,
  profileForm,
  canRevise,
  onSubmit,
  isSubmitting,
  submitError,
}: InterviewSubmitDialogProps) {
  const [step, setStep] = useState<Step>(1);

  const handleOpenChange = (nextOpen: boolean) => {
    // 送信中は閉じさせない（画面遷移を待つ）
    if (!nextOpen && isSubmitting) return;
    if (!nextOpen) setStep(1);
    onOpenChange(nextOpen);
  };

  return (
    <InterviewStepDialog open={open} onOpenChange={handleOpenChange}>
      {step === 1 && (
        <InterviewStepFrame
          step={1}
          title="まとめを確認してください"
          description={
            canRevise ? (
              <>
                AIがまとめたあなたの意見です。
                <br />
                違うところがあれば直せます。
              </>
            ) : (
              "AIがまとめたあなたの意見です。"
            )
          }
          footer={
            <>
              <Button onClick={() => setStep(2)}>
                この内容で次へ
                <ArrowRight className="size-5" />
              </Button>
              {canRevise && (
                <Button
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                  className="text-muted-foreground"
                >
                  <Pencil />
                  直したいところを伝える
                </Button>
              )}
            </>
          }
        >
          <InterviewSummary report={report} />
        </InterviewStepFrame>
      )}
      {step === 2 && (
        <InterviewProfileStep
          form={profileForm}
          onBack={() => setStep(1)}
          // 属性の保存を待つあいだに閉じたり戻ったりしたら、進めない
          onNext={() => setStep((current) => (current === 2 ? 3 : current))}
        />
      )}
      {step === 3 && (
        <InterviewPublicConsentStep
          onBack={() => setStep(2)}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          error={submitError}
        />
      )}
    </InterviewStepDialog>
  );
}
