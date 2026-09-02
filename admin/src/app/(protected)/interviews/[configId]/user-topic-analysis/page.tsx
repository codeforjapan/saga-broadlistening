import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { UserTopicAnalysisPage } from "@/features/user-topic-analysis/server/components/user-topic-analysis-page";
import { routes } from "@/lib/routes";

export default async function InterviewUserTopicAnalysisRoute({
  params,
}: {
  params: Promise<{ configId: string }>;
}) {
  const { configId } = await params;

  return (
    <div>
      {/* テーマの存在チェックは UserTopicAnalysisPage 側（テーマ名の取得）に任せる */}
      <Link
        href={routes.interviews() as Route}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" />
        インタビュー管理に戻る
      </Link>
      <UserTopicAnalysisPage interviewConfigId={configId} />
    </div>
  );
}
