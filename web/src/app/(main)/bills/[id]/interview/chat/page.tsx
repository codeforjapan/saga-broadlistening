import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getInterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { getInterviewQuestions } from "@/features/interview-config/server/loaders/get-interview-questions";
import { policyInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { getInterviewLPLink } from "@/features/interview-config/shared/utils/interview-links";
import { InterviewChatClient } from "@/features/interview-session/client/components/interview-chat-client";
import { InterviewSessionErrorView } from "@/features/interview-session/client/components/interview-session-error-view";
import { initializeInterviewChat } from "@/features/interview-session/server/loaders/initialize-interview-chat";
import { InterviewParticipationDeniedError } from "@/features/interview-session/server/services/resolve-interview-participation";

interface InterviewChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InterviewChatPage({
  params,
}: InterviewChatPageProps) {
  const { id: billId } = await params;

  // 施策とインタビュー設定を取得
  const [bill, interviewConfig] = await Promise.all([
    getBillById(billId),
    getInterviewConfig(billId),
  ]);

  if (!bill || !interviewConfig) {
    notFound();
  }

  // 質問数を取得（プログレスバー用）
  const questions = await getInterviewQuestions(interviewConfig.id);
  const target = policyInterviewTarget(billId);

  // インタビューチャットの初期化処理
  try {
    const { session, messages } = await initializeInterviewChat(
      interviewConfig,
      bill
    );

    return (
      <InterviewChatClient
        target={target}
        interviewConfigId={interviewConfig.id}
        bill={{ id: bill.id, title: bill.bill_content?.title ?? bill.name }}
        sessionId={session.id}
        initialMessages={messages}
        totalQuestions={questions.length}
        estimatedDuration={interviewConfig.estimated_duration}
        sessionStartedAt={session.started_at}
        hasRated={session.rating != null}
      />
    );
  } catch (error) {
    // 参加条件を満たさない場合は回答を始めずに LP へ戻す。
    // LP 側の案内（回答ボタンの差し替え）は #145 で対応する
    if (error instanceof InterviewParticipationDeniedError) {
      redirect(getInterviewLPLink(target) as Route);
    }
    console.error("Failed to initialize interview session:", error);
    return <InterviewSessionErrorView target={target} />;
  }
}
