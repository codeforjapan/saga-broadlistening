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
    // テンプレートの値は職員が文言を直してもそのまま引き継ぐ（未指定は DB の既定値）
    step_key: question.step_key ?? null,
    ...(question.step_kind ? { step_kind: question.step_kind } : {}),
    ...(question.turn_budget ? { turn_budget: question.turn_budget } : {}),
    ...(question.required !== undefined ? { required: question.required } : {}),
  }));
}
