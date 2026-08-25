"use client";

import { useMemo } from "react";
import type { InterviewReportViewData } from "@/features/interview-session/shared/schemas";

type Props = {
  report: InterviewReportViewData;
};

export function InterviewSummary({ report }: Props) {
  const opinions = useMemo(() => {
    if (!report.opinions || !Array.isArray(report.opinions)) return [];
    return report.opinions as Array<{ title: string; content: string }>;
  }, [report.opinions]);

  return (
    <div className="rounded-[16px] bg-mirai-light-gradient p-4 shadow-sm">
      <div className="mt-2 space-y-4 text-sm">
        {report.summary && (
          <div className="font-bold space-y-1">
            <p className="text-primary-accent">💡意見の要約</p>
            <p className="whitespace-pre-wrap">{report.summary}</p>
          </div>
        )}
        {report.final_text && (
          <div className="font-bold space-y-1">
            <p className="text-primary-accent">📝提出する意見</p>
            <p className="whitespace-pre-wrap">{report.final_text}</p>
          </div>
        )}
        {(report.role_description || report.role_title) && (
          <div className="space-y-4 font-bold">
            {report.role_title && (
              <div className="space-y-1">
                <p className="text-primary-accent">立場</p>
                <p>{report.role_title}</p>
              </div>
            )}
            {report.role_description && (
              <div className="whitespace-pre-wrap space-y-1">
                <p className="text-primary-accent">立場の詳細</p>
                <p>{report.role_description}</p>
              </div>
            )}
          </div>
        )}
        {opinions.length > 0 && (
          <div className="space-y-1">
            <p className="font-bold text-primary-accent">💬主な意見</p>
            <ul className="space-y-4">
              {opinions.map((op, index) => (
                <li
                  key={`${op.title}-${op.content}`}
                  className="whitespace-pre-wrap"
                >
                  <p className="font-bold mb-1">
                    {index + 1}. {op.title}
                  </p>
                  <p>{op.content}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
