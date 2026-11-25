"use client";

import {
  FileText,
  Lightbulb,
  type LucideIcon,
  MessageSquare,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { HeadingIcon } from "@/components/heading-icon";
import type { InterviewReportViewData } from "@/features/interview-session/shared/schemas";

type Props = {
  report: InterviewReportViewData;
};

/** まとめの中身（STEP 1 の本文）。意見の要約・提出する意見・立場・主な意見を区切って並べる */
export function InterviewSummary({ report }: Props) {
  const opinions = Array.isArray(report.opinions)
    ? (report.opinions as Array<{ title: string; content: string }>)
    : [];
  const hasRole = Boolean(report.role_title || report.role_description);

  return (
    <div className="divide-y divide-border text-[15px] leading-[1.8] text-foreground">
      {report.summary && (
        <SummarySection icon={Lightbulb} heading="意見の要約">
          <p className="whitespace-pre-wrap rounded-xl bg-secondary px-3.5 py-3 font-bold">
            {report.summary}
          </p>
        </SummarySection>
      )}
      {report.final_text && (
        <SummarySection icon={FileText} heading="提出する意見">
          <p className="whitespace-pre-wrap">{report.final_text}</p>
        </SummarySection>
      )}
      {hasRole && (
        <SummarySection icon={UserRound} heading="立場">
          {report.role_title && (
            <p className="font-bold">{report.role_title}</p>
          )}
          {report.role_description && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {report.role_description}
            </p>
          )}
        </SummarySection>
      )}
      {opinions.length > 0 && (
        <SummarySection icon={MessageSquare} heading="主な意見">
          <ul className="space-y-3">
            {opinions.map((op, index) => (
              <li
                key={`${op.title}-${op.content}`}
                className="whitespace-pre-wrap"
              >
                <p className="font-bold">
                  {index + 1}. {op.title}
                </p>
                <p>{op.content}</p>
              </li>
            ))}
          </ul>
        </SummarySection>
      )}
    </div>
  );
}

function SummarySection({
  icon,
  heading,
  children,
}: {
  icon: LucideIcon;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <h3 className="mb-2 text-sm font-bold text-primary-accent">
        <HeadingIcon icon={icon} />
        {heading}
      </h3>
      {children}
    </section>
  );
}
