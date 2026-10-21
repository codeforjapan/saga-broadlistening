import "server-only";

import {
  buildTurnTopics,
  computeTurnState,
} from "@mirai-gikai/shared/interview-prompts/turn-control";
import type { BillWithContent } from "@/features/bills/shared/types";
import { withRelatedPolicies } from "@/features/interview-session/server/loaders/with-related-policies";
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
  // 対話と同じく、他の紐づく施策も並べる
  const [questions, promptBill] = await Promise.all([
    getInterviewQuestions(interviewConfig.id),
    withRelatedPolicies(bill, interviewConfig.id),
  ]);

  // 最初の質問を聞いた直後の状況で組み立てる
  const topics = buildTurnTopics(questions);
  const systemPrompt = await buildInterviewSystemPrompt({
    bill: promptBill,
    interviewConfig,
    topics,
    turnState: computeTurnState({
      topics,
      metas: [{ questionId: topics[0]?.id ?? null, stage: "chat" }],
    }),
  });

  const summaryPrompt = await buildSummarySystemPrompt({
    bill: promptBill,
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
