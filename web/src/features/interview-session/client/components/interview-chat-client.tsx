"use client";

import { Info } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { getBillDetailLink } from "@/features/interview-config/shared/utils/interview-links";
import type { InterviewStage } from "../../shared/schemas";
import type { InterviewBriefing } from "../../shared/utils/build-interview-briefing";
import { useInterviewChat } from "../hooks/use-interview-chat";
import { useInterviewRating } from "../hooks/use-interview-rating";
import { useInterviewTimer } from "../hooks/use-interview-timer";
import { calcInterviewProgress } from "../utils/calc-interview-progress";
import { embedBillLink } from "../utils/embed-bill-link";
import { InterviewBriefingCard } from "./interview-briefing-card";
import { InterviewChatInput } from "./interview-chat-input";
import { InterviewErrorDisplay } from "./interview-error-display";
import { InterviewMessage } from "./interview-message";
import { InterviewProgressBar } from "./interview-progress-bar";
import { InterviewRatingWidget } from "./interview-rating-widget";
import { InterviewSummaryInput } from "./interview-summary-input";
import { QuickReplyButtons } from "./quick-reply-buttons";
import { SkipActionPopover } from "./skip-action-popover";
import { TimeUpPrompt } from "./time-up-prompt";

interface InterviewChatClientProps {
  /** 参加導線の起点。離脱リンクの組み立てに使う */
  target: InterviewTarget;
  /** 対話する意見募集のID */
  interviewConfigId: string;
  /** 紐づく施策。抽象テーマ型では null */
  bill: { id: string; title: string } | null;
  sessionId: string;
  initialMessages: Array<{
    id: string;
    role: "assistant" | "user";
    content: string;
    created_at: string;
  }>;
  totalQuestions?: number;
  estimatedDuration?: number | null;
  sessionStartedAt?: string;
  hasRated?: boolean;
  /** サーバーが持つセッションのステージ */
  initialStage?: InterviewStage;
  /** チャットの前に出す固定カード */
  briefing?: InterviewBriefing;
}

