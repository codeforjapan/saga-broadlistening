import type { InterviewQuestion, InterviewQuestionInput } from "../types";

/**
 * 保存済みの質問を、編集・保存用の入力に戻す。
 * テンプレートの値（種類・予算・必須）は職員に見せないが、保存し直しても失わないよう引き継ぐ。
 */
export function toQuestionInput(
  question: InterviewQuestion
): InterviewQuestionInput {
  return {
    question: question.question,
    hint: question.hint || undefined,
    quick_replies: question.quick_replies || undefined,
    step_key: question.step_key,
    step_kind: question.step_kind,
    turn_budget: question.turn_budget,
    required: question.required,
  };
}
