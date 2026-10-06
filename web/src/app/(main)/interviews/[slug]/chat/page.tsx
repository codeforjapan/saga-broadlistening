import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { getInterviewQuestions } from "@/features/interview-config/server/loaders/get-interview-questions";
import { themeInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { selectPrimaryPolicyId } from "@/features/interview-config/shared/utils/interview-visibility";
import { InterviewChatClient } from "@/features/interview-session/client/components/interview-chat-client";
import { InterviewSessionErrorView } from "@/features/interview-session/client/components/interview-session-error-view";
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
    const { session, messages } = await initializeInterviewChat(config, bill);

    return (
      <InterviewChatClient
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
      />
    );
  } catch (error) {
    // 参加条件を満たさない場合は回答を始めずに LP へ戻す（LP 側で回答方法を案内する）
    if (error instanceof InterviewParticipationDeniedError) {
      redirect(routes.interviewThemeLP(slug));
    }
    console.error("Failed to initialize interview session (theme):", error);
    return <InterviewSessionErrorView target={target} />;
  }
}
