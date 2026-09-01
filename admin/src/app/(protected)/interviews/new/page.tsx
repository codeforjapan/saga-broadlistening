import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { getCurrentAdmin } from "@/features/auth/server/lib/auth-server";
import { getPolicyOptions } from "@/features/bills/server/loaders/get-bills";
import { InterviewConfigEditClient } from "@/features/interview-config/client/components/interview-config-edit-client";
import { generateDefaultConfigName } from "@/features/interview-config/shared/utils/default-config-name";
import { routes } from "@/lib/routes";

export default async function InterviewNewPage() {
  const [admin, policyOptions] = await Promise.all([
    getCurrentAdmin(),
    getPolicyOptions(),
  ]);

  const username = admin?.email?.split("@")[0] || null;
  const initialName = username
    ? `${generateDefaultConfigName()} (${username})`
    : null;

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
        <h1 className="text-2xl font-bold text-gray-900">意見募集の作成</h1>
        <p className="text-gray-600 mt-1">
          新しい意見募集（テーマ）を作成します。施策を紐づけない場合は、特定の施策に属さないテーマとして公開されます。
        </p>
      </div>

      <InterviewConfigEditClient
        billId={null}
        config={null}
        questions={[]}
        completedReports={[]}
        initialName={initialName}
        policyOptions={policyOptions}
        linkedPolicyIds={[]}
      />
    </div>
  );
}
