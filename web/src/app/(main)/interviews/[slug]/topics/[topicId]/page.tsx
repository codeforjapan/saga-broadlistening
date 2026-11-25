import type { Metadata } from "next";
import { getResultsInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { themeInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { resolveThemeShareImageUrl } from "@/features/interview-config/shared/utils/interview-share-image";
import { TopicDetailPage } from "@/features/user-topic-analysis/server/components/topic-detail-page";
import { getTopicLocation } from "@/features/user-topic-analysis/server/loaders/get-topic-location";
import { buildTopicDetailMetadata } from "@/features/user-topic-analysis/shared/utils/topic-analysis-metadata";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

interface ThemeTopicDetailPageProps {
  params: Promise<{ slug: string; topicId: string }>;
}

export async function generateMetadata({
  params,
}: ThemeTopicDetailPageProps): Promise<Metadata> {
  const { slug, topicId } = await params;
  // どちらの取得もキャッシュ済みで、ページ本体とクエリを共有する。
  const [config, location] = await Promise.all([
    getResultsInterviewConfigBySlug(slug),
    getTopicLocation(themeInterviewTarget(slug), topicId),
  ]);

  return buildTopicDetailMetadata({
    subjectName: config?.config.name ?? "テーマ",
    canonical: routes.interviewThemeTopicDetail(slug, topicId),
    shareImageUrl: resolveThemeShareImageUrl(
      config?.config.thumbnail_url,
      env.webUrl
    ),
    topic: location?.topic ?? null,
  });
}

export default async function ThemeTopicDetailRoute({
  params,
}: ThemeTopicDetailPageProps) {
  const { slug, topicId } = await params;
  return (
    <TopicDetailPage target={themeInterviewTarget(slug)} topicId={topicId} />
  );
}
