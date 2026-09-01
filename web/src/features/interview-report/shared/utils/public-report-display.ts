import {
  isPublicReportVisible,
  type OpinionReviewStatus,
} from "@mirai-gikai/shared/report-publication/auto-publish";
import {
  getBillDetailLink,
  getThemeHomeLink,
} from "@/features/interview-config/shared/utils/interview-links";
import {
  type LinkedPolicyRow,
  selectPrimaryPolicyId,
  toLinkedPolicies,
} from "@/features/interview-config/shared/utils/interview-visibility";

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
    slug: string;
    name: string;
    status: string;
    policies_interview_configs: LinkedPolicyRow[];
  } | null;
} | null;

/**
 * 意見がどこから寄せられたか。表示側の戻り先・見出しの出し分けに使う。
 *
 * 施策に紐づく意見募集なら施策、抽象テーマ型ならテーマが起点になる。
 */
export type ReportOrigin = {
  /** 起点になる公開済み施策のID。抽象テーマ型では null */
  policyId: string | null;
  /** 起点になったテーマ。isOpen が false なら個別ページは公開されていない */
  theme: { slug: string; name: string; isOpen: boolean };
};

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
 * 意見のセッションから、表示に使う起点（施策・テーマ）を取り出す。
 *
 * 施策と意見募集は多対多のため、公開済みの最初の1件を施策として採用する
 * （複数施策表示の UI 対応は Epic #8 のフォローアップ）。
 * 抽象テーマ型や、紐づく施策がまだ公開されていない場合は施策なしとして扱い、
 * テーマだけを起点にする。
 */
export function getReportOrigin(
  session: PublicReportSessionLike
): ReportOrigin | null {
  const config = session?.interview_configs;
  if (!config) {
    return null;
  }

  return {
    policyId: selectPrimaryPolicyId(
      toLinkedPolicies(config.policies_interview_configs)
    ),
    theme: {
      slug: config.slug,
      name: config.name,
      isOpen: config.status === "open",
    },
  };
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

/** 意見の見出し・戻り導線に使う対象 */
export type ReportSubject = {
  /** 表示名 */
  name: string;
  /** 遷移先 */
  href: string;
};

/** 見出しに施策名を出すために必要な最小の施策情報 */
export type ReportSubjectBill = {
  name: string;
  bill_content?: { title: string } | null;
} | null;

/**
 * 意見の起点へのリンク。
 *
 * 施策に紐づく意見は施策詳細へ、施策を持たない抽象テーマ型はそのテーマのページへ誘導する。
 * ただし募集が終わったテーマの個別ページは公開されないため、その場合はテーマ一覧に送る。
 */
export function getReportOriginLink(origin: ReportOrigin): string {
  if (origin.policyId) {
    return getBillDetailLink(origin.policyId);
  }

  return getThemeHomeLink(origin.theme);
}

/**
 * 意見がどの対象について寄せられたものかを、表示用にまとめる。
 * 施策があればその名前、なければテーマ名を見出しに使う。
 */
export function resolveReportSubject(
  bill: ReportSubjectBill,
  origin: ReportOrigin
): ReportSubject {
  return {
    name: bill ? bill.bill_content?.title || bill.name : origin.theme.name,
    href: getReportOriginLink(origin),
  };
}
