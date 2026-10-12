import "server-only";

import {
  buildInterviewTopics,
  computeTurnState,
} from "@mirai-gikai/shared/interview-prompts/turn-control";
import type { BillWithContent } from "@/features/bills/shared/types";
import {
  buildInterviewSystemPrompt,
  buildSummarySystemPrompt,
} from "@/features/interview-session/server/utils/build-interview-system-prompt";
import type { InterviewConfig } from "./get-interview-config";
import { getInterviewQuestions } from "./get-interview-questions";

export interface DisclosureData {
  subjectName: string;
  interviewConfig: InterviewConfig;
  systemPrompt: string;
  summaryPrompt: string;
}

/**
 * 情報開示ページに出すプロンプトを、実際の対話と同じ組み立てで生成する。
 *
 * 抽象テーマ型には施策がないため bill は null を受け付ける。
 * その場合プロンプトにも施策情報は含まれず、見出しにはテーマ名を出す。
 */
export async function loadDisclosureData(
  bill: BillWithContent | null,
  interviewConfig: NonNullable<InterviewConfig>
): Promise<DisclosureData> {
  const questions = await getInterviewQuestions(interviewConfig.id);

  // 最初の質問を聞いた直後の状況で組み立てる
  const topics = buildInterviewTopics(questions, interviewConfig, bill);
  const firstTopicId = topics[0]?.id ?? null;
  const systemPrompt = await buildInterviewSystemPrompt({
    bill,
    interviewConfig,
    topics,
    turnState: computeTurnState({
      topics,
      metas: [{ questionId: firstTopicId, budgetExempt: false }],
    }),
    piiNotice: null,
  });

  const summaryPrompt = await buildSummarySystemPrompt({
    bill,
    interviewConfig,
    messages: [],
  });

  return {
    subjectName: bill?.name ?? interviewConfig.name,
    interviewConfig,
    systemPrompt,
    summaryPrompt,
  };
}
