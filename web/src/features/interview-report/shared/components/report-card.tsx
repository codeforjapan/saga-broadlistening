import type { Route } from "next";
import Link from "next/link";
import { getPublicReportLink } from "@/features/interview-config/shared/utils/interview-links";
import { formatRelativeTime } from "../utils/format-relative-time";

export interface ReportCardData {
  id: string;
  role_title: string | null;
  summary: string | null;
  created_at: string;
}

interface ReportCardProps {
  report: ReportCardData;
  children?: React.ReactNode;
  href?: string;
}

// Epic #54 で stance / role が廃止されたため、カードは立場（role_title）と
// 要約のみを表示する。
export function ReportCard({ report, children, href }: ReportCardProps) {
  const relativeTime = formatRelativeTime(report.created_at);
  const summary = report.summary || "";

  return (
    <article className="relative bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <Link
        href={(href ?? getPublicReportLink(report.id)) as Route}
        prefetch={false}
        className="absolute inset-0 rounded-lg"
        aria-label={
          [report.role_title, summary].filter(Boolean).join(" / ") ||
          "意見を見る"
        }
      />
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="flex flex-col gap-1.5">
            {report.role_title && (
              <p className="text-base font-bold leading-snug text-mirai-text">
                {report.role_title}
              </p>
            )}

            <div className="flex flex-1 min-w-0 items-center gap-3">
              <span className="text-[13px] text-mirai-text-muted whitespace-nowrap flex-shrink-0">
                {relativeTime}
              </span>
            </div>

            {summary && (
              <p className="text-sm leading-6 text-black">{summary}</p>
            )}
          </div>

          {children && (
            <div className="relative z-10 pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto">
              {children}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
