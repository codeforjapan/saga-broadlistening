import { SITE_NAME } from "@mirai-gikai/shared/site";
import type { Metadata } from "next";
import { InterviewThemePage } from "@/features/interview-config/server/components/interview-theme-page";
import { getInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { resolveThemeShareImageUrl } from "@/features/interview-config/shared/utils/interview-share-image";
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
  const shareImageUrl = resolveThemeShareImageUrl(
    config.thumbnail_url,
    env.webUrl
  );

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

export default async function InterviewThemeRoute({
  params,
}: InterviewThemePageProps) {
  const { slug } = await params;
  return <InterviewThemePage slug={slug} />;
}
