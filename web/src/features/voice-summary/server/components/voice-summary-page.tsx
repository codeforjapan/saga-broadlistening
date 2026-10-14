import "server-only";

import { ChevronRight, Info, Undo2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getResultsInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { themeInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { resolveThemeShareImageUrl } from "@/features/interview-config/shared/utils/interview-share-image";
import { ShareArticleButton } from "@/features/interview-report/client/components/share-article-button";
import { ReportProblemButton } from "@/features/interview-report/shared/components/report-problem-button";
import { TopicSubjectHeader } from "@/features/user-topic-analysis/server/components/topic-subject-header";
import { VoicesPageFrame } from "@/features/user-topic-analysis/server/components/voices-page-frame";
import { getPublicTopicAnalysisByInterviewConfigId } from "@/features/user-topic-analysis/server/loaders/get-public-topic-analysis";
import { getTopicAnalysisSubject } from "@/features/user-topic-analysis/server/loaders/get-topic-analysis-subject";
import { routes } from "@/lib/routes";
import { getOrigin } from "@/lib/utils/url";
import {
  formatVoiceSummaryMeta,
  selectSourceTopics,
} from "../../shared/utils/voice-summary-view";
import { getPublishedVoiceSummary } from "../loaders/get-published-voice-summary";

/** 公開中のまとめがないテーマでは 404 にする（ページとメタデータで共通） */
export async function loadVoiceSummaryPage(slug: string) {
  const context = await getTopicAnalysisSubject(themeInterviewTarget(slug));
  if (!context?.interviewConfigId) return null;
  const summary = await getPublishedVoiceSummary(context.interviewConfigId);
  if (!summary) return null;
  return { context, summary, interviewConfigId: context.interviewConfigId };
}

/**
 * みんなの声のまとめページ（/interviews/[slug]/summary、#161・デザイン「5a」）。
 * admin で公開した Markdown を、トピック一覧・詳細・レポートと同じ枠で描画する。
 */
export async function VoiceSummaryPage({ slug }: { slug: string }) {
  const loaded = await loadVoiceSummaryPage(slug);
  if (!loaded) {
    notFound();
  }
  const { context, summary, interviewConfigId } = loaded;
  const [analysis, siteOrigin, result] = await Promise.all([
    getPublicTopicAnalysisByInterviewConfigId(interviewConfigId),
    getOrigin(),
    getResultsInterviewConfigBySlug(slug),
  ]);
  const sourceTopics = selectSourceTopics(
    summary.sourceTopicIds,
    analysis?.topics ?? []
  );
  const { subject } = context;

  return (
    <VoicesPageFrame
      kikasete={context.kikasete}
      footer={
        <div className="flex flex-col items-center gap-3 pt-2">
          <ShareArticleButton
            billName={`みんなの声のまとめ：${subject.name}`}
            shareUrl={`${siteOrigin}${routes.interviewThemeSummary(slug)}`}
            // メタデータの og:image と同じ（テーマのサムネイル、なければサイト共通）
            ogImageUrl={resolveThemeShareImageUrl(
              result?.config.thumbnail_url,
              siteOrigin
            )}
            shareMessage={summary.question}
          />
          {subject.href && (
            <Button asChild variant="outline" className="w-full">
              <Link href={subject.href as Route}>
                <Undo2 className="size-5" aria-hidden="true" />
                {subject.name}に戻る
              </Link>
            </Button>
          )}
          <ReportProblemButton />
        </div>
      }
    >
      <TopicSubjectHeader
        subject={subject}
        trail={[{ label: "みんなの声のまとめ" }]}
      />

      <div className="flex flex-col gap-3">
        <h1 className="text-[22px] font-bold leading-9 text-foreground">
          💬みんなの声のまとめ
        </h1>
        <p className="text-xs text-muted-foreground">
          {formatVoiceSummaryMeta({
            topicCount: summary.sourceTopicCount,
            opinionCount: summary.sourceOpinionCount,
            publishedAt: summary.publishedAt,
          })}
        </p>
        <div className="flex items-center gap-2.5 rounded-[10px] bg-yellow-400/20 px-3 py-2.5">
          <Info
            className="size-4 shrink-0 text-yellow-700"
            aria-hidden="true"
          />
          <p className="text-[12px] leading-5 text-foreground">
            このページは、寄せられたご意見をAIが整理したものです。
            <strong>佐賀市の方針や決定事項ではありません。</strong>
          </p>
        </div>
      </div>

      <article
        className="voice-summary-content rounded-2xl bg-white px-5 py-6 md:px-8"
        // 公開時に記法を検証し、描画でも8記法のタグだけを残した HTML
        dangerouslySetInnerHTML={{ __html: summary.html }}
      />

      {sourceTopics.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">
            💬このまとめのもとになったトピック
          </h2>
          <ul className="flex flex-col gap-2">
            {sourceTopics.map((topic) => (
              <li key={topic.id}>
                <Link
                  href={
                    routes.interviewThemeTopicDetail(slug, topic.id) as Route
                  }
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 hover:bg-secondary"
                >
                  <span className="text-sm font-bold">
                    {topic.title}
                    <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                      （{topic.opinion_count}件）
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-primary-accent"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="w-full">
            <Link href={routes.interviewThemeTopics(slug) as Route}>
              トピック一覧をすべて見る
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      )}
    </VoicesPageFrame>
  );
}
