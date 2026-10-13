import type { InterviewQuestion, InterviewQuestionInput } from "../types";

/**
 * 保存済みの質問を、編集・保存用の入力に戻す。
 */
export function toQuestionInput(
  question: InterviewQuestion
): InterviewQuestionInput {
  return {
    question: question.question,
    follow_up_guide: question.follow_up_guide || undefined,
    quick_replies: question.quick_replies || undefined,
  };
}
