import type { Metadata } from "next";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { resolveBillShareImageUrl } from "@/features/bills/shared/utils/bill-share-image";
import { TopicDetailPage } from "@/features/user-topic-analysis/server/components/topic-detail-page";
import { getPublicTopicDetail } from "@/features/user-topic-analysis/server/loaders/get-public-topic-detail";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

interface TopicDetailRouteProps {
  params: Promise<{ id: string; topicId: string }>;
}

export async function generateMetadata({
  params,
}: TopicDetailRouteProps): Promise<Metadata> {
  const { id, topicId } = await params;
  // DB取得は getPublicTopicAnalysis の React cache() でページ本体と共有され、
  // リクエスト内で重複クエリにならない。
  const [bill, location] = await Promise.all([
    getBillById(id),
    getPublicTopicDetail(id, topicId),
  ]);
  const billName = bill?.bill_content?.title || bill?.name || "施策";
  const topic = location?.topic;

  const title = topic
    ? `${topic.title} - ${billName}`
    : `トピック詳細 - ${billName}`;
  const description =
    topic?.description || `${billName}に寄せられた意見トピックの詳細`;
  const shareImageUrl = resolveBillShareImageUrl(bill, env.webUrl);

  return {
    title,
    description,
    alternates: {
      canonical: routes.billTopicDetail(id, topicId),
    },
    openGraph: {
      title,
      description,
      type: "article",
      images: [
        {
          url: shareImageUrl,
          alt: `${title} のOGPイメージ`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImageUrl],
    },
  };
}

export default async function TopicDetailRoute({
  params,
}: TopicDetailRouteProps) {
  const { id, topicId } = await params;
  return <TopicDetailPage billId={id} topicId={topicId} />;
}