export function InterviewChatClient({
  target,
  interviewConfigId,
  bill,
  sessionId,
  initialMessages,
  totalQuestions,
  estimatedDuration,
  sessionStartedAt,
  hasRated,
  initialStage,
  briefing,
}: InterviewChatClientProps) {
  // プレビュートークンは target が持っているので、別 prop では受け取らない
  const previewToken =
    target.kind === "policy" ? target.previewToken : undefined;
  const {
    input,
    setInput,
    stage,
    messages,
    isLoading,
    error,
    object,
    streamingReportData,
    currentQuickReplies,
    canRetry,
    handleSubmit,
    handleQuickReply,
    handleRetry,
    handleResumeInterview,
    handleEnd,
  } = useInterviewChat({
    interviewConfigId,
    initialMessages,
    previewPolicyId: target.kind === "policy" ? target.policyId : undefined,
    previewToken,
    initialStage,
  });

  // 固定カードは、まだ一度も答えていないときに開いておく
  const [isBriefingOpen, setIsBriefingOpen] = useState(
    () => !!briefing && !initialMessages.some((m) => m.role === "user")
  );

  const { remainingMinutes, isTimeUp } = useInterviewTimer({
    estimatedDuration,
    sessionStartedAt,
  });

  const [timeUpDismissed, setTimeUpDismissed] = useState(false);

  const progress = useMemo(
    () => calcInterviewProgress(totalQuestions, stage, messages),
    [messages, totalQuestions, stage]
  );

  const { showRating, handleRatingDismiss } = useInterviewRating({
    progress,
    hasRated,
  });

  const billDetailLink = bill ? getBillDetailLink(bill.id, previewToken) : null;

  const showProgressBar = progress !== null;
  const timerMinutes =
    remainingMinutes !== null && stage === "chat" && !timeUpDismissed
      ? remainingMinutes
      : null;
  const showTimeUpPrompt =
    isTimeUp && !timeUpDismissed && stage === "chat" && !isLoading;

  // チャット操作時にタイムアップアラートを自動非表示にする
  const dismissTimeUpIfNeeded = useCallback(() => {
    if (isTimeUp && !timeUpDismissed) {
      setTimeUpDismissed(true);
    }
  }, [isTimeUp, timeUpDismissed]);

  const handleChatSubmit = useCallback(
    (params: { text?: string }) => {
      if (params.text) {
        dismissTimeUpIfNeeded();
      }
      handleSubmit(params);
    },
    [dismissTimeUpIfNeeded, handleSubmit]
  );

  const handleChatQuickReply = useCallback(
    (text: string) => {
      dismissTimeUpIfNeeded();
      handleQuickReply(text);
    },
    [dismissTimeUpIfNeeded, handleQuickReply]
  );

  const handleSkipAction = (text: string) => {
    handleSubmit({ text });
  };

  const handleEndInterviewTimeUp = () => {
    setTimeUpDismissed(true);
    handleEnd();
  };

  const handleContinueInterview = () => {
    setTimeUpDismissed(true);
  };

  // ストリーミング中のメッセージがすでに会話履歴に追加されているかどうか
  const isStreamingMessageCommitted =
    object &&
    messages.some((m) => m.role === "assistant" && m.content === object.text);

  // ストリーミング中のメッセージを表示するかどうか
  const showStreamingMessage = object && !isStreamingMessageCommitted;

  // メッセージ内にレポートが存在するかどうか
  const hasReport = messages.some((m) => m.report != null);

  // 最後のAIメッセージのインデックスを事前計算
  const lastAssistantIndex = messages.findLastIndex(
    (m) => m.role === "assistant"
  );

  return (
    <div className="h-dvh md:h-[calc(100dvh-96px)] bg-muted">
      <div className="flex flex-col h-full pt-23 md:pt-10 bg-white md:rounded-t-[36px] md:px-12">
        {showProgressBar && progress && (
          <div className="px-4 pb-1">
            <InterviewProgressBar
              percentage={progress.percentage}
              currentTopic={progress.currentTopic}
              remainingMinutes={timerMinutes}
            />
          </div>
        )}
        <Conversation className="min-h-0 flex-1 overflow-y-auto">
          <ConversationContent className="flex flex-col gap-4">
            {/* 初期表示メッセージ */}
            {messages.length === 0 && !object && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-bold leading-[1.8] text-foreground">
                  {bill
                    ? "施策についてのAIインタビューを開始します。"
                    : "AIインタビューを開始します。"}
                </p>
                <p className="text-sm text-muted-foreground">
                  あなたの意見や経験をお聞かせください。
                </p>
              </div>
            )}

            {/* メッセージ一覧を表示 */}
            {messages.map((message, index) => {
              // 最後のAIメッセージかつストリーミング中でない場合にスキップボタンを表示
              const showSkipFooter =
                index === lastAssistantIndex &&
                stage === "chat" &&
                !isLoading &&
                !showStreamingMessage;

              // 最初のAIメッセージの施策名をリンクに変換（施策がある場合のみ）
              const content =
                index === 0 &&
                message.role === "assistant" &&
                bill &&
                billDetailLink
                  ? embedBillLink(message.content, bill.title, billDetailLink)
                  : message.content;

              return (
                <InterviewMessage
                  key={message.id}
                  message={{
                    id: message.id,
                    role: message.role,
                    parts: [{ type: "text" as const, text: content }],
                  }}
                  openLinksInNewTab={index === 0}
                  isStreaming={false}
                  report={message.report}
                  footer={
                    showSkipFooter ? (
                      <SkipActionPopover
                        onSelect={handleSkipAction}
                        disabled={isLoading}
                      />
                    ) : undefined
                  }
                />
              );
            })}

            {/* ストリーミング中のAIレスポンスを表示 */}
            {showStreamingMessage && (
              <InterviewMessage
                key="streaming-assistant"
                message={{
                  id: "streaming-assistant",
                  role: "assistant",
                  parts: [{ type: "text" as const, text: object.text ?? "" }],
                }}
                isStreaming={isLoading}
                report={streamingReportData}
              />
            )}

            {/* ローディング表示 */}
            {isLoading && !object && (
              <span className="text-sm text-muted-foreground">考え中...</span>
            )}

            {/* エラー表示 */}
            <InterviewErrorDisplay
              error={error}
              canRetry={canRetry}
              onRetry={handleRetry}
              isRetrying={isLoading}
            />

            {/* クイックリプライボタン */}
            {/* 選択肢ボタン（本文のストリーミングが終わってから出す） */}
            {stage === "chat" &&
              !isLoading &&
              currentQuickReplies.length > 0 && (
                <QuickReplyButtons
                  replies={currentQuickReplies}
                  onSelect={handleChatQuickReply}
                  disabled={isLoading}
                />
              )}
          </ConversationContent>
        </Conversation>

        {/* 評価ウィジェット */}
        {showRating && (
          <div className="shrink-0 py-2">
            <InterviewRatingWidget
              sessionId={sessionId}
              onDismiss={handleRatingDismiss}
            />
          </div>
        )}

        {/* 時間超過プロンプト */}
        {showTimeUpPrompt && (
          <TimeUpPrompt
            onEndInterview={handleEndInterviewTimeUp}
            onContinue={handleContinueInterview}
            disabled={isLoading}
          />
        )}

        {/* 入力エリア */}
        <div className="px-6 pt-2">
          {stage !== "summary_complete" && (
            <div className="mb-2 flex items-center justify-between">
              {briefing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBriefingOpen(true)}
                >
                  <Info className="size-4" />
                  このインタビューについて
                </Button>
              ) : (
                <span />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnd}
                disabled={isLoading}
              >
                終える
              </Button>
            </div>
          )}
          {(stage === "summary" || stage === "summary_complete") && (
            <InterviewSummaryInput
              sessionId={sessionId}
              target={target}
              hasReport={hasReport}
              isComplete={stage === "summary_complete"}
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onResume={handleResumeInterview}
              isLoading={isLoading}
              error={error}
            />
          )}

          {stage === "chat" && (
            <InterviewChatInput
              input={input}
              onInputChange={setInput}
              onSubmit={handleChatSubmit}
              placeholder="AIの質問に回答する"
              isResponding={isLoading}
            />
          )}
        </div>
      </div>
      {briefing && (
        <InterviewBriefingCard
          briefing={briefing}
          open={isBriefingOpen}
          onOpenChange={setIsBriefingOpen}
        />
      )}
    </div>
  );
}
