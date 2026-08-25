import type { InterviewStatistics } from "../types";

type RawStatistics = {
  total_sessions: number;
  completed_sessions: number;
  avg_rating: number | null;
  avg_total_content_richness: number | null;
  avg_message_count: number | null;
  median_duration_seconds: number | null;
  total_duration_seconds: number | null;
  public_by_user_count: number;
  published_count: number;
  feedback_irrelevant_questions: number;
  feedback_not_aligned: number;
  feedback_misunderstood: number;
  feedback_too_many_questions: number;
  feedback_other: number;
};

export function mapInterviewStatistics(
  raw: RawStatistics
): InterviewStatistics {
  const total = raw.total_sessions;
  return {
    totalSessions: total,
    completedSessions: raw.completed_sessions,
    completionRate: total > 0 ? (raw.completed_sessions / total) * 100 : 0,
    avgRating: raw.avg_rating,
    avgTotalContentRichness: raw.avg_total_content_richness,
    avgMessageCount: raw.avg_message_count,
    medianDurationSeconds: raw.median_duration_seconds,
    totalDurationSeconds: raw.total_duration_seconds ?? 0,
    publicByUserCount: raw.public_by_user_count,
    publishedCount: raw.published_count,
    publicRate:
      raw.completed_sessions > 0
        ? (raw.public_by_user_count / raw.completed_sessions) * 100
        : 0,
    feedbackIrrelevantQuestions: raw.feedback_irrelevant_questions,
    feedbackNotAligned: raw.feedback_not_aligned,
    feedbackMisunderstood: raw.feedback_misunderstood,
    feedbackTooManyQuestions: raw.feedback_too_many_questions,
    feedbackOther: raw.feedback_other,
  };
}
