import type { Metadata } from "next";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { resolveBillShareImageUrl } from "@/features/bills/shared/utils/bill-share-image";
import { policyInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { TopicListPage } from "@/features/user-topic-analysis/server/components/topic-list-page";
import { buildTopicListMetadata } from "@/features/user-topic-analysis/shared/utils/topic-analysis-metadata";
import { getSubjectKindLabel } from "@/features/user-topic-analysis/shared/utils/topic-analysis-subject";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

interface TopicsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: TopicsPageProps): Promise<Metadata> {
  const { id } = await params;
  const bill = await getBillById(id);

  return buildTopicListMetadata({
    subjectName: bill?.bill_content?.title || bill?.name || "施策",
    subjectKindLabel: getSubjectKindLabel(policyInterviewTarget(id)),
    canonical: routes.billTopics(id),
    shareImageUrl: resolveBillShareImageUrl(bill, env.webUrl),
  });
}

export default async function TopicsPage({ params }: TopicsPageProps) {
  const { id } = await params;
  return <TopicListPage target={policyInterviewTarget(id)} />;
}
