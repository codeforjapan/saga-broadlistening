import type { Metadata } from "next";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { resolveBillShareImageUrl } from "@/features/bills/shared/utils/bill-share-image";
import { policyInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { TopicDetailPage } from "@/features/user-topic-analysis/server/components/topic-detail-page";
import { getTopicLocation } from "@/features/user-topic-analysis/server/loaders/get-topic-location";
import { buildTopicDetailMetadata } from "@/features/user-topic-analysis/shared/utils/topic-analysis-metadata";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

interface TopicDetailRouteProps {
  params: Promise<{ id: string; topicId: string }>;
}

export async function generateMetadata({
  params,
}: TopicDetailRouteProps): Promise<Metadata> {
  const { id, topicId } = await params;
  // どちらの取得もキャッシュ済みで、ページ本体とクエリを共有する。
  const [bill, location] = await Promise.all([
    getBillById(id),
    getTopicLocation(policyInterviewTarget(id), topicId),
  ]);

  return buildTopicDetailMetadata({
    subjectName: bill?.bill_content?.title || bill?.name || "施策",
    canonical: routes.billTopicDetail(id, topicId),
    shareImageUrl: resolveBillShareImageUrl(bill, env.webUrl),
    topic: location?.topic ?? null,
  });
}

export default async function TopicDetailRoute({
  params,
}: TopicDetailRouteProps) {
  const { id, topicId } = await params;
  return (
    <TopicDetailPage target={policyInterviewTarget(id)} topicId={topicId} />
  );
}
