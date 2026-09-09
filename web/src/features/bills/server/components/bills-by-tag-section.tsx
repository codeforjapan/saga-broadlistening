import { SectionHeading } from "@/components/section-heading";
import { BillList } from "../../client/components/bill-list/bill-list";
import type { BillsByTag } from "../../shared/types";

interface BillsByTagSectionProps {
  billsByTag: BillsByTag[];
}

export function BillsByTagSection({ billsByTag }: BillsByTagSectionProps) {
  if (billsByTag.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-12">
      {billsByTag.map(({ tag, bills }) => (
        <section key={tag.id} className="flex flex-col gap-6">
          {/* タグヘッダー */}
          <SectionHeading
            as="h3"
            title={tag.label}
            description={tag.description}
          />

          {/* 施策カード一覧 */}
          <BillList bills={bills} />
        </section>
      ))}
    </div>
  );
}
