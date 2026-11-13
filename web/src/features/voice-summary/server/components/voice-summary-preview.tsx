import "server-only";

import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PublishedVoiceSummary } from "../loaders/get-published-voice-summary";

interface VoiceSummaryPreviewProps {
  summary: Pick<
    PublishedVoiceSummary,
    "question" | "lead" | "sourceOpinionCount"
  >;
  href: string;
  /** ボタンの文言（親施策ページでは「まとめを見る」） */
  linkLabel: string;
}

/**
 * みんなの声のまとめのプレビュー（問いと冒頭の段落だけ）。親施策ページの「みんなの声のまとめ」で使う（#156）。
 */
export function VoiceSummaryPreview({
  summary,
  href,
  linkLabel,
}: VoiceSummaryPreviewProps) {
  return (
    <div className="flex flex-col gap-3">
      {summary.question && (
        <h3 className="text-base font-bold leading-normal">
          {summary.question}
        </h3>
      )}
      {summary.lead && (
        <p className="text-sm leading-relaxed">{summary.lead}</p>
      )}
      <Button asChild variant="kikasete" size="sm" className="self-start px-4">
        <Link href={href as Route}>
          {linkLabel}
          <ChevronRight aria-hidden="true" />
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        {summary.sourceOpinionCount.toLocaleString("ja-JP")}
        件のご意見をAIが整理したものです。佐賀市の方針や決定事項ではありません。
      </p>
    </div>
  );
}
