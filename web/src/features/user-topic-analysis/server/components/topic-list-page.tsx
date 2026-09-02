import "server-only";

import { notFound } from "next/navigation";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { TopicList } from "../../client/components/topic-list";
import { getOpinionsLink } from "../../shared/utils/topic-analysis-links";
import { getTopicListHeading } from "../../shared/utils/topic-analysis-subject";
import { getTopicAnalysisContext } from "../loaders/get-topic-analysis-context";
import { AnalysisPageLayout } from "./analysis-page-layout";
import { InterviewCountPill } from "./interview-count-pill";

interface TopicListPageProps {
  /** 分析の起点。施策配下・テーマ配下のどちらから来たかでリンクと見出しが変わる */
  target: InterviewTarget;
}

export async function TopicListPage({ target }: TopicListPageProps) {
  const context = await getTopicAnalysisContext(target);

  if (!context) {
    notFound();
  }

  const topics = context.analysis?.topics ?? [];

  return (
    <AnalysisPageLayout
      target={target}
      subject={context.subject}
      trail={[{ label: "トピック一覧" }]}
      heading={getTopicListHeading(target)}
      count={`${topics.length}件`}
      beforeNotice={
        <InterviewCountPill
          count={context.publicOpinionCount}
          href={getOpinionsLink(target)}
        />
      }
      notice={
        <>
          トピックとは、インタビューに寄せられた声をAIが取りまとめて整理した
          <span className="font-bold">意見のまとめ</span>
          です。気になるトピックから、実際の意見とインタビュー会話ログまで遡れます。
        </>
      }
      isInterviewOpen={context.isInterviewOpen}
    >
      {topics.length > 0 ? (
        <TopicList
          target={target}
          topics={topics}
          publicReportCount={context.publicOpinionCount}
        />
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          トピック分析は準備中です
        </p>
      )}
    </AnalysisPageLayout>
  );
}
