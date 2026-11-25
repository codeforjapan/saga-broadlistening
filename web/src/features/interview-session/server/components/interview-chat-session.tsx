import "server-only";

import { type ComponentProps, Suspense } from "react";
import { InterviewChatClient } from "../../client/components/interview-chat-client";
import type { InterviewMessage } from "../../shared/types";

type InterviewChatClientProps = ComponentProps<typeof InterviewChatClient>;

type InterviewChatSessionProps = Omit<
  InterviewChatClientProps,
  "initialMessages" | "isPreparing"
> & {
  /** 最初の質問を生成中なら Promise（initializeInterviewChat の messages） */
  initialMessages: InterviewMessage[] | Promise<InterviewMessage[]>;
};

/**
 * 進行中セッションのチャット画面。最初の質問を生成中なら、
 * 待つあいだチャットの枠を先に出し、生成できたら差し替える（#229）
 */
export function InterviewChatSession({
  initialMessages,
  ...props
}: InterviewChatSessionProps) {
  if (Array.isArray(initialMessages)) {
    return <InterviewChatClient {...props} initialMessages={initialMessages} />;
  }

  return (
    <Suspense
      fallback={
        <InterviewChatClient {...props} initialMessages={[]} isPreparing />
      }
    >
      <ResolvedInterviewChat {...props} initialMessages={initialMessages} />
    </Suspense>
  );
}

async function ResolvedInterviewChat({
  initialMessages,
  ...props
}: InterviewChatSessionProps & {
  initialMessages: Promise<InterviewMessage[]>;
}) {
  return (
    <InterviewChatClient {...props} initialMessages={await initialMessages} />
  );
}
