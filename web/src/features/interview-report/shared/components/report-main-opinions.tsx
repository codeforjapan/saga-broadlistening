import { ArrowDown, MessageSquare } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { HeadingIcon } from "@/components/heading-icon";
import { getInterviewMessageLink } from "@/features/interview-config/shared/utils/interview-links";
import type { ParsedOpinion } from "../utils/format-utils";

interface ReportMainOpinionsProps {
  opinions: ParsedOpinion[];
  reportId: string;
  /** 会話ログの該当箇所へのリンクを出すか。会話ログを公開しないテーマでは出さない（#278） */
  showSourceLinks: boolean;
}

/** レポート詳細「主な意見」セクション。会話ログを公開するテーマでは、各意見から会話ログの該当箇所へ遷移できる。 */
export function ReportMainOpinions({
  opinions,
  reportId,
  showSourceLinks,
}: ReportMainOpinionsProps) {
  if (opinions.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[22px] font-bold leading-9 text-foreground">
        <HeadingIcon icon={MessageSquare} />
        主な意見
      </h2>
      <div className="flex flex-col gap-4">
        {opinions.map((opinion, index) => (
          <div
            key={`${index}-${opinion.title.slice(0, 16)}`}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-white px-4 py-5"
          >
            <h3 className="text-base font-bold leading-6 text-foreground">
              {opinion.title}
            </h3>
            {opinion.content && (
              <div className="ml-2 border-l-2 border-border pl-4">
                <p className="font-quote text-[14px] font-medium leading-[22px] text-foreground">
                  <span className="mr-1 align-[-0.1em] text-[18px] text-primary-accent">
                    “
                  </span>
                  {opinion.content}
                </p>
              </div>
            )}
            {showSourceLinks && opinion.source_message_id && (
              <Link
                href={
                  getInterviewMessageLink(
                    reportId,
                    opinion.source_message_id
                  ) as Route
                }
                prefetch={false}
                className="flex items-center gap-2 self-end text-[13px] font-bold text-primary-accent hover:underline"
              >
                インタビューの前後を読む
                <ArrowDown className="size-[18px] shrink-0" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
