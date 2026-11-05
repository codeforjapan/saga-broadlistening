import type { InterviewQuestionInput } from "../types";

/** DB の行やAIの提案に含まれる質問。任意項目は null で来ることがある */
type NullableQuestion = {
  question: string;
  follow_up_guide?: string | null;
  quick_replies?: string[] | null;
};

/**
 * 質問をフォームと保存で扱う形に整える。
 * 保存時の検証（interviewQuestionSchema）は null を受け付けないため、未設定に揃える。
 */
export function toQuestionInput(q: NullableQuestion): InterviewQuestionInput {
  return {
    question: q.question,
    follow_up_guide: q.follow_up_guide ?? undefined,
    quick_replies: q.quick_replies ?? undefined,
  };
}

/**
 * AIが提案した質問を、フォームと保存で扱う形に整える。
 * 生成スキーマでは観点・クイックリプライを null で返せるので未設定に揃え、
 * 質問文が空（空白だけを含む）の要素は確定させても意味がないので落とす。
 */
export function toProposedQuestions(
  questions: NullableQuestion[]
): InterviewQuestionInput[] {
  return questions.flatMap((q) =>
    q.question.trim() ? [toQuestionInput(q)] : []
  );
}
