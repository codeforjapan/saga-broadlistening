import { DEFAULT_CONSULTATION_DESK } from "@mirai-gikai/shared/interview-prompts/constants";
import { buildPublicationText } from "@mirai-gikai/shared/interview-prompts/subject-section";
import type { InterviewConfig } from "@mirai-gikai/shared/interview-prompts/types";

/** チャットの前に出す固定カードの中身（LLM は生成しない） */
export interface InterviewBriefing {
  title: string;
  /** 何について聞くか（施策名、またはテーマの説明） */
  subject: string | null;
  opinionFocus: string | null;
  decidedMatters: string | null;
  /** 「〜でお知らせします」 */
  publicationText: string;
  /** 話題の数 */
  topicCount: number;
  estimatedDuration: number | null;
  consultationDesk: string;
}

export function buildInterviewBriefing({
  interviewConfig,
  billName,
  questions,
  consultationDesk = DEFAULT_CONSULTATION_DESK,
}: {
  interviewConfig: NonNullable<InterviewConfig> & {
    name: string;
    estimated_duration?: number | null;
  };
  /** 紐づく施策の名前。抽象テーマ型では null */
  billName: string | null;
  questions: readonly unknown[];
  consultationDesk?: string;
}): InterviewBriefing {
  return {
    title: interviewConfig.name,
    subject: billName ?? (interviewConfig.description?.trim() || null),
    opinionFocus: interviewConfig.opinion_focus?.trim() || null,
    decidedMatters: billName
      ? interviewConfig.decided_matters?.trim() || null
      : null,
    publicationText: `${buildPublicationText(interviewConfig)}お知らせします`,
    topicCount: questions.length,
    estimatedDuration: interviewConfig.estimated_duration ?? null,
    consultationDesk,
  };
}
