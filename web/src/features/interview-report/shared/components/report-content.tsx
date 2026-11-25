import { ChatLogSection } from "./chat-log-section";
import type { Opinion } from "./opinions-list";
import { OpinionsList } from "./opinions-list";
import { ReportSummaryCard } from "./report-summary-card";

interface ReportContentProps {
  reportId: string;
  summary: string | null;
  sessionStartedAt: string | null;
  characterCount: number;
  /** 会話ログ。渡さなければ会話ログも、会話ログへのリンクも出さない */
  messages?: Array<{
    id: string;
    role: string;
    content: string;
  }>;
  opinions: Opinion[];
  /** 遷移元のコンテキスト。"complete" の場合、会話ログへのリンクに ?from=complete を付与する */
  from?: "complete" | "opinions";
}

/** レポートの本体（要約カード・主な意見・会話ログ） */
export function ReportContent({
  reportId,
  summary,
  sessionStartedAt,
  characterCount,
  messages,
  opinions,
  from,
}: ReportContentProps) {
  const showChatLog = messages != null && messages.length > 0;

  return (
    <div className="flex flex-col gap-9">
      <ReportSummaryCard
        summary={summary}
        sessionStartedAt={sessionStartedAt}
        characterCount={characterCount}
      />

      <OpinionsList
        opinions={opinions}
        // 「元の回答を見る」は会話ログの中を指すので、会話ログを出すときだけ出す
        reportId={showChatLog ? reportId : undefined}
        chatLogFrom={from}
      />

      {showChatLog && <ChatLogSection messages={messages} />}
    </div>
  );
}
