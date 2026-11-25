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

  // 見出しの下に、話した量に応じて 0〜3 件のトピックを並べる
  return (
    <div className="rounded-[16px] bg-secondary p-4 shadow-sm">
      <div className="mt-2 space-y-4 text-body">
        {report.summary && (
          <div className="font-bold space-y-1">
            <p className="text-primary-accent">💡あなたの声</p>
            <p className="whitespace-pre-wrap">{report.summary}</p>
          </div>
        )}
        {opinions.length > 0 && (
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
      </div>
    </div>
  );
}
