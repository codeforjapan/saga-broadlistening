"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  type InterviewStage,
  interviewChatResponseSchema,
} from "@/features/interview-session/shared/schemas";
import type { InterviewChatRequestParams } from "@/features/interview-session/shared/types";
import {
  buildMessagesForApi,
  type ConversationMessage,
  convertPartialReport,
} from "../utils/message-utils";
import { useInterviewRetry } from "./use-interview-retry";
import { type InitialMessage, useParsedMessages } from "./use-parsed-messages";
import { useQuickReplies } from "./use-quick-replies";

interface UseInterviewChatProps {
  /** 対話する意見募集のID。施策はサーバー側で紐付けから引く */
  interviewConfigId: string;
  initialMessages: InitialMessage[];
  /** プレビュー画面から表示している場合のみ渡す（API側で検証される） */
  previewPolicyId?: string;
  previewToken?: string;
  /** サーバーが持つセッションのステージ。省略時はメッセージから推定する */
  initialStage?: InterviewStage;
}

type ChatRequestParams = Omit<InterviewChatRequestParams, "isRetry">;

export function useInterviewChat({
  interviewConfigId,
  initialMessages,
  previewPolicyId,
  previewToken,
  initialStage: serverStage,
}: UseInterviewChatProps) {
  // 初期メッセージのパース
  const { parsedInitialMessages, initialStage: parsedStage } =
    useParsedMessages(initialMessages);
  const initialStage = serverStage ?? parsedStage;

  // 基本状態
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<InterviewStage>(initialStage);
  const [conversationMessages, setConversationMessages] = useState<
    ConversationMessage[]
  >([]);

  // onFinishコールバック内で最新の値を参照するためのref
  const conversationMessagesRef = useRef<ConversationMessage[]>([]);
  conversationMessagesRef.current = conversationMessages;
  const stageRef = useRef<InterviewStage>(initialStage);
  stageRef.current = stage;

  // リトライロジック
  const retry = useInterviewRetry();

  // 「終えたい」と言われたときに続けて初回の要約を取りにいく保留リクエスト
  // onFinish内で直接submit()を呼ぶと再入になるため、useEffectで遅延実行する
  const [pendingSummaryRequest, setPendingSummaryRequest] =
    useState<ChatRequestParams | null>(null);

  // useObjectフックを使用（streamObjectの結果を受け取る）
  const { object, submit, isLoading, error } = useObject({
    api: "/api/interview/chat",
    schema: interviewChatResponseSchema,
    onFinish: ({ object: finishedObject, error: finishedError }) => {
      if (finishedError) {
        // リトライ処理を委譲
        const handled = retry.handleError(finishedError, submit);
        if (handled) return; // 自動リトライ実行済み
        return; // 手動リトライ待ち
      }

      // 成功時はリトライをリセット
      retry.resetRetry();

      if (finishedObject) {
        const {
          text,
          report,
          quick_replies,
          resolved_question_id,
          resolved_topic_title,
          topic_title,
          next_stage,
          chain_summary,
        } = finishedObject;

        // ステージ・question_id・選択肢ボタンはサーバーが決めて末尾に注入する
        const nextStage = next_stage ?? stageRef.current;
        setStage(nextStage);

        // summary→chat遷移時はレポートを含めない（LLMがスキーマ上生成しても無視）
        const shouldIncludeReport = nextStage !== "chat";

        const newAssistantMessage: ConversationMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: text ?? "",
          report: shouldIncludeReport ? convertPartialReport(report) : null,
          quickReplies: Array.isArray(quick_replies)
            ? quick_replies.filter(
                (r): r is string => typeof r === "string" && r.length > 0
              )
            : [],
          questionId: resolved_question_id ?? null,
          // 要約の段階ではサーバーが話題名を注入しないので、LLM の値を使う
          topicTitle: resolved_topic_title ?? topic_title ?? null,
        };

        setConversationMessages((prev) => [...prev, newAssistantMessage]);

        // 回答者が終えたいと言ったときは、続けて初回の要約を取りにいく
        if (chain_summary) {
          setPendingSummaryRequest({
            messages: buildMessagesForApi(parsedInitialMessages, [
              ...conversationMessagesRef.current,
              newAssistantMessage,
            ]),
            interviewConfigId,
            previewPolicyId,
            previewToken,
          });
        }
      }
    },
  });

  // 続けての要約: onFinishで予約されたリクエストをuseEffectで送信
  useEffect(() => {
    if (pendingSummaryRequest) {
      retry.saveRequestParams(pendingSummaryRequest);
      submit(pendingSummaryRequest);
      setPendingSummaryRequest(null);
    }
  }, [pendingSummaryRequest, retry.saveRequestParams, submit]);

  // ローディング状態
  const isChatLoading = isLoading;

  // 初期メッセージと会話履歴を統合
  const messages = [...parsedInitialMessages, ...conversationMessages];

  // クイックリプライ
  const currentQuickReplies = useQuickReplies({
    messages,
    isLoading: isChatLoading,
  });

  // objectからreportを取得（chat遷移時はストリーミング中もレポート非表示）
  const streamingReportData =
    object?.next_stage === "chat" ? null : convertPartialReport(object?.report);

  // チャットAPI送信のヘルパー（リクエストパラメータを保存）
  const submitChatRequest = (requestParams: ChatRequestParams) => {
    retry.saveRequestParams(requestParams); // 失敗時の自動リトライ用に保存
    submit(requestParams);
  };

  const submitChatMessage = (userMessageText: string) => {
    submitChatRequest({
      messages: buildMessagesForApi(
        parsedInitialMessages,
        conversationMessages,
        userMessageText
      ),
      interviewConfigId,
      previewPolicyId,
      previewToken,
    });
  };

  // メッセージ送信
  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    if (!hasText || isChatLoading || stage === "summary_complete") {
      return;
    }

    const userMessageText = message.text ?? "";
    const userMessageId = `user-${Date.now()}`;

    // ユーザーメッセージを会話履歴に追加
    setConversationMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        content: userMessageText,
      },
    ]);
    setInput("");

    submitChatMessage(userMessageText);
  };

  // 「終える」ボタン: chat なら要約へ、要約中なら締めへ（発言としては残さない）
  const handleEnd = () => {
    if (isChatLoading || stage === "summary_complete") return;
    submitChatRequest({
      messages: buildMessagesForApi(
        parsedInitialMessages,
        conversationMessages
      ),
      interviewConfigId,
      action: "end",
      previewPolicyId,
      previewToken,
    });
  };

  // クイックリプライを選択した時の処理
  const handleQuickReply = (reply: string) => {
    handleSubmit({ text: reply });
  };

  // レポート未生成時（hasReport=false）の「インタビューを続ける」用の再開処理。
  // handleSubmit は stage==="summary_complete" のとき送信をブロックするため専用にする。
  // 要約の段階で「戻りたい」と伝えると、戻れるかはサーバーが残りの発話数から決める。
  const handleResumeInterview = () => {
    if (isChatLoading) return;

    const resumeText = "もう少しインタビューを続けたいです。";
    setConversationMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: resumeText,
      },
    ]);
    setInput("");
    submitChatMessage(resumeText);
  };

  // 手動リトライ関数
  const handleRetry = () => {
    if (!retry.canRetry) return;

    // 保存されたリクエストパラメータでリトライ
    retry.manualRetry(submit);
  };

  return {
    // 状態
    input,
    setInput,
    stage,
    messages,
    isLoading: isChatLoading,
    error: error || retry.displayError,
    object,
    streamingReportData,
    currentQuickReplies,
    canRetry: retry.canRetry,

    // アクション
    handleSubmit,
    handleQuickReply,
    handleRetry,
    handleResumeInterview,
    handleEnd,
  };
}
