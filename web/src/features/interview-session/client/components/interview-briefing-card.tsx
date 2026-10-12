"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InterviewBriefing } from "../../shared/utils/build-interview-briefing";

interface InterviewBriefingCardProps {
  briefing: InterviewBriefing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * チャットの前に出す固定カード。「始める」で閉じ、チャット画面からいつでも開き直せる。
 * 目的・結果のお知らせ・途中でやめてよいことを、AI の発話ではなくここで先に伝える。
 */
export function InterviewBriefingCard({
  briefing,
  open,
  onOpenChange,
}: InterviewBriefingCardProps) {
  const durationText = briefing.estimatedDuration
    ? `・${briefing.estimatedDuration}分ほど`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto px-6 py-8">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-primary">
            {briefing.title}
          </DialogTitle>
          {briefing.subject && (
            <DialogDescription className="text-sm text-muted-foreground">
              {briefing.subject}
            </DialogDescription>
          )}
        </DialogHeader>

        <dl className="mt-4 flex flex-col gap-3 text-sm leading-[1.8]">
          {briefing.opinionFocus && (
            <div>
              <dt className="font-bold">市がこれから決めること</dt>
              <dd>{briefing.opinionFocus}</dd>
            </div>
          )}
          {briefing.decidedMatters && (
            <div>
              <dt className="font-bold">決まっていること</dt>
              <dd>{briefing.decidedMatters}</dd>
            </div>
          )}
          <div>
            <dt className="font-bold">結果のお知らせ</dt>
            <dd>{briefing.publicationText}</dd>
          </div>
          {briefing.topicCount > 0 && (
            <p className="font-bold">
              {briefing.topicCount}つの話題{durationText}
            </p>
          )}
        </dl>

        <ul className="mt-4 flex list-disc flex-col gap-1 pl-5 text-sm leading-[1.8] text-muted-foreground">
          <li>
            途中でやめても大丈夫です。画面の「終える」でいつでも終えられます
          </li>
          <li>
            いただいた声は、個人がわからない形でまとめ、市の検討に使います
          </li>
          <li>
            一つひとつへの返信や、採用のお約束はできません。個別のご相談は
            {briefing.consultationDesk}へ
          </li>
          <li>聞き手はAIです</li>
          <li>お名前や住所など、個人がわかることは書かないでください</li>
        </ul>

        <Button className="mt-6 w-full" onClick={() => onOpenChange(false)}>
          始める
        </Button>
      </DialogContent>
    </Dialog>
  );
}
