"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAnonymousSupabaseUser } from "@/features/chat/client/hooks/use-anonymous-supabase-user";
import { getPublicReportLink } from "@/features/interview-config/shared/utils/interview-links";
import { ReactionButtonsInline } from "@/features/report-reaction/client/components/reaction-buttons-inline";
import type { ReportReactionData } from "@/features/report-reaction/shared/types";
import { cn } from "@/lib/utils";
import { fetchMorePublicReports } from "../../server/actions/fetch-more-public-reports";
import type { PublicInterviewReport } from "../../server/loaders/get-public-reports-by-bill-id";
import { ReportCard } from "../../shared/components/report-card";
import {
  type SortOrder,
  sortOrderLabels,
  sortOrderOptions,
} from "../../shared/utils/sort-order";
import { useInfiniteScroll } from "../hooks/use-infinite-scroll";

// Epic #54 で賛否（stance）が廃止されたため、絞り込みはソート順のみ。
// useInfiniteScroll のフィルタ型は "all" 固定で使う。
type NoFilter = "all";
const NO_FILTER: NoFilter = "all";

function _SortToggle({
  activeSort,
  onChangeSort,
}: {
  activeSort: SortOrder;
  onChangeSort: (sort: SortOrder) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold">
      {sortOrderOptions.map((sort, index) => (
        <span key={sort} className="flex items-center gap-2">
          {index > 0 && <span className="text-mirai-text">｜</span>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChangeSort(sort)}
            className={cn(
              "!p-0 !h-auto rounded-none transition-colors",
              activeSort === sort ? "text-primary-accent" : "text-mirai-text"
            )}
          >
            {sortOrderLabels[sort]}
          </Button>
        </span>
      ))}
    </div>
  );
}

type ReactionsRecord = Record<
  string,
  { counts: { helpful: number; hmm: number }; userReaction: string | null }
>;

interface PublicOpinionsListProps {
  billId: string;
  initialReports: PublicInterviewReport[];
  initialReactionsRecord: ReactionsRecord;
  totalCount: number;
  initialHasMore: boolean;
  initialSort: SortOrder;
}

export function PublicOpinionsList({
  billId,
  initialReports,
  initialReactionsRecord,
  totalCount,
  initialHasMore,
  initialSort,
}: PublicOpinionsListProps) {
  useAnonymousSupabaseUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [reactionsRecord, setReactionsRecord] = useState<ReactionsRecord>(
    initialReactionsRecord
  );

  const updateUrl = useCallback(
    (sort: SortOrder) => {
      const params = new URLSearchParams(searchParams.toString());

      if (sort === "recommended") {
        params.delete("sort");
      } else {
        params.set("sort", sort);
      }

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      window.history.replaceState(null, "", href);
    },
    [pathname, searchParams]
  );

  const fetchMore = useCallback(
    async (offset: number, _filter: NoFilter, sort: SortOrder) => {
      const result = await fetchMorePublicReports(billId, offset, sort);
      setReactionsRecord((prev) => ({
        ...prev,
        ...result.reactionsRecord,
      }));
      return { items: result.reports, hasMore: result.hasMore };
    },
    [billId]
  );

  const {
    items: reports,
    hasMore,
    isPending,
    activeSort,
    sentinelRef,
    changeSort: rawChangeSort,
  } = useInfiniteScroll<PublicInterviewReport, NoFilter, SortOrder>({
    initialItems: initialReports,
    initialHasMore,
    initialFilter: NO_FILTER,
    initialSort,
    fetchMore,
  });

  const changeSort = useCallback(
    (sort: SortOrder) => {
      rawChangeSort(sort);
      updateUrl(sort);
    },
    [rawChangeSort, updateUrl]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* セクションヘッダー */}
      <div className="flex items-center gap-4">
        <h2 className="text-[22px] font-bold leading-[1.636] text-mirai-text">
          <span className="mr-1">💬</span>施策に寄せられた意見
        </h2>
        <span className="text-[22px] font-bold leading-[1.636] text-mirai-text">
          {totalCount}件
        </span>
      </div>

      {/* ソート */}
      <_SortToggle activeSort={activeSort} onChangeSort={changeSort} />

      {/* レポートカード一覧 */}
      <div className="flex flex-col gap-4">
        {reports.map((report) => {
          const reaction = reactionsRecord[report.id];
          const reactionData: ReportReactionData = reaction
            ? {
                counts: reaction.counts,
                userReaction:
                  (reaction.userReaction as ReportReactionData["userReaction"]) ??
                  null,
              }
            : { counts: { helpful: 0, hmm: 0 }, userReaction: null };

          return (
            <ReportCard
              key={report.id}
              report={report}
              href={getPublicReportLink(report.id, "opinions")}
            >
              <ReactionButtonsInline
                reportId={report.id}
                initialData={reactionData}
              />
            </ReportCard>
          );
        })}

        {/* ローディング表示 & IntersectionObserver用sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {isPending && (
              <Loader2 className="h-6 w-6 animate-spin text-mirai-text-muted" />
            )}
          </div>
        )}

        {!hasMore && reports.length === 0 && !isPending && (
          <p className="text-center text-mirai-text-muted py-8">
            該当する意見はありません
          </p>
        )}
      </div>
    </div>
  );
}
