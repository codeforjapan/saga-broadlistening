import { CalendarDays, FileText } from "lucide-react";
import { formatDateTime } from "../utils/report-utils";

interface ReportSummaryCardProps {
  summary: string | null;
  sessionStartedAt: string | null;
  characterCount: number;
}

/** レポート冒頭の要約カード。要約と、回答日時・インタビューの分量を出す（#278） */
export function ReportSummaryCard({
  summary,
  sessionStartedAt,
  characterCount,
}: ReportSummaryCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white px-5 py-6 md:px-7">
      {summary && (
        <p className="text-[17px] font-bold leading-[1.8] text-foreground md:text-lg">
          {summary}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-3 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
          {formatDateTime(sessionStartedAt)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileText aria-hidden="true" className="size-4 shrink-0" />
          インタビューの分量
          <span className="font-bold text-foreground">
            {characterCount}文字
          </span>
        </span>
      </div>
    </div>
  );
}
