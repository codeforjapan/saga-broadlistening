"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { TextSelectionWrapper } from "@/features/bills/client/components/text-selection-tooltip/text-selection-wrapper";
import {
  ChatButton,
  type ChatButtonRef,
} from "@/features/chat/client/components/chat-button";
import type { InterviewParticipationView } from "@/features/interview-config/shared/types/interview-participation-view";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import type { BillWithContent } from "../../../shared/types";

interface BillDetailClientProps {
  bill: BillWithContent;
  currentDifficulty: DifficultyLevelEnum;
  hasInterviewConfig: boolean;
  interviewParticipation?: InterviewParticipationView;
  interviewTarget?: InterviewTarget;
  children: ReactNode;
}

/**
 * 施策詳細のクライアントサイド機能を管理するコンポーネント
 *
 * 実装背景:
 * - テキスト選択からのAIチャット連携機能を提供
 * - Server Componentである BillDetailLayout から切り出すことで
 *   SSRを保持しつつクライアントサイド機能を実装
 */
export function BillDetailClient({
  bill,
  currentDifficulty,
  hasInterviewConfig,
  interviewParticipation,
  interviewTarget,
  children,
}: BillDetailClientProps) {
  const chatButtonRef = useRef<ChatButtonRef>(null);

  const handleOpenChat = (selectedText: string) => {
    chatButtonRef.current?.openWithText(selectedText);
  };

  return (
    <>
      <TextSelectionWrapper onOpenChat={handleOpenChat}>
        {children}
      </TextSelectionWrapper>

      {/* チャット機能 */}
      <ChatButton
        ref={chatButtonRef}
        billContext={bill}
        hasInterviewConfig={hasInterviewConfig}
        interviewParticipation={interviewParticipation}
        interviewTarget={interviewTarget}
        difficultyLevel={currentDifficulty}
      />
    </>
  );
}
