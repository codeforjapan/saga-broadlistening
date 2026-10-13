import "server-only";

import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { getPublishedVoiceSummary } from "@/features/voice-summary/server/loaders/get-published-voice-summary";
import { routes } from "@/lib/routes";
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
  // テーマのページだけ、公開中のまとめへの導線を出す（#159・#161）
  const voiceSummary =
    target.kind === "theme" && context.interviewConfigId
      ? await getPublishedVoiceSummary(context.interviewConfigId)
      : null;

  return (
    <AnalysisPageLayout
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
      kikasete={context.kikasete}
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
      {target.kind === "theme" && voiceSummary && (
        <Button asChild className="w-full">
          <Link href={routes.interviewThemeSummary(target.slug) as Route}>
            みんなの声のまとめを見る
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      )}
    </AnalysisPageLayout>
  );
}
