import type { Metadata } from "next";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { policyInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { OpinionsPage } from "@/features/user-topic-analysis/server/components/opinions-page";
import { buildOpinionsMetadata } from "@/features/user-topic-analysis/shared/utils/topic-analysis-metadata";
import { routes } from "@/lib/routes";

interface BillOpinionsRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: BillOpinionsRouteProps): Promise<Metadata> {
  const { id } = await params;
  const bill = await getBillById(id);

  return buildOpinionsMetadata({
    subjectName: bill?.bill_content?.title || bill?.name || "施策",
    canonical: routes.billOpinions(id),
  });
}

export default async function BillOpinionsRoute({
  params,
}: BillOpinionsRouteProps) {
  const { id } = await params;
  return <OpinionsPage target={policyInterviewTarget(id)} />;
}
