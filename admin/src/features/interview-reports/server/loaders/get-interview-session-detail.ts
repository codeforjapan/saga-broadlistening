import type {
  InterviewSessionDetail,
  OpinionSegment,
  ReactionCounts,
} from "../../shared/types";
import {
  findFeedbackTagsBySessionId,
  findInterviewMessagesBySessionId,
  findInterviewReportBySessionId,
  findInterviewSessionById,
  findOpinionSegmentsByOpinionId,
  findReactionCountsByReportId,
} from "../repositories/interview-report-repository";

/** 取得に失敗しても画面は出したいので、フォールバック値に倒して続行する。 */
function fallbackOn<T>(label: string, value: T) {
  return (error: unknown): T => {
    console.error(label, error);
    return value;
  };
}

export async function getInterviewSessionDetail(
  sessionId: string
): Promise<InterviewSessionDetail | null> {
  // セッション・レポート・メッセージ・タグは互いに独立なので並列で引く。
  const [session, report, messages, feedbackTags] = await Promise.all([
    findInterviewSessionById(sessionId).catch(
      fallbackOn("Failed to fetch interview session:", null)
    ),
    findInterviewReportBySessionId(sessionId).catch(
      fallbackOn("Failed to fetch interview report:", null)
    ),
    findInterviewMessagesBySessionId(sessionId).catch(
      fallbackOn("Failed to fetch interview messages:", [])
    ),
    findFeedbackTagsBySessionId(sessionId).catch(
      fallbackOn("Failed to fetch feedback tags:", [] as string[])
    ),
  ]);

  if (!session) {
    return null;
  }

  // リアクション数と論点は意見IDが要るので、レポートが引けた後に並列で引く。
  const [reactionCounts, opinionSegments] = report
    ? await Promise.all([
        findReactionCountsByReportId(report.id).catch(
          fallbackOn("Failed to fetch reaction counts:", null)
        ),
        findOpinionSegmentsByOpinionId(report.id).catch(
          fallbackOn("Failed to fetch opinion segments:", [])
        ),
      ])
    : [null as ReactionCounts | null, [] as OpinionSegment[]];

  return {
    ...session,
    interview_report: report,
    opinion_segments: opinionSegments,
    interview_messages: messages,
    reaction_counts: reactionCounts,
    feedback_tags: feedbackTags,
  };
}
