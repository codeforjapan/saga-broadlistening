import { SITE_NAME } from "@/config/site";
import type { ComingSoonBill } from "@/features/bills/shared/types";
import { Card, CardContent } from "../ui/card";

interface ComingSoonSectionProps {
  bills: ComingSoonBill[];
}

export function ComingSoonSection({ bills }: ComingSoonSectionProps) {
  return (
    <section className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] font-bold text-black leading-[1.48]">
          これから掲載される施策
        </h2>
        <p className="text-xs text-mirai-text-secondary">
          {SITE_NAME}は、順次更新されていきます
        </p>
      </div>

      {/* Coming soonカードリスト */}
      {bills.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <p className="text-2xl font-bold text-gray-300">Coming soon</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {bills.map((bill) => (
            <ComingSoonBillCard key={bill.id} bill={bill} />
          ))}
        </div>
      )}
    </section>
  );
}

function ComingSoonBillCard({ bill }: { bill: ComingSoonBill }) {
  // タイトルがあればそれを表示、なければ正式名称を表示
  const displayTitle = bill.title || bill.name;
  // 正式名称（タイトルがある場合のみ別途表示）
  const officialName = bill.title ? bill.name : null;

  return (
    <Card className="border border-black">
      <CardContent className="flex items-center justify-between py-4 px-5">
        <div className="flex flex-col gap-1 min-w-0 pr-3">
          <h3 className="font-bold text-base text-black leading-tight">
            {displayTitle}
          </h3>
          {officialName && (
            <p className="text-xs text-mirai-text-subtle">{officialName}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
