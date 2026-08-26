import type { Route } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { routes } from "@/lib/routes";
import { BillCard } from "../../client/components/bill-list/bill-card";
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
        title="注目の法案🔥"
        description="国会に提出された注目法案"
      />

      {/* 注目の議案カード */}
      <div className="flex flex-col gap-4">
        {bills.map((bill) => (
          <Link key={bill.id} href={routes.billDetail(bill.id) as Route}>
            <BillCard bill={bill} />
          </Link>
        ))}
      </div>
    </section>
  );
}
