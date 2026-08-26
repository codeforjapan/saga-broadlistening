"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { TopicCard } from "../../shared/components/topic-card";
import type { PublicTopic } from "../../shared/types";
import { useFilteredPagination } from "../hooks/use-filtered-pagination";

/** 最初に表示するトピック件数と、「もっと見る」で1回に追加する件数。 */
const INITIAL_VISIBLE = 20;
const LOAD_STEP = 40;

interface TopicListProps {
  billId: string;
  topics: PublicTopic[];
  /** 引用→該当メッセージのリンク表示可否の判定に使う、施策の公開意見件数。 */
  publicReportCount: number;
}

export function TopicList({
  billId,
  topics,
  publicReportCount,
}: TopicListProps) {
  const { visible, remaining, loadMore } = useFilteredPagination(
    topics,
    INITIAL_VISIBLE,
    LOAD_STEP,
    `topic-list-pagination:${billId}`
  );
  // 「意見のまとめ」件数は全トピックの意見数の合計。
  const opinionCount = topics.reduce((sum, t) => sum + t.opinion_count, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* 件数ラベル */}
      <p className="text-[13px] font-bold text-muted-foreground">
        {topics.length}件のトピック（{opinionCount}件の意見まとめ）
      </p>

      {/* トピックカード一覧 */}
      <div className="flex flex-col gap-6">
        {visible.length > 0 ? (
          visible.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              href={routes.billTopicDetail(billId, topic.id)}
              publicReportCount={publicReportCount}
            />
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            トピックはありません
          </p>
        )}
      </div>

      {/* もっと見る */}
      {remaining > 0 && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={loadMore}
            className="h-auto w-full gap-2.5 rounded-[100px] border-foreground bg-white px-6 py-3 text-[15px] font-medium text-foreground hover:bg-muted"
          >
            あと {remaining} 件のトピックを見る
            <ChevronDown className="size-[15px] shrink-0" />
          </Button>
        </div>
      )}
    </div>
  );
}
