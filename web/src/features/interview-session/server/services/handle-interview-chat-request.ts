import "server-only";

import { propagateAttributes } from "@langfuse/tracing";
import { collectAssistantTurnMetas } from "@mirai-gikai/shared/interview-prompts/assistant-message";
import {
  buildTurnTopics,
  computeSummaryState,
  computeTurnState,
  decideSummaryEntry,
  resolveSummaryPhase,
} from "@mirai-gikai/shared/interview-prompts/turn-control";
import {
  buildChatTurnRecord,
  buildSummaryTurnRecord,
  type TurnRecord,
} from "@mirai-gikai/shared/interview-prompts/turn-records";
import {
  convertToModelMessages,
  type LanguageModel,
  type LanguageModelUsage,
  Output,
  streamText,
} from "ai";
import {
  isWithinDailyCostLimit,
  recordChatUsage,
} from "@/features/chat/server/services/cost-tracker";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { getInterviewQuestions } from "@/features/interview-config/server/loaders/get-interview-questions";
import { getInterviewMessages } from "@/features/interview-session/server/loaders/get-interview-messages";
import { getInterviewSession } from "@/features/interview-session/server/loaders/get-interview-session";
import {
  type InterviewChatContext,
  resolveInterviewChatContext,
} from "@/features/interview-session/server/loaders/resolve-interview-chat-context";
import {
  interviewChatTextSchema,
  interviewChatWithReportSchema,
} from "@/features/interview-session/shared/schemas";
import type {
  InterviewChatRequestParams,
  InterviewMessage,
  InterviewSession,
} from "@/features/interview-session/shared/types";
import { getMeteredAiModel } from "@/lib/ai/get-metered-ai-model";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { injectJsonFieldsAsync } from "@/lib/stream/inject-json-fields";
import {
  InterviewAlreadyCompletedError,
  InterviewSessionNotStartedError,
} from "../../shared/types/errors";
import { buildSummaryModelMessages } from "../../shared/utils/build-summary-model-messages";
import { ensureTrailingUserMessage } from "../../shared/utils/ensure-trailing-user-message";
import { evaluateInterviewParticipation } from "../../shared/utils/evaluate-interview-participation";
import { mergeMessagesWithIds } from "../../shared/utils/merge-messages-with-ids";
import { updateInterviewSessionStage } from "../repositories/interview-session-repository";
import {
  buildInterviewSystemPrompt,
  buildSummarySystemPrompt,
} from "../utils/build-interview-system-prompt";
import {
  InterviewParticipationDeniedError,
  loadExternalIdentities,
  type ParticipationDeps,
} from "./resolve-interview-participation";
import { saveInterviewMessage } from "./save-interview-message";

/** テスト時にモック注入するための外部依存 */
export type InterviewChatDeps = ParticipationDeps & {
  chatModel?: LanguageModel;
  summaryModel?: LanguageModel;
  /** テスト時に認証をバイパスするためのセッション取得関数 */
  getSession?: (configId: string) => Promise<InterviewSession | null>;
  /** テスト時に認証をバイパスするためのメッセージ取得関数 */
  getMessages?: (sessionId: string) => Promise<InterviewMessage[]>;
  /** テスト時にnext/cache・cookies依存をバイパスするためのコンテキスト取得関数 */
  resolveContext?: (
    interviewConfigId: string
  ) => Promise<InterviewChatContext | null>;
};

/**
 * インタビューチャットリクエストを処理してストリーミングレスポンスを返す。
 *
 * 呼び出しは1ターン1回。ステージ（chat / summary）と話題ごとの発話の上限はサーバーが決め、
 * LLM は本文と少数の制御フラグだけを返す。LLM の出力を読み切った後に、
 * 次のステージ・選択肢ボタン・正規化した question_id をストリームの末尾へ注入する。
 */
