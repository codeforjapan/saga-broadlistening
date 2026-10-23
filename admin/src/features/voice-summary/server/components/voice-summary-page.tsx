import "server-only";

import { countPublicOpinionsByInterviewConfigId } from "@mirai-gikai/shared/report-publication/count-public-reports";
import {
  canGenerateVoiceSummary,
  MIN_OPINIONS_FOR_VOICE_SUMMARY,
} from "@mirai-gikai/shared/voice-summary/threshold";
import { findInterviewConfigNameById } from "@mirai-gikai/topic-analysis-core/repository";
import { AlertTriangle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { routes } from "@/lib/routes";
import { GenerateVoiceSummaryButton } from "../../client/components/generate-voice-summary-button";
import { VoiceSummaryEditor } from "../../client/components/voice-summary-editor";
import { formatDateTime } from "../../shared/utils/format-date-time";
import {
  isBasedOnOutdatedAnalysis,
  selectVoiceSummary,
  toVoiceSummaryStatus,
  VOICE_SUMMARY_STATUS_LABELS,
} from "../../shared/utils/voice-summary-status";
import {
  findPublishedAnalysisVersionId,
  listVoiceSummaries,
} from "../repositories/voice-summary-repository";
import { VoiceSummaryHistoryTable } from "./voice-summary-history-table";

/**
 * みんなの声のまとめの生成・編集・公開画面（#160）。
 * 公開中のトピック分析から AI で下書きを作り、確認・編集してから公開する。
 */
export async function VoiceSummaryPage({
  interviewConfigId,
  summaryId,
}: {
  interviewConfigId: string;
  summaryId?: string;
}) {
  await requireAdmin();
  const [configName, summaries, publishedAnalysisVersionId, opinionCount] =
    await Promise.all([
      findInterviewConfigNameById(interviewConfigId),
      listVoiceSummaries(interviewConfigId),
      findPublishedAnalysisVersionId(interviewConfigId),
      countPublicOpinionsByInterviewConfigId(interviewConfigId),
    ]);

  if (configName === null) {
    notFound();
  }

  const disabledReason = !canGenerateVoiceSummary(opinionCount)
    ? `公開された意見が${MIN_OPINIONS_FOR_VOICE_SUMMARY}件以上あるテーマで生成できます（現在${opinionCount}件）。少ない件数でまとめると内容を盛っているように見えるためです`
    : publishedAnalysisVersionId === null
      ? "公開中のトピック分析がありません。先にトピック分析を公開してください"
      : null;
  const selected = selectVoiceSummary(summaries, summaryId);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">みんなの声のまとめ</h1>
      <p className="mb-1 text-sm text-gray-600">テーマ: {configName}</p>
      <p className="mb-6 text-sm text-gray-500">
        公開中のトピック分析をもとに AI
        がまとめの下書きを作ります。内容を確認・編集してから公開してください。
        <Link
          href={routes.interviewUserTopicAnalysis(interviewConfigId) as Route}
          className="ml-2 underline"
        >
          トピック分析へ
        </Link>
      </p>

      <section className="mb-8 rounded-lg border bg-white p-6">
        <GenerateVoiceSummaryButton
          interviewConfigId={interviewConfigId}
          disabledReason={disabledReason}
        />
      </section>

      {selected && (
        <section className="mb-8 rounded-lg border bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">
              {
                VOICE_SUMMARY_STATUS_LABELS[
                  toVoiceSummaryStatus(selected.status)
                ]
              }
              の版（{formatDateTime(selected.created_at)} 作成）
            </h2>
            <span className="text-sm text-gray-500">
              トピック{selected.source_topic_count}件・意見
              {selected.source_opinion_count}件をもとに生成
            </span>
          </div>
          {isBasedOnOutdatedAnalysis(
            selected.topic_analysis_version_id,
            publishedAnalysisVersionId
          ) && (
            <p className="mb-4 flex items-center gap-2 rounded-md bg-yellow-400/20 px-3 py-2 text-sm">
              <AlertTriangle className="size-4 shrink-0" />
              このまとめは、いま公開中のトピック分析より古い分析をもとにしています。必要なら生成し直してください
            </p>
          )}
          <VoiceSummaryEditor
            key={selected.id}
            interviewConfigId={interviewConfigId}
            summary={{
              id: selected.id,
              status: toVoiceSummaryStatus(selected.status),
              contentMd: selected.content_md,
            }}
          />
        </section>
      )}

      <VoiceSummaryHistoryTable
        interviewConfigId={interviewConfigId}
        summaries={summaries}
        selectedId={selected?.id ?? null}
        publishedAnalysisVersionId={publishedAnalysisVersionId}
      />
    </div>
  );
}
