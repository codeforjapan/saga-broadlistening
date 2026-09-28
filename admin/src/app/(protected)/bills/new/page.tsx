import { BillCreateForm } from "@/features/bills-edit/client/components/bill-create-form";

export default function BillCreatePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">施策新規作成</h1>
      <BillCreateForm />
    </div>
  );
}
