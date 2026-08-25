import {
  isPublicReportVisible,
  type OpinionReviewStatus,
} from "@mirai-gikai/shared/report-publication/auto-publish";

/** 公開意見一覧のカード1件（取得した行をそのまま表示に使う）。 */
export type PublicInterviewReport = {
  id: string;
  role_title: string | null;
  summary: string | null;
  final_text: string;
  total_content_richness: number | null;
  created_at: string;
};

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

/** 1件多く取得した行から、ページ分の意見と続きの有無を切り出す。 */
export function buildPublicReportsPage(
  rawReports: PublicInterviewReport[],
  pageSize: number
) {
  const hasMore = rawReports.length > pageSize;
  return {
    reports: hasMore ? rawReports.slice(0, pageSize) : rawReports,
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
  return isPublicReportVisible({
    reviewStatus,
    publicReportCount: publicOpinionCount,
  });
}
