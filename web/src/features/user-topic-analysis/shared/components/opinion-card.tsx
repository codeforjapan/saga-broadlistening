import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getInterviewMessageLink } from "@/features/interview-config/shared/utils/interview-links";
import { shouldDisplayPublicOpinions } from "@/features/interview-report/shared/utils/public-report-display";
import { routes } from "@/lib/routes";
import type { PublicOpinion } from "../types";
import { formatOpinionDate } from "../utils/format-opinion-date";
import { normalizeRoleTitle } from "../utils/topic-category";
import { PersonAvatar } from "./person-avatar";

function Quote({ quote }: { quote: string }) {
  return (
    <div className="ml-2 border-l-2 border-mirai-border pl-4">
      <p className="font-mirai-serif text-[14px] font-medium leading-[22px] text-mirai-text">
        <span className="mr-1 align-[-0.1em] text-[18px] text-primary-accent">
          “
        </span>
        {quote}
      </p>
    </div>
  );
}

interface OpinionCardProps {
  opinion: PublicOpinion;
  /**
   * 施策の公開意見件数。意見詳細ページの表示条件
   * （公開済み × 公開件数しきい値）を満たすかの判定に使う。
   */
  publicReportCount: number;
  /**
   * 相対日時の基準時刻。サーバー側で固定値を渡し、
   * ハイドレーション時の再計算によるラベルずれを防ぐ。
   */
  now: Date;
}

/**
 * トピック詳細の意見カード（意見タイトル上・立場・下部に日時＋意見詳細リンク）。
 *
 * Epic #54 で賛否・回答者カテゴリが廃止されたため、chip 類は立場のみ。
 */
export function OpinionCard({
  opinion,
  publicReportCount,
  now,
}: OpinionCardProps) {
  const dateLabel = formatOpinionDate(opinion.created_at, now);
  const quote = opinion.contextual_quote?.trim();
  const roleTitle = normalizeRoleTitle(opinion.role_title);

  const reportVisible =
    opinion.opinion_public && shouldDisplayPublicOpinions(publicReportCount);
  // 意見詳細リンクは該当メッセージ位置へ飛ばす。
  // source_message_id が無い場合は意見詳細の先頭にフォールバックする。
  const reportHref = opinion.source_message_id
    ? getInterviewMessageLink(
        opinion.opinion_id,
        opinion.source_message_id,
        undefined,
        opinion.contextual_quote
      )
    : routes.publicReport(opinion.opinion_id);
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      {/* アバター + 意見タイトル */}
      <div className="flex items-center gap-2.5">
        <PersonAvatar />
        <h3 className="min-w-0 flex-1 text-[15px] font-bold leading-6 text-mirai-text">
          {opinion.title}
        </h3>
      </div>

      {/* 立場・日時 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {roleTitle && (
          <span className="inline-flex items-center rounded bg-topic-chip-bg px-2 py-1 text-[13px] font-medium text-mirai-text-secondary">
            {roleTitle}
          </span>
        )}
        {dateLabel && (
          <span className="text-[12px] leading-[14px] text-topic-label">
            {dateLabel}
          </span>
        )}
      </div>

      {/* 引用 */}
      {quote && <Quote quote={quote} />}

      {/* 意見詳細リンク */}
      {reportVisible && (
        <div className="flex items-center justify-end pt-3">
          <Link
            href={reportHref as Route}
            prefetch={false}
            className="flex items-center gap-0.5 text-[13px] font-bold text-primary-accent hover:underline"
          >
            インタビューレポートを読む
            <ChevronRight className="size-[14px] shrink-0" />
          </Link>
        </div>
      )}
    </div>
  );
}
