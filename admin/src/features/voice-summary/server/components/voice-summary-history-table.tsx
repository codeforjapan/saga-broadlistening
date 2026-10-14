import "server-only";

import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { formatDateTime } from "../../shared/utils/format-date-time";
import {
  isBasedOnOutdatedAnalysis,
  toVoiceSummaryStatus,
  VOICE_SUMMARY_STATUS_LABELS,
} from "../../shared/utils/voice-summary-status";
import type { VoiceSummaryRow } from "../repositories/voice-summary-repository";

/** まとめの版の履歴（作成・状態・もとの分析・モデルとプロンプト・最終編集・公開） */
export function VoiceSummaryHistoryTable({
  interviewConfigId,
  summaries,
  selectedId,
  publishedAnalysisVersionId,
}: {
  interviewConfigId: string;
  summaries: VoiceSummaryRow[];
  selectedId: string | null;
  publishedAnalysisVersionId: string | null;
}) {
  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="mb-3 text-lg font-semibold">履歴</h2>
      {summaries.length === 0 ? (
        <p className="text-sm text-gray-500">まだまとめがありません。</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">作成</th>
              <th className="py-2">状態</th>
              <th className="py-2">もとの分析</th>
              <th className="py-2">モデル / プロンプト</th>
              <th className="py-2">最終編集</th>
              <th className="py-2">公開</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr key={summary.id} className="border-b last:border-0">
                <td className="py-2">{formatDateTime(summary.created_at)}</td>
                <td className="py-2">
                  {
                    VOICE_SUMMARY_STATUS_LABELS[
                      toVoiceSummaryStatus(summary.status)
                    ]
                  }
                </td>
                <td className="py-2">
                  {isBasedOnOutdatedAnalysis(
                    summary.topic_analysis_version_id,
                    publishedAnalysisVersionId
                  )
                    ? "古い分析"
                    : "公開中の分析"}
                </td>
                <td className="py-2 text-gray-600">
                  {summary.model ?? "—"} / {summary.prompt_version ?? "—"}
                </td>
                <td className="py-2 text-gray-600">
                  {formatDateTime(summary.edited_at)}
                </td>
                <td className="py-2">{formatDateTime(summary.published_at)}</td>
                <td className="py-2 text-right">
                  {summary.id === selectedId ? (
                    <span className="text-gray-400">表示中</span>
                  ) : (
                    <Link
                      href={
                        routes.interviewVoiceSummary(
                          interviewConfigId,
                          summary.id
                        ) as Route
                      }
                      className="underline"
                    >
                      開く
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
