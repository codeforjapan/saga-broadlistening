import type { Metadata } from "next";
import { getResultsInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { themeInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { OpinionsPage } from "@/features/user-topic-analysis/server/components/opinions-page";
import { buildOpinionsMetadata } from "@/features/user-topic-analysis/shared/utils/topic-analysis-metadata";
import { routes } from "@/lib/routes";

interface ThemeOpinionsRouteProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ThemeOpinionsRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getResultsInterviewConfigBySlug(slug);

  return buildOpinionsMetadata({
    subjectName: result?.config.name ?? "テーマ",
    canonical: routes.interviewThemeOpinions(slug),
  });
}

export default async function ThemeOpinionsRoute({
  params,
}: ThemeOpinionsRouteProps) {
  const { slug } = await params;
  return <OpinionsPage target={themeInterviewTarget(slug)} />;
}
