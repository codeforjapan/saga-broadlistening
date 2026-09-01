import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPolicyOptions } from "@/features/bills/server/loaders/get-bills";
import { InterviewConfigEditClient } from "@/features/interview-config/client/components/interview-config-edit-client";
import { getInterviewConfigById } from "@/features/interview-config/server/loaders/get-interview-config";
import { getInterviewQuestions } from "@/features/interview-config/server/loaders/get-interview-questions";
import { getLinkedPolicyIds } from "@/features/interview-config/server/loaders/get-linked-policy-ids";
import { getCompletedReportsForSimulation } from "@/features/interview-simulation/server/loaders/get-completed-reports-for-simulation";
import { resolveSimulationScope } from "@/features/interview-simulation/server/loaders/resolve-simulation-scope";
import { routes } from "@/lib/routes";

interface InterviewEditPageProps {
  params: Promise<{
    configId: string;
  }>;
}

export default async function InterviewEditPage({
  params,
}: InterviewEditPageProps) {
  const { configId } = await params;

  // 質問・紐づけ・施策一覧はどれも configId だけで引けるので、設定本体と同時に取得する
  const [config, questions, linkedPolicyIds, policyOptions] = await Promise.all(
    [
      getInterviewConfigById(configId),
      getInterviewQuestions(configId),
      getLinkedPolicyIds(configId),
      getPolicyOptions(),
    ]
  );

  if (!config) {
    notFound();
  }

  // シミュレーションの素材。範囲の解決は実行時のガードと同じ関数に任せる
  const simulationScope = await resolveSimulationScope(configId);
  const completedReportsResult =
    await getCompletedReportsForSimulation(simulationScope);

  return (
    <div>
      <div className="mb-6">
        <Link
          href={routes.interviews() as Route}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          インタビュー管理に戻る
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">意見募集の編集</h1>
        <p className="text-gray-600 mt-1">
          意見募集「{config.name}」を編集します
        </p>
      </div>

      {/*
        プレビューは施策単位で発行するため、施策配下の画面
        （/bills/[id]/interview/...）に任せて billId は渡さない。
        シミュレーションは施策の有無によらず使えるので simulationPolicyId で渡す。
      */}
      <InterviewConfigEditClient
        billId={null}
        config={config}
        questions={questions}
        completedReports={completedReportsResult.reports}
        completedReportsTruncated={completedReportsResult.isTruncated}
        completedReportsLimit={completedReportsResult.limit}
        policyOptions={policyOptions}
        linkedPolicyIds={linkedPolicyIds}
        hasPolicyScope={simulationScope.policyId !== null}
      />
    </div>
  );
}
