import { Undo2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface BackToReportButtonProps {
  href: string;
}

export function BackToReportButton({ href }: BackToReportButtonProps) {
  return (
    <Link
      href={href as Route}
      className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-primary text-primary-foreground shadow-card"
    >
      <Undo2 className="w-5 h-5 text-foreground" />
      <span className="text-base font-bold text-foreground">
        レポートに戻る
      </span>
    </Link>
  );
}
