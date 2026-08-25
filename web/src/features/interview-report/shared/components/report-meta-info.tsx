import type { Route } from "next";
import Link from "next/link";
import { getInterviewChatLogLink } from "@/features/interview-config/shared/utils/interview-links";
import { ReactionButtonsInline } from "@/features/report-reaction/client/components/reaction-buttons-inline";
import type { ReportReactionData } from "@/features/report-reaction/shared/types";
import { formatDateTime } from "../utils/report-utils";

interface ReportMetaInfoProps {
  reportId: string;
  roleTitle?: string | null;
  sessionStartedAt: string | null;
  characterCount: number;
  reactionData?: ReportReactionData;
  /** 遷移元のコンテキスト */
  from?: "complete" | "opinions";
  /** trueの場合、会話ログへのリンクにしない */
  disableLink?: boolean;
}

export function ReportMetaInfo({
  reportId,
  roleTitle,
  sessionStartedAt,
  characterCount,
  reactionData,
  from,
  disableLink,
}: ReportMetaInfoProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* 立場 */}
      {roleTitle && <p className="text-xs text-gray-600">{roleTitle}</p>}

      {/* 日時・時間・文字数 */}
      <div className="text-black text-center">
        <p className="text-base font-medium mb-2">
          {formatDateTime(sessionStartedAt)}
        </p>
        {disableLink ? (
          <p className="text-xs font-normal">
            インタビューの分量
            <span className="ml-2">{characterCount}文字</span>
          </p>
        ) : (
          <Link
            href={getInterviewChatLogLink(reportId, from) as Route}
            className="text-xs font-normal"
          >
            インタビューの分量
            <span className="underline ml-2">{characterCount}文字</span>
          </Link>
        )}
      </div>

      {/* 参考になるボタン */}
      {reactionData && (
        <ReactionButtonsInline reportId={reportId} initialData={reactionData} />
      )}
    </div>
  );
}
