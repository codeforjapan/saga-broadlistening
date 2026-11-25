import type { Metadata } from "next";
import { getResultsInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { resolveThemeShareImageUrl } from "@/features/interview-config/shared/utils/interview-share-image";
import {
  loadVoiceSummaryPage,
  VoiceSummaryPage,
} from "@/features/voice-summary/server/components/voice-summary-page";
import { buildVoiceSummaryMetadata } from "@/features/voice-summary/shared/utils/voice-summary-view";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

interface ThemeSummaryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ThemeSummaryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [loaded, result] = await Promise.all([
    loadVoiceSummaryPage(slug),
    getResultsInterviewConfigBySlug(slug),
  ]);
  return buildVoiceSummaryMetadata({
    subjectName: loaded?.context.subject.name ?? null,
    lead: loaded?.summary.lead ?? null,
    canonical: routes.interviewThemeSummary(slug),
    shareImageUrl: resolveThemeShareImageUrl(
      result?.config.thumbnail_url,
      env.webUrl
    ),
  });
}

export default async function ThemeSummaryPage({
  params,
}: ThemeSummaryPageProps) {
  const { slug } = await params;
  return <VoiceSummaryPage slug={slug} />;
}
