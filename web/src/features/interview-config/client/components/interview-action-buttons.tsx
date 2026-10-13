"use client";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getInterviewChatLink } from "@/features/interview-config/shared/utils/interview-links";
import { NewInterviewButton } from "@/features/interview-session/client/components/new-interview-button";
import { RestartInterviewButton } from "@/features/interview-session/client/components/restart-interview-button";
import type { LatestInterviewSession } from "@/features/interview-session/server/loaders/get-latest-interview-session";
import type { InterviewParticipationView } from "../../shared/types/interview-participation-view";
import type { InterviewTarget } from "../../shared/types/interview-target";
import { ExternalIdentityGuideNotice } from "./external-identity-guide-notice";

interface InterviewActionButtonsProps {
  target: InterviewTarget;
  sessionInfo: LatestInterviewSession | null;
  participation: InterviewParticipationView;
  /** きかせてページ（#158）では、はじめる・再開のボタンをきかせての緑にする */
  tone?: "primary" | "kikasete";
}

const START_BUTTON_CLASS =
  "w-full rounded-[100px] h-[48px] px-6 font-bold text-[15px] hover:opacity-90 transition-opacity flex items-center justify-center gap-4";

const TONE_VARIANTS = {
  primary: "default",
  kikasete: "kikasete",
} as const;

export function InterviewActionButtons({
  target,
  sessionInfo,
  participation,
  tone = "primary",
}: InterviewActionButtonsProps) {
  const startVariant = TONE_VARIANTS[tone];
  const isActive = sessionInfo?.status === "active";
  const isCompleted = sessionInfo?.status === "completed";

  if (participation.kind === "guide") {
    return <ExternalIdentityGuideNotice participation={participation} />;
  }

  // 完了済みの場合：「もう一度新たに回答する」ボタン（確認ダイアログなし）
  if (isCompleted && sessionInfo?.reportId) {
    return <NewInterviewButton target={target} />;
  }

  const chatLink = getInterviewChatLink(target);

  // 進行中の場合は続きから
  if (isActive) {
    return (
      <>
        <Button asChild variant={startVariant} className={START_BUTTON_CLASS}>
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

  // 新規の場合もチャットへ直接進む。同意はチャット冒頭の案内で取る（#158）
  return (
    <Button asChild variant={startVariant} className={START_BUTTON_CLASS}>
      <Link href={chatLink as Route}>
        <Image
          src="/icons/messages-square-icon.svg"
          alt=""
          width={24}
          height={24}
          className="object-contain"
        />
        <span>AIインタビューをはじめる</span>
        <ArrowRight className="size-5" />
      </Link>
    </Button>
  );
}
