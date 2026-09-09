import "server-only";

import { findInterviewConfigsByPolicyId } from "@/features/interview-config/server/repositories/interview-config-repository";
import { UserTopicAnalysisPage } from "./user-topic-analysis-page";

/**
 * 施策配下のユーザー向けトピック分析画面。
 *
 * Epic #54 でトピック分析の単位は施策から意見募集（テーマ）に移ったが、
 * このページのURLは施策IDのままなので、紐づくテーマの先頭1件を対象にする。
 */
export async function BillUserTopicAnalysisPage({
  billId,
}: {
  billId: string;
}) {
  const configs = await findInterviewConfigsByPolicyId(billId);
  const interviewConfigId = configs[0]?.id;

  if (!interviewConfigId) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="mb-1 text-2xl font-bold">ユーザー向けトピック分析</h1>
        <p className="text-sm text-gray-600">
          この施策に紐づく意見募集がありません。
        </p>
      </div>
    );
  }

  return <UserTopicAnalysisPage interviewConfigId={interviewConfigId} />;
}
