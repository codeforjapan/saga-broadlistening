"use client";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getInterviewChatLink } from "@/features/interview-config/shared/utils/interview-links";
import { NewInterviewButton } from "@/features/interview-session/client/components/new-interview-button";
import { RestartInterviewButton } from "@/features/interview-session/client/components/restart-interview-button";
import type { LatestInterviewSession } from "@/features/interview-session/server/loaders/get-latest-interview-session";
import type { InterviewTarget } from "../../shared/types/interview-target";
import { InterviewConsentModal } from "./interview-consent-modal";

interface InterviewActionButtonsProps {
  target: InterviewTarget;
  sessionInfo: LatestInterviewSession | null;
}

export function InterviewActionButtons({
  target,
  sessionInfo,
}: InterviewActionButtonsProps) {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const isActive = sessionInfo?.status === "active";
  const isCompleted = sessionInfo?.status === "completed";

  // 完了済みの場合：「もう一度新たに回答する」ボタン（確認ダイアログなし）
  if (isCompleted && sessionInfo?.reportId) {
    return <NewInterviewButton target={target} />;
  }

  // 進行中の場合は直接遷移
  if (isActive) {
    const chatLink = getInterviewChatLink(target);

    return (
      <>
        <Button
          asChild
          className="w-full bg-primary text-primary-foreground rounded-[100px] h-[48px] px-6 font-bold text-[15px] hover:opacity-90 transition-opacity flex items-center justify-center gap-4"
        >
          <Link href={chatLink as Route}>
            <Image
              src="/icons/messages-square-icon.svg"
              alt=""
              width={24}
              height={24}
              className="object-contain"
            />
            <span>AIインタビューを再開する</span>
            <ArrowRight className="size-5" />
          </Link>
        </Button>
        <RestartInterviewButton sessionId={sessionInfo.id} target={target} />
      </>
    );
  }

  // 新規の場合はモーダルを表示
  return (
    <>
      <Button
        onClick={() => setShowConsentModal(true)}
        className="w-full bg-primary text-primary-foreground rounded-[100px] h-[48px] px-6 font-bold text-[15px] hover:opacity-90 transition-opacity flex items-center justify-center gap-4"
      >
        <Image
          src="/icons/messages-square-icon.svg"
          alt=""
          width={24}
          height={24}
          className="object-contain"
        />
        <span>AIインタビューをはじめる</span>
        <ArrowRight className="size-5" />
      </Button>

      <InterviewConsentModal
        open={showConsentModal}
        onOpenChange={setShowConsentModal}
        target={target}
      />
    </>
  );
}
