/** みんなの声のまとめの状態（theme_voice_summaries.status） */
export type VoiceSummaryStatus = "draft" | "published" | "archived";

export const VOICE_SUMMARY_STATUS_LABELS: Record<VoiceSummaryStatus, string> = {
  draft: "下書き",
  published: "公開中",
  archived: "公開終了",
};

export function toVoiceSummaryStatus(value: string): VoiceSummaryStatus {
  return value === "published" || value === "archived" ? value : "draft";
}

/**
 * まとめが、いま公開中のトピック分析より古い分析をもとにしているか。
 * 公開中の分析がない、またはまとめの元の分析が分からない（削除済み）ときも「古い」とみなす。
 */
export function isBasedOnOutdatedAnalysis(
  summaryAnalysisVersionId: string | null,
  publishedAnalysisVersionId: string | null
): boolean {
  return (
    summaryAnalysisVersionId === null ||
    summaryAnalysisVersionId !== publishedAnalysisVersionId
  );
}

/** 画面で選ぶ版。指定がなければ下書き → 公開中 → 最新の順 */
export function selectVoiceSummary<T extends { id: string; status: string }>(
  summaries: T[],
  requestedId: string | undefined
): T | null {
  return (
    summaries.find((summary) => summary.id === requestedId) ??
    summaries.find((summary) => summary.status === "draft") ??
    summaries.find((summary) => summary.status === "published") ??
    summaries[0] ??
    null
  );
}
