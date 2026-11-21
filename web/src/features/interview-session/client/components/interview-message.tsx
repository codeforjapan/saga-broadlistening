import type { UIMessage } from "@ai-sdk/react";
import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";
import remarkBreaks from "remark-breaks";
import { SystemMessage } from "@/features/chat/client/components/system-message";
import { UserMessage } from "@/features/chat/client/components/user-message";
import { InterviewSummary } from "@/features/interview-session/client/components/interview-summary";
import { rehypeOpenLinksInNewTab } from "@/lib/markdown/rehype-open-links-in-new-tab";
import { ChatAiAvatar } from "../../shared/components/chat-ai-avatar";
import { INTERVIEW_MESSAGE_TEXT_CLASS } from "../../shared/constants/interview-message-text";
import type { InterviewReportViewData } from "../../shared/schemas";

type RehypePlugins = ComponentProps<typeof SystemMessage>["rehypePlugins"];

// インタビュアーの発話は、つなぎと次の質問を改行1つで区切るため、改行をそのまま表示する
const REMARK_PLUGINS = [remarkBreaks];

interface InterviewMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
  report?: InterviewReportViewData | null;
  footer?: ReactNode;
  openLinksInNewTab?: boolean;
}

export function InterviewMessage({
  message,
  isStreaming = false,
  report,
  footer,
  openLinksInNewTab = false,
}: InterviewMessageProps) {
  const rehypePlugins: RehypePlugins = useMemo(
    () => (openLinksInNewTab ? [rehypeOpenLinksInNewTab] : undefined),
    [openLinksInNewTab]
  );

  if (message.role === "user") {
    // 右寄せの吹き出し（#271）。行間は発話（1.75〜1.8）より少し詰める
    return (
      <UserMessage
        message={message}
        className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-[1.7] md:px-[18px] md:py-3 md:text-[17px]"
      />
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex-shrink-0">
        <ChatAiAvatar />
      </div>
      <div className="flex-1 space-y-2">
        <SystemMessage
          message={message}
          isStreaming={isStreaming}
          rehypePlugins={rehypePlugins}
          remarkPlugins={REMARK_PLUGINS}
          contentClassName={INTERVIEW_MESSAGE_TEXT_CLASS}
        />
        {report && (
          <div className="mt-2">
            <InterviewSummary report={report} />
          </div>
        )}
      </div>
      {footer && <div className="flex justify-end">{footer}</div>}
    </div>
  );
}
