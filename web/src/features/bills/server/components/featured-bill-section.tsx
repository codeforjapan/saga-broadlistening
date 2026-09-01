import { SectionHeading } from "@/components/section-heading";
import { BillList } from "../../client/components/bill-list/bill-list";
import type { BillWithContent } from "../../shared/types";

interface FeaturedBillSectionProps {
  bills: BillWithContent[];
}

export function FeaturedBillSection({ bills }: FeaturedBillSectionProps) {
  if (bills.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-6">
      {/* セクションヘッダー */}
      <SectionHeading
        as="h3"
        title="注目の施策📈"
        description="佐賀市が検討している注目施策"
      />

      {/* 注目の施策カード */}
      <BillList bills={bills} />
    </section>
  );
}
