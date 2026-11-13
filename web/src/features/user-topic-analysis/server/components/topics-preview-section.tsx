import "server-only";

import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { TopicCard } from "../../shared/components/topic-card";
import type { PublicTopic } from "../../shared/types";
import {
  getOpinionsLink,
  getTopicDetailLink,
  getTopicsLink,
} from "../../shared/utils/topic-analysis-links";
import { getTopicListHeading } from "../../shared/utils/topic-analysis-subject";
import { InterviewCountPill } from "./interview-count-pill";

/** プレビューで表示するトピック数。 */
const PREVIEW_COUNT = 2;

interface TopicsPreviewSectionProps {
  /** リンク組み立てと見出しに使う起点（施策・テーマ）。 */
  target: InterviewTarget;
  /** 公開トピック（呼び出し側で取得済みのものを渡す）。 */
  topics: PublicTopic[];
  /** 意見募集の公開意見件数（ピル表示・引用→メッセージリンクの表示判定に使う）。 */
  publicOpinionCount: number;
}

/**
 * 施策詳細ページ・テーマページに差し込むトピック一覧プレビュー。
 * 公開トピックが無ければ何も描画しない。
 */
export function TopicsPreviewSection({
  target,
  topics,
  publicOpinionCount,
}: TopicsPreviewSectionProps) {
  if (topics.length === 0) {
    return null;
  }

  const previewTopics = topics.slice(0, PREVIEW_COUNT);
  const topicsHref = getTopicsLink(target) as Route;

  return (
    <div className="flex flex-col gap-4">
      {/* セクションヘッダー */}
      <Link href={topicsHref} className="flex items-center gap-4">
        <h2 className="flex items-center gap-4 font-bold leading-9 text-foreground">
          <span className="text-[22px]">{getTopicListHeading(target)}</span>
          <span className="text-[20px]">{topics.length}件</span>
        </h2>
        <ChevronRight className="size-6 shrink-0 text-primary" />
      </Link>

      <InterviewCountPill
        count={publicOpinionCount}
        href={getOpinionsLink(target)}
      />

      {/* トピックカード（プレビュー） */}
      <div className="flex flex-col gap-4">
        {previewTopics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            href={getTopicDetailLink(target, topic.id)}
            publicReportCount={publicOpinionCount}
          />
        ))}
      </div>

      {/* 一覧への導線 */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="lg"
          asChild
          className="h-12 w-full gap-2.5 rounded-full border-foreground bg-white text-[15px] font-medium text-foreground hover:bg-muted"
        >
          <Link href={topicsHref}>
            トピック一覧をすべて見る
            <ChevronRight className="size-[15px] shrink-0" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
