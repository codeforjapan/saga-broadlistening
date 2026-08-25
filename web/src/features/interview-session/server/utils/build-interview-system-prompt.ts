import "server-only";

import type { BillWithContent } from "@/features/bills/shared/types";
import type { getInterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import type { getInterviewQuestions } from "@/features/interview-config/server/loaders/get-interview-questions";
import { buildLoopModeSystemPrompt } from "../../shared/utils/interview-logic/loop-mode";

/**
 * インタビュー用システムプロンプトを構築
 *
 * Epic #54 で interview_configs.mode が廃止され、対話モードの概念ごとなくなったため
 * loop の builder を直接呼ぶ。
 */
export function buildInterviewSystemPrompt({
  bill,
  interviewConfig,
  questions,
  nextQuestionId,
  currentStage,
  askedQuestionIds,
  remainingMinutes,
}: {
  bill: BillWithContent | null;
  interviewConfig: Awaited<ReturnType<typeof getInterviewConfig>>;
  questions: Awaited<ReturnType<typeof getInterviewQuestions>>;
  nextQuestionId?: string;
  currentStage: "chat" | "summary" | "summary_complete";
  askedQuestionIds: Set<string>;
  remainingMinutes?: number | null;
}): string {
  return buildLoopModeSystemPrompt({
    bill,
    interviewConfig,
    questions,
    nextQuestionId,
    currentStage,
    askedQuestionIds,
    remainingMinutes,
  });
}

export { buildSummarySystemPrompt } from "../../shared/utils/build-summary-system-prompt";
