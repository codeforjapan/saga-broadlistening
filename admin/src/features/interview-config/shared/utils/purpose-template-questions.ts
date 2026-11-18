import { getPurposeTemplateSteps } from "@mirai-gikai/shared/interview-prompts/purpose-types/registry";
import type {
  InterviewSubjectKind,
  PurposeType,
} from "@mirai-gikai/shared/interview-prompts/purpose-types/types";
import type { InterviewQuestionInput } from "../types";

/**
 * 目的（5型）×対象（施策／テーマ）の質問テンプレートを、保存用の質問配列にする。
 * 観点・選択肢がない話題は未指定にする（保存時の検証は null を受け付けないため）。
 */
export function buildPurposeTemplateQuestions(
  purposeType: PurposeType,
  subject: InterviewSubjectKind
): InterviewQuestionInput[] {
  return getPurposeTemplateSteps(purposeType, subject).map((step) => ({
    question: step.question,
    follow_up_guide: step.follow_up_guide ?? undefined,
    quick_replies:
      step.quick_replies.length > 0 ? [...step.quick_replies] : undefined,
  }));
}
