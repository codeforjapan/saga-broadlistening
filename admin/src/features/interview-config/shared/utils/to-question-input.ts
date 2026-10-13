import type { InterviewQuestion, InterviewQuestionInput } from "../types";

/**
 * 保存済みの質問を、編集・保存用の入力に戻す。
 * テンプレートの発話予算は職員に見せないが、保存し直しても失わないよう引き継ぐ。
 */
export function toQuestionInput(
  question: InterviewQuestion
): InterviewQuestionInput {
  return {
    question: question.question,
    follow_up_guide: question.follow_up_guide || undefined,
    quick_replies: question.quick_replies || undefined,
    turn_budget: question.turn_budget,
  };
}
