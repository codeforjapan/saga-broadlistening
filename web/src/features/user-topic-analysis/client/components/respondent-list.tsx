"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RespondentCard } from "../../shared/components/respondent-card";
import type { PublicRespondent } from "../../shared/types";
import { useFilteredPagination } from "../hooks/use-filtered-pagination";

/** 最初に表示する回答件数と、「もっと見る」で1回に追加する件数。 */
const INITIAL_VISIBLE = 20;
const LOAD_STEP = 40;

interface RespondentListProps {
  respondents: PublicRespondent[];
  /** 相対日時の基準時刻（ms）。サーバー側で固定し、ハイドレーションずれを防ぐ。 */
  nowMs: number;
}

export function RespondentList({ respondents, nowMs }: RespondentListProps) {
  const now = new Date(nowMs);
  const { visible, remaining, loadMore } = useFilteredPagination(
    respondents,
    INITIAL_VISIBLE,
    LOAD_STEP
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] font-bold text-topic-label">
        {respondents.length}人のインタビューの回答
      </p>

      <div className="flex flex-col gap-4">
        {visible.length > 0 ? (
          visible.map((respondent) => (
            <RespondentCard
              key={respondent.id}
              respondent={respondent}
              now={now}
            />
          ))
        ) : (
          <p className="py-8 text-center text-mirai-text-muted">
            該当する回答はありません
          </p>
        )}
      </div>

      {remaining > 0 && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={loadMore}
            className="h-auto w-full gap-2.5 rounded-[100px] border-mirai-text bg-white px-6 py-3 text-[15px] font-medium text-mirai-text hover:bg-mirai-surface-gray"
          >
            あと {remaining} 人のインタビュー回答を見る
            <ChevronDown className="size-[15px] shrink-0" />
          </Button>
        </div>
      )}
    </div>
  );
}
