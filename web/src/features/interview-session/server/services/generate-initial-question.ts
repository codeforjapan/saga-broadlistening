import "server-only";

import { propagateAttributes } from "@langfuse/tracing";
import { buildPublishedInitialPrompt } from "@mirai-gikai/shared/interview-prompts/published";
import { buildTurnTopics } from "@mirai-gikai/shared/interview-prompts/turn-control";
import { buildInitialTurnContent } from "@mirai-gikai/shared/interview-prompts/turn-records";
import { generateText, type LanguageModel, Output } from "ai";
import type { BillWithContent } from "@/features/bills/shared/types";
import {
  isWithinDailyCostLimit,
  recordChatUsage,
} from "@/features/chat/server/services/cost-tracker";
import type { InterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { getInterviewQuestions } from "@/features/interview-config/server/loaders/get-interview-questions";
import { getMeteredAiModel } from "@/lib/ai/get-metered-ai-model";
import { env } from "@/lib/env";
import { interviewInitialSchema } from "../../shared/schemas";
import type { InterviewMessage } from "../../shared/types";
import { createInterviewMessage } from "../repositories/interview-session-repository";

const INITIAL_QUESTION_FUNCTION_ID = "interview-initial-question";

type GenerateInitialQuestionParams = {
  sessionId: string;
  interviewConfig: NonNullable<InterviewConfig>;
  /** 紐づく施策。抽象テーマ型では null */
  bill: BillWithContent | null;
  userId: string;
  deps?: GenerateQuestionDeps;
};

/** テスト時にモック注入するための外部依存 */
export type GenerateQuestionDeps = {
  model?: LanguageModel;
};

/**
 * インタビューの最初の質問を生成して保存
 */
export async function generateInitialQuestion({
  sessionId,
  interviewConfig,
  bill,
  userId,
  deps,
}: GenerateInitialQuestionParams): Promise<InterviewMessage | null> {
  try {
    // 日次コスト制限チェック（fail-closed: エラー時も生成をブロック）は
    // 質問の取得と並べて走らせる
    const [questions, isWithinLimit] = await Promise.all([
      getInterviewQuestions(interviewConfig.id),
      isWithinDailyCostLimit(userId, env.chat.dailyUserCostLimitUsd).catch(
        (error) => {
          console.error("Cost limit check error:", error);
          return false;
        }
      ),
    ]);
    if (!isWithinLimit) {
      console.error("Daily cost limit reached for initial question");
      return null;
    }

    // 初回は人物像＋初回指示だけで生成する（全体像1文＋最初の質問）。
    // 本番とシミュレータで同じ組み立てを使う
    const topics = buildTurnTopics(questions);
    const initialPrompt = await buildPublishedInitialPrompt({ topics });

    // メッセージ履歴なしで最初の質問を生成（構造化出力）
    const occurredAt = new Date().toISOString();
    const {
      model,
      modelId: modelName,
      providerOptions,
    } = getMeteredAiModel(
      "interview",
      deps?.model ?? (interviewConfig.chat_model || undefined)
    );
    // 初回質問も以降のターンと同じセッションに束ねる
    const result = await propagateAttributes(
      {
        traceName: INITIAL_QUESTION_FUNCTION_ID,
        sessionId,
        userId,
      },
      () =>
        generateText({
          model,
          providerOptions,
          prompt: initialPrompt,
          output: Output.object({ schema: interviewInitialSchema }),
          experimental_telemetry: {
            isEnabled: true,
            functionId: INITIAL_QUESTION_FUNCTION_ID,
            // 計装のメタデータは文字列しか受け付けないため、施策なしは空文字で表す
            metadata: {
              billId: bill?.id ?? "",
            },
          },
        })
    );

    // LLM利用コストを記録
    try {
      await recordChatUsage({
        userId,
        sessionId,
        promptName: INITIAL_QUESTION_FUNCTION_ID,
        model: modelName,
        usage: result.usage,
        occurredAt,
        metadata: {
          pageType: "interview",
          billId: bill?.id ?? null,
          finishReason: result.finishReason ?? null,
          stepCount: 0,
        },
      });
    } catch (usageError) {
      console.error("Failed to record interview usage:", usageError);
    }

    const generatedText = result.text;

    if (!generatedText?.trim()) {
      console.error("Generated question is empty");
      return null;
    }

    // question_id は最初の話題、選択肢ボタンを付けて保存する
    const content = buildInitialTurnContent({
      rawText: generatedText,
      firstTopic: topics[0] ?? null,
    });

    // 生成した質問を保存
    return await createInterviewMessage({
      sessionId,
      role: "assistant",
      content,
    });
  } catch (error) {
    console.error("Failed to generate initial question:", error);
    return null;
  }
}
