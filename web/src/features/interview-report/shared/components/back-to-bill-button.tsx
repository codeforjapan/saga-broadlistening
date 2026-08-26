import { Undo2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getBillDetailLink } from "@/features/interview-config/shared/utils/interview-links";
import { routes } from "@/lib/routes";

interface BackToBillButtonProps {
  billId: string;
  /** "opinions" の場合、レポート一覧に戻るボタンを表示 */
  from?: "complete" | "opinions";
}

export function BackToBillButton({ billId, from }: BackToBillButtonProps) {
  const href =
    from === "opinions"
      ? routes.billOpinions(billId)
      : getBillDetailLink(billId);
  const label = from === "opinions" ? "レポート一覧に戻る" : "施策の記事に戻る";

  return (
    <Link
      href={href as Route}
      className="flex items-center justify-center gap-2.5 px-6 py-3 border border-foreground rounded-full bg-white w-full"
    >
      <Undo2 className="w-5 h-5 text-foreground" />
      <span className="text-base font-bold text-foreground">{label}</span>
    </Link>
  );
}
