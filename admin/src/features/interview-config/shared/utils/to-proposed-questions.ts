import type { z } from "zod";
import type { configGenerationResponseSchema } from "../schemas";
import type { InterviewQuestionInput } from "../types";

/** AIの提案に含まれる質問。任意項目は null で返ってくることがある */
type ProposedQuestion = NonNullable<
  z.infer<typeof configGenerationResponseSchema>["questions"]
>[number];

/**
 * AIが提案した質問を、フォームと保存で扱う形に整える。
 *
 * 生成スキーマでは観点・クイックリプライを null で返せるが、
 * 保存時の検証（interviewQuestionSchema）は null を受け付けないため、未設定に揃える。
 * 質問文が空（空白だけを含む）の要素は確定させても意味がないので落とす。
 */
export function toProposedQuestions(
  questions: ProposedQuestion[]
): InterviewQuestionInput[] {
  return questions.flatMap((q) =>
    q.question.trim()
      ? [
          {
            question: q.question,
            follow_up_guide: q.follow_up_guide ?? undefined,
            quick_replies: q.quick_replies ?? undefined,
          },
        ]
      : []
  );
}
