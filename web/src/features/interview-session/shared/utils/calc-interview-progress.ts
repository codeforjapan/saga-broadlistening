import type { InterviewStage } from "../schemas";

/** 進捗バーの上に出す段階のラベル。トピック名は出さない（#273） */
export const INTERVIEW_STAGE_LABELS = {
  intro: "はじめに",
  deepen: "もう少し聞かせて",
  summary: "まとめを確認",
} as const;

export type InterviewStageLabel =
  (typeof INTERVIEW_STAGE_LABELS)[keyof typeof INTERVIEW_STAGE_LABELS];

export interface InterviewProgress {
  percentage: number;
  stageLabel: InterviewStageLabel;
}

interface ProgressMessage {
  role: "assistant" | "user";
  questionId?: string | null;
}

/**
 * インタビューのプログレスバー進捗と段階のラベルを計算する純粋関数
 *
 * - summary_complete: 100%、「まとめを確認」
 * - summary: 90% 固定、「まとめを確認」
 * - chat: 完了質問数 / 全質問数 x 80%（残り20%はsummary+summary_complete）。
 *   最初の質問のあいだは「はじめに」、2問目からは「もう少し聞かせて」
 */
export function calcInterviewProgress(
  totalQuestions: number | undefined,
  stage: InterviewStage,
  messages: ProgressMessage[]
): InterviewProgress | null {
  if (!totalQuestions || totalQuestions === 0) return null;

  if (stage === "summary_complete") {
    return { percentage: 100, stageLabel: INTERVIEW_STAGE_LABELS.summary };
  }

  if (stage === "summary") {
    return { percentage: 90, stageLabel: INTERVIEW_STAGE_LABELS.summary };
  }

  // chat: 質問ベースの進捗
  const askedIds = new Set(
    messages
      .filter((m) => m.role === "assistant" && m.questionId)
      .map((m) => m.questionId as string)
  );
  // 現在聞いている質問は「完了」ではないので除外
  const completedCount = Math.max(0, askedIds.size - 1);
  // chatステージでは最大80%まで
  const percentage = Math.round((completedCount / totalQuestions) * 80);
  const stageLabel =
    askedIds.size <= 1
      ? INTERVIEW_STAGE_LABELS.intro
      : INTERVIEW_STAGE_LABELS.deepen;

  return { percentage, stageLabel };
}
