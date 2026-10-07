import type { UIMessage } from "@ai-sdk/react";
import type { ComponentProps } from "react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import { SUGGEST_INTERVIEW_TOOL_TYPE } from "@/features/chat/shared/constants";
import type { InterviewParticipationView } from "@/features/interview-config/shared/types/interview-participation-view";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { InterviewSuggestionBanner } from "./interview-suggestion-banner";

type RehypePlugins = ComponentProps<typeof Response>["rehypePlugins"];

interface SystemMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  billId?: string;
  billName?: string;
  interviewParticipation?: InterviewParticipationView;
  interviewTarget?: InterviewTarget;
  rehypePlugins?: RehypePlugins;
}

export function SystemMessage({
  message,
  isStreaming,
  billId,
  billName,
  interviewParticipation,
  interviewTarget,
  rehypePlugins,
}: SystemMessageProps) {
  return (
    <Message from="assistant" className="justify-start py-0">
      <MessageContent
        variant="flat"
        className="text-sm font-medium leading-[1.8] text-foreground"
      >
        {message.parts.map((part, i: number) => {
          if (part.type === "text") {
            return (
              <Response
                key={`${message.id}-${i}`}
                className="break-words"
                rehypePlugins={rehypePlugins}
              >
                {part.text}
              </Response>
            );
          }
          if (part.type === "source-url" && /^https?:\/\//.test(part.url)) {
            return (
              <a
                key={`${message.id}-${i}`}
                href={part.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all text-primary underline"
              >
                出典: {part.title || part.url}
              </a>
            );
          }
          if (part.type === "reasoning") {
            return (
              <Reasoning
                key={`${message.id}-${i}`}
                className="w-full"
                isStreaming={isStreaming && i === message.parts.length - 1}
              >
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );
          }
          if (part.type === SUGGEST_INTERVIEW_TOOL_TYPE && billId && billName) {
            return (
              <InterviewSuggestionBanner
                key={`${message.id}-${i}`}
                billId={billId}
                billName={billName}
                participation={interviewParticipation}
                target={interviewTarget}
              />
            );
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
}
