import type { Route } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { routes } from "@/lib/routes";
import { BillCard } from "../../client/components/bill-list/bill-card";
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

          {/* 議案カード一覧 */}
          <div className="flex flex-col gap-4">
            {bills.map((bill) => (
              <Link key={bill.id} href={routes.billDetail(bill.id) as Route}>
                <BillCard bill={bill} />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
