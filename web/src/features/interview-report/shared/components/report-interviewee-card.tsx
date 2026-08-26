import { CalendarDays, NotebookText, UserRound } from "lucide-react";
import {
  formatAnsweredAt,
  formatRoleDescriptionLines,
} from "../utils/format-utils";

/** セッションの所要時間（分）。算出できなければ null。 */
function durationMinutes(
  startedAt: string | null,
  completedAt: string | null
): number | null {
  if (!startedAt || !completedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.max(1, Math.round((end - start) / 60000));
}

interface ReportIntervieweeCardProps {
  roleTitle: string | null;
  roleDescription: string | null;
  sessionStartedAt: string | null;
  sessionCompletedAt: string | null;
  characterCount: number;
}

// Epic #54 で stance / role が廃止されたため、期待懸念ラベルとカテゴリチップは表示しない。
/** 意見詳細の回答者カード（アバター・立場・回答日/分量）。 */
export function ReportIntervieweeCard({
  roleTitle,
  roleDescription,
  sessionStartedAt,
  sessionCompletedAt,
  characterCount,
}: ReportIntervieweeCardProps) {
  const descriptionLines = roleDescription
    ? formatRoleDescriptionLines(roleDescription)
    : [];
  const minutes = durationMinutes(sessionStartedAt, sessionCompletedAt);
  const answeredAt = formatAnsweredAt(sessionStartedAt);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-6">
      {/* アバター + 立場 */}
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-mirai-light-gradient">
          <UserRound className="size-7 text-mirai-text-secondary" />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-lg font-bold leading-7 text-mirai-text">
            {roleTitle || "回答者"}
          </p>
        </div>
      </div>

      {/* 立場の詳細 */}
      {descriptionLines.length > 0 && (
        <div className="text-[14px] leading-6 text-mirai-text">
          {descriptionLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      {/* 回答日 / インタビュー分量 */}
      <div className="flex items-center gap-4 border-t border-mirai-border pt-3">
        {answeredAt && (
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[13px] text-topic-label">
              <CalendarDays className="size-4 shrink-0" />
              回答日
            </span>
            <span className="text-[13px] font-bold text-mirai-text">
              {answeredAt}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-1 border-l border-mirai-border pl-4">
          <span className="flex items-center gap-1.5 text-[13px] text-topic-label">
            <NotebookText className="size-4 shrink-0" />
            インタビュー分量
          </span>
          <span className="text-[13px] font-bold text-mirai-text">
            {minutes !== null ? `${minutes} 分 / ` : ""}
            {characterCount} 文字
          </span>
        </div>
      </div>
    </div>
  );
}
