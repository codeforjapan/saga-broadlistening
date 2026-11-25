import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { VoiceSummaryPage } from "@/features/voice-summary/server/components/voice-summary-page";
import { routes } from "@/lib/routes";

export default async function InterviewVoiceSummaryRoute({
  params,
  searchParams,
}: {
  params: Promise<{ configId: string }>;
  searchParams: Promise<{ summaryId?: string }>;
}) {
  const [{ configId }, { summaryId }] = await Promise.all([
    params,
    searchParams,
  ]);

  return (
    <div>
      <Link
        href={routes.interviews() as Route}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" />
        インタビュー管理に戻る
      </Link>
      <VoiceSummaryPage interviewConfigId={configId} summaryId={summaryId} />
    </div>
  );
}
