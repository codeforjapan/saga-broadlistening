import "server-only";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { InterviewLandingSection } from "@/features/interview-config/client/components/interview-landing-section";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { TopicOpinionList } from "../../client/components/topic-opinion-list";
import { splitSummaryLines } from "../../shared/utils/split-summary-lines";
import {
  getTopicDetailLink,
  getTopicsLink,
} from "../../shared/utils/topic-analysis-links";
import { getTopicAnalysisContext } from "../loaders/get-topic-analysis-context";
import { getTopicLocation } from "../loaders/get-topic-location";
import { TopicSubjectHeader } from "./topic-subject-header";

function TopicNav({
  target,
  position,
  total,
  prevTopicId,
  nextTopicId,
}: {
  target: InterviewTarget;
  position: number;
  total: number;
  prevTopicId: string | null;
  nextTopicId: string | null;
}) {
  return (
    // 3カラムグリッドで中央の位置カウンタを常に中央寄せにする
    // （前後リンクの有無にかかわらず位置がぶれないようにする）。
    <div className="grid grid-cols-3 items-center text-[13px] font-medium text-foreground">
      {/* 先頭では「前のトピック」を非表示にする。 */}
      <div className="justify-self-start">
        {prevTopicId && (
          <Link
            href={getTopicDetailLink(target, prevTopicId) as Route}
            className="flex items-center gap-1 text-primary-accent hover:underline"
          >
            <ChevronLeft className="size-4 shrink-0" />
            前のトピック
          </Link>
        )}
      </div>

      <span className="justify-self-center text-muted-foreground">
        {position}/{total}
      </span>

      {/* 末尾では「次のトピック」を非表示にする。 */}
      <div className="justify-self-end">
        {nextTopicId && (
          <Link
            href={getTopicDetailLink(target, nextTopicId) as Route}
            className="flex items-center gap-1 text-primary-accent hover:underline"
          >
            次のトピック
            <ChevronRight className="size-4 shrink-0" />
          </Link>
        )}
      </div>
    </div>
  );
}

interface TopicDetailPageProps {
  /** 分析の起点。施策配下・テーマ配下のどちらから来たかでリンクが変わる */
  target: InterviewTarget;
  topicId: string;
}

export async function TopicDetailPage({
  target,
  topicId,
}: TopicDetailPageProps) {
  const [context, detail] = await Promise.all([
    getTopicAnalysisContext(target),
    getTopicLocation(target, topicId),
  ]);

  if (!context || !detail) {
    notFound();
  }

  // 相対日時はサーバーで基準時刻を固定し、クライアントでの再計算ずれを防ぐ。
  const nowMs = Date.now();

  const { topic, position, total, prevTopicId, nextTopicId } = detail;
  const { subject } = context;

  return (
    <div className="min-h-dvh bg-background pt-24 md:pt-0">
      <Container>
        <div className="flex flex-col gap-6 pb-8 md:pt-8">
          <TopicSubjectHeader
            subject={subject}
            trail={[
              { label: "トピック一覧", href: getTopicsLink(target) },
              { label: "トピック詳細" },
            ]}
          />

          <h1 className="text-[22px] font-bold leading-9 text-foreground">
            💬トピックに含まれる意見
          </h1>

          <TopicNav
            target={target}
            position={position}
            total={total}
            prevTopicId={prevTopicId}
            nextTopicId={nextTopicId}
          />

          {/* トピックヘッダー */}
          <div className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-5">
            <h2 className="text-base font-bold leading-6 text-foreground">
              {topic.title}
              <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                （{topic.opinion_count}件）
              </span>
            </h2>
            {topic.description && (
              <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] leading-6 text-foreground">
                {splitSummaryLines(topic.description).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>

          {/* 意見一覧 */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[13px] font-bold text-muted-foreground">
              このトピックに含まれる{topic.opinion_count}件の意見
            </h3>
            <TopicOpinionList
              opinions={topic.opinions}
              publicReportCount={context.publicOpinionCount}
              nowMs={nowMs}
            />
          </div>

          {/* AIインタビューCTA */}
          {context.isInterviewOpen && (
            <InterviewLandingSection target={target} />
          )}
        </div>
      </Container>
    </div>
  );
}
