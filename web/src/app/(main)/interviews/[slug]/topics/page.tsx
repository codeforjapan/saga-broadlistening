import type { Metadata } from "next";
import { getResultsInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { themeInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { resolveThemeShareImageUrl } from "@/features/interview-config/shared/utils/interview-share-image";
import { TopicListPage } from "@/features/user-topic-analysis/server/components/topic-list-page";
import { buildTopicListMetadata } from "@/features/user-topic-analysis/shared/utils/topic-analysis-metadata";
import { getSubjectKindLabel } from "@/features/user-topic-analysis/shared/utils/topic-analysis-subject";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

interface ThemeTopicsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ThemeTopicsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getResultsInterviewConfigBySlug(slug);

  return buildTopicListMetadata({
    subjectName: result?.config.name ?? "テーマ",
    subjectKindLabel: getSubjectKindLabel(themeInterviewTarget(slug)),
    canonical: routes.interviewThemeTopics(slug),
    shareImageUrl: resolveThemeShareImageUrl(
      result?.config.thumbnail_url,
      env.webUrl
    ),
  });
}

export default async function ThemeTopicsPage({
  params,
}: ThemeTopicsPageProps) {
  const { slug } = await params;
  return <TopicListPage target={themeInterviewTarget(slug)} />;
}
