import {
  isPublicReportVisible,
  type OpinionReviewStatus,
  shouldDisplayPublicReports,
} from "@mirai-gikai/shared/report-publication/auto-publish";

export type RawPublicInterviewReport = {
  id: string;
  role_title: string | null;
  summary: string | null;
  final_text: string;
  total_content_richness: number | null;
  created_at: string;
};

export type PublicInterviewReportDisplay = RawPublicInterviewReport;

/** 意見に紐づくセッション（意見募集・施策まで辿れる形） */
export type PublicReportSessionLike = {
  started_at: string;
  completed_at: string | null;
  interview_config_id: string;
  interview_configs: {
    policies_interview_configs: { policy_id: string }[];
  } | null;
} | null;

type BillContentLike = { title: string };

export function mapPublicInterviewReports(
  rawReports: RawPublicInterviewReport[]
): PublicInterviewReportDisplay[] {
  return rawReports.map((report) => ({
    id: report.id,
    role_title: report.role_title,
    summary: report.summary,
    final_text: report.final_text,
    total_content_richness: report.total_content_richness,
    created_at: report.created_at,
  }));
}

export function buildPublicReportsPage(
  rawReports: RawPublicInterviewReport[],
  pageSize: number
) {
  const hasMore = rawReports.length > pageSize;
  return {
    reports: mapPublicInterviewReports(
      hasMore ? rawReports.slice(0, pageSize) : rawReports
    ),
    hasMore,
  };
}

/**
 * 意見のセッションから施策IDを取り出す。
 * 施策と意見募集は多対多のため、最初の1件を採用する
 * （複数施策表示の UI 対応は Epic #8 のフォローアップ）。
 */
export function getBillIdFromPublicReportSession(
  session: PublicReportSessionLike
) {
  return (
    session?.interview_configs?.policies_interview_configs?.[0]?.policy_id ??
    null
  );
}

export function selectPrimaryBillContent<T extends BillContentLike>(
  billContents: T | T[] | null
) {
  if (!billContents) return null;
  return Array.isArray(billContents) ? (billContents[0] ?? null) : billContents;
}

export function countUserMessageCharacters(
  messages: { role: string; content: string }[]
) {
  return messages
    .filter((message) => message.role === "user")
    .reduce((sum, message) => sum + message.content.length, 0);
}

/**
 * 公開意見が第三者に表示できるか（公開状態 × k-匿名性ゲート）。
 * 判定ロジックの正準は @mirai-gikai/shared（web/admin 共有）。
 */
export function isPublicOpinionVisible({
  reviewStatus,
  publicOpinionCount,
}: {
  reviewStatus: OpinionReviewStatus;
  publicOpinionCount: number;
}) {
  return isPublicReportVisible({
    reviewStatus,
    publicReportCount: publicOpinionCount,
  });
}

/** 公開意見数がk-匿名性のしきい値に達しているか。 */
export function shouldDisplayPublicOpinions(publicOpinionCount: number) {
  return shouldDisplayPublicReports(publicOpinionCount);
}

export function canViewReportWithMessages({
  isOwner,
  reviewStatus,
  publicOpinionCount,
}: {
  isOwner: boolean;
  reviewStatus: OpinionReviewStatus;
  publicOpinionCount: number;
}) {
  if (isOwner) return true;
  return isPublicOpinionVisible({ reviewStatus, publicOpinionCount });
}
