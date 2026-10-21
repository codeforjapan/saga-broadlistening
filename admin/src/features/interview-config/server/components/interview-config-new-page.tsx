import "server-only";

import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { getCurrentAdmin } from "@/features/auth/server/lib/auth-server";
import { getPolicyOptions } from "@/features/bills/server/loaders/get-bills";
import { routes } from "@/lib/routes";
import { generateDefaultConfigName } from "../../shared/utils/default-config-name";
import { InterviewConfigEditor } from "./interview-config-editor";

interface InterviewConfigNewPageProps {
  /** 施策のページから来たときの施策ID。その施策を紐づけた状態で始める */
  policyId?: string;
}

/** 意見募集の作成画面 */
export async function InterviewConfigNewPage({
  policyId,
}: InterviewConfigNewPageProps) {
  const [admin, policyOptions] = await Promise.all([
    getCurrentAdmin(),
    getPolicyOptions(),
  ]);

  const username = admin?.email?.split("@")[0] || null;
  const initialName = username
    ? `${generateDefaultConfigName()} (${username})`
    : null;
  // 存在しない施策のIDは無視する
  const fromPolicy = policyOptions.find((o) => o.id === policyId) ?? null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href={
            (fromPolicy
              ? routes.billInterview(fromPolicy.id)
              : routes.interviews()) as Route
          }
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {fromPolicy ? "インタビュー設定一覧に戻る" : "インタビュー管理に戻る"}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">意見募集の作成</h1>
        <p className="text-gray-600 mt-1">
          {fromPolicy
            ? `施策「${fromPolicy.name}」に紐づく意見募集を作成します。ほかの施策も紐づけられます。`
            : "新しい意見募集（テーマ）を作成します。施策を紐づけない場合は、特定の施策に属さないテーマとして公開されます。"}
        </p>
      </div>

      <InterviewConfigEditor
        config={null}
        questions={[]}
        completedReports={[]}
        initialName={initialName}
        policyOptions={policyOptions}
        linkedPolicyIds={fromPolicy ? [fromPolicy.id] : []}
      />
    </div>
  );
}
