import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { InterviewDisclosurePage } from "@/features/interview-config/server/components/interview-disclosure-page";
import { getInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { loadDisclosureData } from "@/features/interview-config/server/loaders/load-disclosure-data";
import { themeInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { selectPrimaryPolicyId } from "@/features/interview-config/shared/utils/interview-visibility";

interface ThemeDisclosurePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ThemeDisclosurePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getInterviewConfigBySlug(slug);

  if (!result) {
    return {
      title: "テーマが見つかりません",
    };
  }

  return {
    title: `AIインタビューに関する情報開示 - ${result.config.name}`,
    description: `${result.config.name}のAIインタビューにおける透明性および技術仕様に関する開示事項`,
  };
}

export default async function ThemeDisclosurePage({
  params,
}: ThemeDisclosurePageProps) {
  const { slug } = await params;
  const result = await getInterviewConfigBySlug(slug);

  if (!result) {
    notFound();
  }

  const { config, policies } = result;
  const policyId = selectPrimaryPolicyId(policies);
  const bill = policyId ? await getBillById(policyId) : null;

  const disclosureData = await loadDisclosureData(bill, config);

  return (
    <InterviewDisclosurePage
      {...disclosureData}
      target={themeInterviewTarget(slug)}
    />
  );
}
