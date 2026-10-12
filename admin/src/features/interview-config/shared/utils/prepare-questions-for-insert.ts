import { DEFAULT_TURN_BUDGET } from "@mirai-gikai/shared/interview-prompts/constants";
import type { InterviewQuestionInput } from "../types";

/**
 * バリデーション済み質問配列にconfig_idとquestion_order(1始まり)を付加して
 * DB挿入用のデータに変換する
 */
export function prepareQuestionsForInsert(
  questions: InterviewQuestionInput[],
  interviewConfigId: string
) {
  return questions.map((question, index) => ({
    interview_config_id: interviewConfigId,
    question: question.question,
    hint: question.hint || null,
    quick_replies: question.quick_replies || null,
    question_order: index + 1,
    // テンプレートの値は職員が文言を直してもそのまま引き継ぐ。
    // 一括 insert では行ごとにキーが欠けると NULL が入るため、既定値も明示する
    step_key: question.step_key ?? null,
    step_kind: question.step_kind ?? "episode",
    turn_budget: question.turn_budget ?? DEFAULT_TURN_BUDGET,
    required: question.required ?? true,
  }));
}
