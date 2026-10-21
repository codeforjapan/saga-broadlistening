import "server-only";

import {
  buildTurnTopics,
  computeTurnState,
} from "@mirai-gikai/shared/interview-prompts/turn-control";
import { buildPublishedInterviewPrompt } from "@mirai-gikai/shared/interview-prompts/published";
import type {
  InterviewConfig,
  InterviewQuestion,
  PromptBillInput,
} from "@mirai-gikai/shared/interview-prompts/types";

export { buildPublishedSummaryPrompt as buildSummarySystemPrompt } from "@mirai-gikai/shared/interview-prompts/published";

/**
 * 対話用のシステムプロンプトを組み立てる。
 *
 * 新しいプロンプトはターン制御の状態（いまの話題・残りの発話）を受け取る。
 * 呼び出し側がサーバー側のターン制御に切り替わるまで（#193）、聞いた質問の ID から状態を作る。
 */
export async function buildInterviewSystemPrompt({
  bill,
  interviewConfig,
  questions,
  askedQuestionIds,
}: {
  bill: PromptBillInput;
  interviewConfig: InterviewConfig;
  questions: InterviewQuestion[];
  askedQuestionIds: Set<string>;
  currentStage?: string;
  remainingMinutes?: number | null;
}): Promise<string> {
  const topics = buildTurnTopics(questions);
  const metas = topics
    .filter((topic) => askedQuestionIds.has(topic.id))
    .map((topic) => ({ questionId: topic.id, stage: "chat" as const }));
  return buildPublishedInterviewPrompt({
    bill,
    interviewConfig,
    topics,
    turnState: computeTurnState({ topics, metas }),
  });
}
