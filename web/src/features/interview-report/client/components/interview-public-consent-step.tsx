"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { InterviewStepFrame } from "@/features/interview-session/client/components/interview-step-dialog";
import {
  ConsentCheckListItem,
  OpenDataNoticeItem,
} from "./consent-check-list-item";

interface InterviewPublicConsentStepProps {
  onBack: () => void;
  onSubmit: (isPublic: boolean) => void;
  isSubmitting: boolean;
  error?: string | null;
}

/** STEP 3：公開設定（#276）。公開を許可するか選んで提出する */
export function InterviewPublicConsentStep({
  onBack,
  onSubmit,
  isSubmitting,
  error,
}: InterviewPublicConsentStepProps) {
  return (
    <InterviewStepFrame
      step={3}
      onBack={onBack}
      footer={
        <>
          {error && <p className="mb-1 text-sm text-destructive">{error}</p>}
          <Button onClick={() => onSubmit(true)} disabled={isSubmitting}>
            {isSubmitting ? "送信中..." : "公開を許可して提出する"}
            {!isSubmitting && <ArrowRight className="size-5" />}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onSubmit(false)}
            disabled={isSubmitting}
            className="text-muted-foreground"
          >
            非公開で提出する
          </Button>
        </>
      }
    >
      <DialogTitle className="text-center text-lg font-bold leading-relaxed text-primary-accent">
        インタビュー内容の公開を
        <br />
        許可しますか？
      </DialogTitle>
      <div className="mt-4 space-y-3">
        <ConsentCheckListItem>
          公開を許可すると、あなたの意見のまとめが、名前を出さずに掲載されることがあります。
          <strong className="font-bold">会話の原文は公開されません。</strong>
        </ConsentCheckListItem>
        <ConsentCheckListItem>
          さまざまな意見が公開されることで、より深い施策議論が実現できます。
        </ConsentCheckListItem>
        <ConsentCheckListItem>
          非公開で提出した場合でも、ご意見は佐賀市の施策検討に活用されます。
        </ConsentCheckListItem>
        <OpenDataNoticeItem />
      </div>
    </InterviewStepFrame>
  );
}
