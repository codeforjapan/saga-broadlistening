import "server-only";

import type { BillWithContent } from "@/features/bills/shared/types";
import { buildInterviewSystemPrompt } from "@/features/interview-session/server/utils/build-interview-system-prompt";
import { buildSummarySystemPrompt } from "@/features/interview-session/shared/utils/build-summary-system-prompt";
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

  const systemPrompt = buildInterviewSystemPrompt({
    bill,
    interviewConfig,
    questions,
    currentStage: "chat",
    askedQuestionIds: new Set(),
    remainingMinutes: null,
  });

  const summaryPrompt = buildSummarySystemPrompt({
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
