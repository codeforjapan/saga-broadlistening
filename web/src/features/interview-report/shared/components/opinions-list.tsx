import { MessageSquare } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { HeadingIcon } from "@/components/heading-icon";
import { getInterviewMessageLink } from "@/features/interview-config/shared/utils/interview-links";
import type { ParsedOpinion as Opinion } from "../utils/format-utils";

export type { Opinion };

interface OpinionsListProps {
  opinions: Opinion[];
  footer?: ReactNode;
  reportId?: string;
  chatLogFrom?: "complete" | "opinions";
}

export function OpinionsList({
  opinions,
  footer,
  reportId,
  chatLogFrom,
}: OpinionsListProps) {
  if (opinions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-foreground">
        <HeadingIcon icon={MessageSquare} />
        主な意見
      </h2>
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-white p-6">
        {opinions.map((opinion, index) => (
          <div
            key={`opinion-${index}-${opinion.title.slice(0, 20)}`}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-col gap-1">
              <div className="inline-flex">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded">
                  意見{index + 1}
                </span>
              </div>
              <p className="text-base font-bold text-foreground">
                {opinion.title}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{opinion.content}</p>
            {reportId && opinion.source_message_id && (
              <Link
                href={
                  getInterviewMessageLink(
                    reportId,
                    opinion.source_message_id,
                    chatLogFrom
                  ) as Route
                }
                className="text-[15px] leading-6 text-muted-foreground underline"
              >
                元の回答を見る
              </Link>
            )}
          </div>
        ))}
        {footer}
      </div>
    </div>
  );
}
