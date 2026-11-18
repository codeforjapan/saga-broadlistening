import { Clock, User } from "lucide-react";
import type { ReactNode } from "react";

interface InterviewMetaProps {
  durationLabel: string | null;
  participantLabel: string | null;
  /** 行の末尾に足す要素（きかせてボックスの「インタビューについて・みんなの声」など） */
  children?: ReactNode;
}

/** インタビューの所要時間・参加人数の行。テーマ一覧のカードときかせてボックスで共通 */
export function InterviewMeta({
  durationLabel,
  participantLabel,
  children,
}: InterviewMetaProps) {
  if (!durationLabel && !participantLabel && !children) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {durationLabel && (
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden="true" />
          {durationLabel}
        </span>
      )}
      {participantLabel && (
        <span className="flex items-center gap-1">
          <User className="size-3.5" aria-hidden="true" />
          {participantLabel}
        </span>
      )}
      {children}
    </div>
  );
}
