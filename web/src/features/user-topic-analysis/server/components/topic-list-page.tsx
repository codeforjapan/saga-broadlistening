import "server-only";

import { Info } from "lucide-react";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { InterviewLandingSection } from "@/features/interview-config/client/components/interview-landing-section";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { TopicList } from "../../client/components/topic-list";
import { getOpinionsLink } from "../../shared/utils/topic-analysis-links";
import { getTopicListHeading } from "../../shared/utils/topic-analysis-subject";
import { getTopicAnalysisContext } from "../loaders/get-topic-analysis-context";
import { InterviewCountPill } from "./interview-count-pill";
import { TopicSubjectHeader } from "./topic-subject-header";

interface TopicListPageProps {
  /** 分析の起点。施策配下・テーマ配下のどちらから来たかでリンクと見出しが変わる */
  target: InterviewTarget;
}

export async function TopicListPage({ target }: TopicListPageProps) {
  const context = await getTopicAnalysisContext(target);

  if (!context) {
    notFound();
  }

  const { subject, publicOpinionCount } = context;
  const topics = context.analysis?.topics ?? [];

  return (
    <div className="min-h-dvh bg-background pt-24 md:pt-0">
      <Container>
        <div className="flex flex-col gap-8 pb-8 md:pt-8">
          <TopicSubjectHeader
            subject={subject}
            trail={[{ label: "トピック一覧" }]}
          />

          {/* タイトル + 件数 + 回答ピル + 説明 */}
          <div className="flex flex-col gap-4">
            <h1 className="flex items-center gap-4 font-bold leading-9 text-foreground">
              <span className="text-[22px]">{getTopicListHeading(target)}</span>
              <span className="text-[20px]">{topics.length}件</span>
            </h1>

            <InterviewCountPill
              count={publicOpinionCount}
              href={getOpinionsLink(target)}
            />

            <div className="flex items-center gap-2.5 rounded-[10px] bg-secondary px-3 py-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-white">
                <Info className="size-3 text-primary-accent" />
              </span>
              <p className="text-[12px] leading-5 text-foreground">
                トピックとは、インタビューに寄せられた声をAIが取りまとめて整理した
                <span className="font-bold">意見のまとめ</span>
                です。気になるトピックから、実際の意見とインタビュー会話ログまで遡れます。
              </p>
            </div>
          </div>

          {/* フィルタ + トピックカード一覧 */}
          {topics.length > 0 ? (
            <TopicList
              target={target}
              topics={topics}
              publicReportCount={publicOpinionCount}
            />
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              トピック分析は準備中です
            </p>
          )}

          {/* AIインタビューCTA */}
          {context.isInterviewOpen && (
            <InterviewLandingSection target={target} />
          )}
        </div>
      </Container>
    </div>
  );
}
