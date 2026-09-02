import { Undo2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import {
  getReportOpinionsLink,
  getReportOriginLink,
  type ReportOrigin,
} from "../utils/public-report-display";

interface BackToBillButtonProps {
  /** 意見が寄せられた対象（施策・テーマ） */
  origin: ReportOrigin;
  /** "opinions" の場合、レポート一覧に戻るボタンを表示 */
  from?: "complete" | "opinions";
}

/**
 * 意見の読み終わりに置く戻り導線の遷移先を決める。
 *
 * 回答一覧から来た場合（from = "opinions"）は、その一覧に戻す。
 * それ以外は施策に紐づく意見なら施策へ、施策を持たない抽象テーマ型は
 * そのテーマのページへ戻す。ヘッダーのリンクと同じ場所を指すよう、
 * 遷移先は getReportOriginLink に揃える。
 */
function resolveDestination({ origin, from }: BackToBillButtonProps) {
  if (from === "opinions") {
    return { href: getReportOpinionsLink(origin), label: "レポート一覧に戻る" };
  }

  if (origin.policyId) {
    return { href: getReportOriginLink(origin), label: "施策の記事に戻る" };
  }

  return {
    href: getReportOriginLink(origin),
    label: origin.theme.isOpen ? "テーマのページに戻る" : "テーマ一覧に戻る",
  };
}

export function BackToBillButton(props: BackToBillButtonProps) {
  const { href, label } = resolveDestination(props);

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
