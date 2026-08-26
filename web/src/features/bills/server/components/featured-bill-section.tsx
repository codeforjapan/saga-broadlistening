import type { Route } from "next";
import Link from "next/link";
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
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold text-foreground leading-[1.48]">
          注目の施策🔥
        </h2>
        <p className="text-xs font-medium text-foreground leading-[1.67]">
          佐賀市が検討している注目施策
        </p>
      </div>

      {/* 注目の施策カード */}
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
