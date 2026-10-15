import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BillEditForm } from "@/features/bills-edit/client/components/bill-edit-form";
import { BillTagsForm } from "@/features/bills-edit/client/components/bill-tags-form";
import { getBillTagIds } from "@/features/bills-edit/server/loaders/get-bill-tag-ids";
import { getBillWithApprover } from "@/features/bills-edit/server/loaders/get-bill-with-approver";
import { getParentPolicyOptions } from "@/features/bills-edit/server/loaders/get-parent-policy-options";
import { loadTags } from "@/features/tags/server/loaders/load-tags";
import { routes } from "@/lib/routes";

interface BillEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BillEditPage({ params }: BillEditPageProps) {
  const { id } = await params;
  const [
    { bill, approverEmail },
    allTags,
    selectedTagIds,
    parentPolicyOptions,
  ] = await Promise.all([
    getBillWithApprover(id),
    loadTags(),
    getBillTagIds(id),
    getParentPolicyOptions(id),
  ]);

  if (!bill) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={routes.bills()}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          施策一覧に戻る
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">施策編集</h1>
        <p className="text-gray-600 mt-1">施策の基本情報を編集します</p>
      </div>

      <div className="space-y-6">
        <BillEditForm
          bill={bill}
          parentPolicyOptions={parentPolicyOptions}
          approverEmail={approverEmail}
        />
        <BillTagsForm
          billId={bill.id}
          allTags={allTags}
          selectedTagIds={selectedTagIds}
        />
      </div>
    </div>
  );
}
