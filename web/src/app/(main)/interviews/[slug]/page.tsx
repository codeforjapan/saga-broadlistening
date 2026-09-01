import { SITE_NAME } from "@mirai-gikai/shared/site";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { InterviewLPPage } from "@/features/interview-config/client/components/interview-lp-page";
import { getInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { themeInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { selectPrimaryPolicyId } from "@/features/interview-config/shared/utils/interview-visibility";
import { getUserReportsByInterviewConfig } from "@/features/interview-report/server/loaders/get-user-reports-by-interview-config";
import { getLatestInterviewSession } from "@/features/interview-session/server/loaders/get-latest-interview-session";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface InterviewThemePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: InterviewThemePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getInterviewConfigBySlug(slug);

  if (!result) {
    return {
      title: "テーマが見つかりません",
    };
  }

  const { config } = result;
  const title = `AIインタビュー - ${config.name}`;
  const description =
    config.description ??
    `${config.name}についてのAIインタビュー | ${SITE_NAME}`;
  const shareImageUrl =
    config.thumbnail_url ?? new URL("/ogp.jpg", env.webUrl).toString();

  return {
    title,
    description,
    alternates: {
      canonical: routes.interviewThemeLP(slug),
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: shareImageUrl, alt: `${config.name} のAIインタビュー` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImageUrl],
    },
  };
}

export default async function InterviewThemePage({
  params,
}: InterviewThemePageProps) {
  const { slug } = await params;
  const result = await getInterviewConfigBySlug(slug);

  if (!result) {
    notFound();
  }

  const { config, policies } = result;
  // 施策に紐づくテーマならその施策も見せる。抽象テーマ型では null になる
  const policyId = selectPrimaryPolicyId(policies);

  const [bill, latestSession, userReports] = await Promise.all([
    policyId ? getBillById(policyId) : null,
    getLatestInterviewSession(config.id),
    getUserReportsByInterviewConfig(config.id),
  ]);

  return (
    <InterviewLPPage
      target={themeInterviewTarget(slug)}
      bill={bill}
      interviewConfig={config}
      sessionInfo={latestSession}
      userReports={userReports}
    />
  );
}
