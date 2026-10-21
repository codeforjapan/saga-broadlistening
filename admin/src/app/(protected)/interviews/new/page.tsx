import { InterviewConfigNewPage } from "@/features/interview-config/server/components/interview-config-new-page";

interface InterviewNewPageProps {
  searchParams: Promise<{
    /** 施策のページから来たときの施策ID */
    policyId?: string;
  }>;
}

export default async function InterviewNewPage({
  searchParams,
}: InterviewNewPageProps) {
  const { policyId } = await searchParams;
  return <InterviewConfigNewPage policyId={policyId} />;
}