export async function handleInterviewChatRequest({
  messages,
  interviewConfigId,
  action,
  isRetry = false,
  previewPolicyId,
  previewToken,
  userId,
  deps,
}: InterviewChatRequestParams & {
  userId: string;
  deps?: InterviewChatDeps;
}) {
  // TTFB短縮のため、互いに依存しないDBアクセスは並列実行する。
  // 日次コスト制限チェック（fail-closed: エラー時もリクエストをブロック）と
  // 意見募集・施策の解決（テスト時はdeps経由でNext.js依存をバイパス）
  // 外部IDの解決（参加判定とセッション記録に使う）も userId だけで始められる
  const [isWithinLimit, context, identities] = await Promise.all([
    isWithinDailyCostLimit(userId, env.chat.dailyUserCostLimitUsd),
    deps?.resolveContext
      ? deps.resolveContext(interviewConfigId)
      : resolveInterviewChatContext({
          interviewConfigId,
          previewPolicyId,
          previewToken,
        }),
    loadExternalIdentities(userId, deps),
  ]);
  if (!isWithinLimit) {
    throw new ChatError(ChatErrorCode.DAILY_COST_LIMIT_REACHED);
  }

  if (!context) {
    throw new Error("Interview config not found");
  }

  const { interviewConfig, bill, policyId, isPreview } = context;

  // 参加条件の判定（プレビューは職員の確認用なので問わない）
  const participation = evaluateInterviewParticipation({
    rule: interviewConfig,
    identities,
    isPreview,
  });
  if (!participation.allowed) {
    throw new InterviewParticipationDeniedError();
  }

  // 最新のメッセージを取得
  const lastMessage = messages[messages.length - 1];
  const endButton = action === "end";

  // 「セッション取得→ユーザーメッセージ保存→全メッセージ取得」は順序依存があるため
  // チェーンとして実行する（テスト時はdeps経由で認証をバイパス）
  const loadSessionAndMessages = async () => {
    const getSessionFn = deps?.getSession ?? getInterviewSession;
    const getMessagesFn = deps?.getMessages ?? getInterviewMessages;
    // セッションは開始画面の同意と同時に作る（#158）。ここでは作らない
    const session = await getSessionFn(interviewConfig.id);
    if (!session) {
      throw new InterviewSessionNotStartedError();
    }
    if (session.stage === "summary_complete") {
      throw new InterviewAlreadyCompletedError();
    }

    // ユーザーメッセージを保存（保存後に取得することで dbMessages に最新を含める）。
    // 「終える」ボタンは発言ではないので保存しない
    if (
      !endButton &&
      lastMessage?.role === "user" &&
      lastMessage.content.trim()
    ) {
      await saveInterviewMessage({
        sessionId: session.id,
        role: "user",
        content: lastMessage.content,
        isRetry,
      });
    }

    const dbMessages = await getMessagesFn(session.id);
    return { session, dbMessages };
  };

  // 独立した事前定義質問の取得とセッション系チェーンを並列実行
  const [questions, { session, dbMessages }] = await Promise.all([
    getInterviewQuestions(interviewConfig.id),
    loadSessionAndMessages(),
  ]);

  const topics = buildTurnTopics(questions);
  const metas = collectAssistantTurnMetas(dbMessages);

  const generationParams = {
    messages,
    sessionId: session.id,
    userId,
    policyId,
    chatModel: deps?.chatModel,
    summaryModel: deps?.summaryModel,
    configChatModel: interviewConfig.chat_model,
  };

  // 生成前のステージ判定。要約へ入るときは、ステージの更新とプロンプトの組み立てを並べて走らせる
  let enteringSummary: Promise<void> | null = null;
  if (session.stage === "chat") {
    const state = computeTurnState({ topics, metas });
    if (!decideSummaryEntry({ state, endButton })) {
      const systemPrompt = await buildInterviewSystemPrompt({
        bill,
        interviewConfig,
        topics,
        turnState: state,
      });
      logger.debug("System Prompt:", systemPrompt);
      return generateStreamingResponse({
        ...generationParams,
        systemPrompt,
        isSummaryPhase: false,
        buildRecord: (rawText) => buildChatTurnRecord({ rawText, state }),
      });
    }
    enteringSummary = updateInterviewSessionStage(session.id, {
      stage: "summary",
    });
  }

  // summary: 場面は発話の記録から決める。「終える」ボタンが要約の段階で押されたら締める
  const summaryState = computeSummaryState({
    topics,
    metas,
    phase: resolveSummaryPhase({ sessionStage: session.stage, metas }),
    forceClose: endButton && session.stage === "summary",
  });
  const [systemPrompt] = await Promise.all([
    buildSummarySystemPrompt({
      bill,
      interviewConfig,
      messages: mergeMessagesWithIds(messages, dbMessages),
      summaryState,
    }),
    enteringSummary,
  ]);
  logger.debug("System Prompt:", systemPrompt);
  return generateStreamingResponse({
    ...generationParams,
    systemPrompt,
    isSummaryPhase: true,
    buildRecord: (rawText) => buildSummaryTurnRecord({ rawText, summaryState }),
  });
}

/**
 * ストリーミングレスポンスを生成する。
 *
 * LLM の出力（本文と制御フラグ）はそのまま流し、読み切った後に buildRecord で
 * 保存内容・ステージ・選択肢ボタンを決めて、ストリームの末尾へ注入する。
 */
