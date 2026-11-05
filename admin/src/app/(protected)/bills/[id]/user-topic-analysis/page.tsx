import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/features/auth/server/lib/auth-server";
import { BillUserTopicAnalysisPage } from "@/features/user-topic-analysis/server/components/bill-user-topic-analysis-page";
import { routes } from "@/lib/routes";

export default async function BillUserTopicAnalysisRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    redirect(routes.login());
  }
  const { id } = await params;
  return <BillUserTopicAnalysisPage billId={id} />;
}
