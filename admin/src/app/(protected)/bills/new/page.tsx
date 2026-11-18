import { BillCreateForm } from "@/features/bills-edit/client/components/bill-create-form";
import { getParentPolicyOptions } from "@/features/bills-edit/server/loaders/get-parent-policy-options";

export default async function BillCreatePage() {
  const parentPolicyOptions = await getParentPolicyOptions(null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">施策新規作成</h1>
      <BillCreateForm parentPolicyOptions={parentPolicyOptions} />
    </div>
  );
}
