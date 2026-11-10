import { getBillDetailLink } from "@/features/interview-config/shared/utils/interview-links";
import { routes } from "@/lib/routes";
import type { ReportOrigin } from "./public-report-display";

/** 完了ページの説明直下に置く、次に進む導線 */
export type ReportNextAction = {
  href: string;
  label: string;
};

/**
 * 完了ページの次の導線を決める（#246）。
 *
 * テーマのみんなの声のまとめが公開されていればまとめへ、なければ施策のページへ戻す。
 * 施策に紐づかない抽象テーマ型はサイトトップへ戻す。
 */
export function resolveReportNextAction({
  origin,
  policyName,
  hasPublishedSummary,
}: {
  origin: ReportOrigin;
  /** 施策名（「〇〇に戻る」に使う） */
  policyName?: string;
  hasPublishedSummary: boolean;
}): ReportNextAction {
  if (hasPublishedSummary) {
    return {
      href: routes.interviewThemeSummary(origin.theme.slug),
      label: "意見まとめを見る",
    };
  }

  if (origin.policyId) {
    return {
      href: getBillDetailLink(origin.policyId),
      // 文言はレポート末尾の戻り導線（BackToBillButton）にそろえる
      label: policyName ? `${policyName}に戻る` : "施策の記事に戻る",
    };
  }

  return { href: routes.home(), label: "トップに戻る" };
}
