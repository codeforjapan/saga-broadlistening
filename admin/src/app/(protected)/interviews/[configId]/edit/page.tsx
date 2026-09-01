import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPolicyOptions } from "@/features/bills/server/loaders/get-bills";
import { InterviewConfigEditClient } from "@/features/interview-config/client/components/interview-config-edit-client";
import { getInterviewConfigById } from "@/features/interview-config/server/loaders/get-interview-config";
import { getInterviewQuestions } from "@/features/interview-config/server/loaders/get-interview-questions";
import { getLinkedPolicyIds } from "@/features/interview-config/server/loaders/get-linked-policy-ids";
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
        施策のプレビューとシミュレーションは施策の資料を前提にするため、
        施策配下の画面（/bills/[id]/interview/...）に任せて billId は渡さない。
      */}
      <InterviewConfigEditClient
        billId={null}
        config={config}
        questions={questions}
        completedReports={[]}
        policyOptions={policyOptions}
        linkedPolicyIds={linkedPolicyIds}
      />
    </div>
  );
}
