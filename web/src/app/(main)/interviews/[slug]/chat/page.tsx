import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { getInterviewQuestions } from "@/features/interview-config/server/loaders/get-interview-questions";
import { themeInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { getInterviewLPLink } from "@/features/interview-config/shared/utils/interview-links";
import { selectPrimaryPolicyId } from "@/features/interview-config/shared/utils/interview-visibility";
import { InterviewChatStart } from "@/features/interview-session/client/components/interview-chat-start";
import { InterviewSessionErrorView } from "@/features/interview-session/client/components/interview-session-error-view";
import { InterviewChatSession } from "@/features/interview-session/server/components/interview-chat-session";
import { initializeInterviewChat } from "@/features/interview-session/server/loaders/initialize-interview-chat";
import { InterviewParticipationDeniedError } from "@/features/interview-session/server/services/resolve-interview-participation";
import { routes } from "@/lib/routes";

interface ThemeChatPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ThemeChatPage({ params }: ThemeChatPageProps) {
  const { slug } = await params;
  const result = await getInterviewConfigBySlug(slug);

  if (!result) {
    notFound();
  }

  const { config, policies } = result;
  const policyId = selectPrimaryPolicyId(policies);

  // 質問数を取得（プログレスバー用）。施策があればプロンプト用に併せて取得する
  const [questions, bill] = await Promise.all([
    getInterviewQuestions(config.id),
    policyId ? getBillById(policyId) : null,
  ]);

  const target = themeInterviewTarget(slug);

  try {
    const chat = await initializeInterviewChat(config, bill);

    if (chat.kind === "start") {
      return (
        <InterviewChatStart
          target={target}
          interviewConfig={config}
          // テーマにつながる施策（親施策）があればそのページ、なければきかせてページへ
          themeHref={
            policyId ? routes.billDetail(policyId) : getInterviewLPLink(target)
          }
        />
      );
    }

    const { session, messages } = chat;
    return (
      <InterviewChatSession
        target={target}
        interviewConfigId={config.id}
        bill={
          bill
            ? { id: bill.id, title: bill.bill_content?.title ?? bill.name }
            : null
        }
        sessionId={session.id}
        initialMessages={messages}
        totalQuestions={questions.length}
        estimatedDuration={config.estimated_duration}
        sessionStartedAt={session.started_at}
        hasRated={session.rating != null}
        initialStage={session.stage}
      />
    );
  } catch (error) {
    // 参加条件を満たさない場合は回答を始めずに LP へ戻す。
    // LP 側の案内（回答ボタンの差し替え）は #145 で対応する
    if (error instanceof InterviewParticipationDeniedError) {
      redirect(getInterviewLPLink(target) as Route);
    }
    console.error("Failed to initialize interview session (theme):", error);
    return <InterviewSessionErrorView target={target} />;
  }
}