async function generateStreamingResponse({
  systemPrompt,
  messages,
  sessionId,
  userId,
  policyId,
  isSummaryPhase,
  chatModel,
  summaryModel,
  configChatModel,
  buildRecord,
}: {
  systemPrompt: string;
  messages: { role: string; content: string }[];
  sessionId: string;
  userId: string;
  /** 紐づく施策ID。抽象テーマ型では null */
  policyId: string | null;
  isSummaryPhase: boolean;
  chatModel?: LanguageModel;
  summaryModel?: LanguageModel;
  configChatModel?: string | null;
  /** LLM の出力全文から、保存内容と注入する値を作る */
  buildRecord: (rawText: string) => TurnRecord;
}) {
  const {
    model,
    modelId: modelName,
    providerOptions,
  } = getMeteredAiModel(
    isSummaryPhase ? "summary" : "interview",
    (isSummaryPhase ? summaryModel : chatModel) ??
      (configChatModel || undefined)
  );
  const stage = isSummaryPhase ? "summary" : "chat";
  const functionId = isSummaryPhase ? "interview-summary" : "interview-chat";

  // 末尾に注入する値。onFinish で保存まで終えてから確定する
  // どの経路（保存の完了・生成の失敗・中断）でも必ず解決し、ストリームの末尾を待たせ続けない
  let resolveRecord: (record: TurnRecord | null) => void = () => {};
  const recordPromise = new Promise<TurnRecord | null>((resolve) => {
    resolveRecord = resolve;
  });

  const handleError = (error: unknown) => {
    console.error("LLM generation error:", error);
    resolveRecord(null);
    throw new Error(
      `LLM generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  };

  const handleFinish = async (event: {
    text?: string;
    totalUsage: LanguageModelUsage;
    providerMetadata?: unknown;
  }) => {
    let record: TurnRecord | null = null;
    try {
      if (event.text) {
        record = buildRecord(event.text);
        // 保存とステージ更新を終えてからストリームを閉じる。閉じた直後に届く
        // 次のリクエスト（続けての要約・すばやい選択肢）が古い状態を読まないため
        await Promise.all([
          saveInterviewMessage({
            sessionId,
            role: "assistant",
            content: record.content,
          }),
          record.sessionUpdate &&
            updateInterviewSessionStage(sessionId, record.sessionUpdate),
        ]);
      }
    } catch (err) {
      console.error("Failed to save interview turn:", { sessionId, err });
    } finally {
      resolveRecord(record);
    }

    // LLM利用コストを記録
    try {
      const providerCost = extractGatewayCost(event);
      await recordChatUsage({
        userId,
        sessionId,
        promptName: functionId,
        model: modelName,
        usage: event.totalUsage,
        costUsd: providerCost,
        metadata: {
          pageType: "interview",
          billId: policyId,
          finishReason: null,
          stepCount: 0,
        },
      });
    } catch (usageError) {
      console.error("Failed to record interview usage:", usageError);
    }
  };

  // Anthropic 系などは会話が user メッセージで終わる必要がある。
  // summary フェーズは会話履歴全文をシステムプロンプトに埋め込んでいるため、
  // 入力トークンの二重送信を避けて末尾の user メッセージ1件のみをモデルへ渡す
  // （末尾が assistant の場合はレポート作成を促す合成 user メッセージを補う）。
  // chat フェーズで末尾が assistant の場合は続行を促す user メッセージを補う。
  // いずれの合成メッセージも DB には保存しない。
  const modelMessages = isSummaryPhase
    ? buildSummaryModelMessages(messages)
    : ensureTrailingUserMessage(messages);

  const uiMessages = modelMessages.map((message) => ({
    role: message.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: message.content }],
  }));

  const streamParams = {
    model,
    providerOptions,
    system: systemPrompt,
    messages: await convertToModelMessages(uiMessages),
    onError: handleError,
    onAbort: () => resolveRecord(null),
    onFinish: handleFinish,
    experimental_telemetry: {
      isEnabled: true as const,
      functionId,
      // 計装のメタデータは文字列しか受け付けないため、施策なしは空文字で表す
      metadata: { billId: policyId ?? "", stage },
    },
  } as const;

  try {
    // 同一インタビューの複数ターンを1セッションとして束ね、利用者も紐付ける。
    // OTel のスパンコンテキスト経由で伝播するため、ここより内側のLLM呼び出しは
    // すべて同じトレース属性を引き継ぐ。
    return await propagateAttributes(
      { traceName: functionId, sessionId, userId },
      () => {
        const textStream = isSummaryPhase
          ? streamText({
              ...streamParams,
              output: Output.object({ schema: interviewChatWithReportSchema }),
            }).textStream
          : streamText({
              ...streamParams,
              output: Output.object({ schema: interviewChatTextSchema }),
            }).textStream;

        const body = injectJsonFieldsAsync(
          textStream,
          async () => (await recordPromise)?.injected ?? {}
        );
        return new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    );
  } catch (error) {
    handleError(error);
    throw error;
  }
}

function extractGatewayCost(event: {
  providerMetadata?: unknown;
}): number | undefined {
  const providerMetadata = event.providerMetadata;
  if (!providerMetadata || typeof providerMetadata !== "object") {
    return undefined;
  }

  const gatewayCost = (
    providerMetadata as {
      gateway?: { cost?: unknown };
    }
  ).gateway?.cost;

  const numericCost = Number(gatewayCost);

  return Number.isFinite(numericCost) ? numericCost : undefined;
}
