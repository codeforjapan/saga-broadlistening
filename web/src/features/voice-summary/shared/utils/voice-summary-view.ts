import type { Metadata } from "next";
import { buildShareMetadata } from "@/features/user-topic-analysis/shared/utils/topic-analysis-metadata";
import { formatDateWithDots } from "@/lib/utils/date";

/** 「このまとめのもとになったトピック」に出す件数 */
export const SOURCE_TOPIC_DISPLAY_LIMIT = 3;

/** まとめページの見出し下の表記（例: 「12件のトピック・86件の意見をもとにAIが整理 · 2026.10.8 更新」） */
export function formatVoiceSummaryMeta(params: {
  topicCount: number;
  opinionCount: number;
  publishedAt: string | null;
}): string {
  const base = `${params.topicCount.toLocaleString("ja-JP")}件のトピック・${params.opinionCount.toLocaleString("ja-JP")}件の意見をもとにAIが整理`;
  const date = params.publishedAt ? formatDateWithDots(params.publishedAt) : "";
  return date ? `${base} · ${date} 更新` : base;
}

/**
 * もとになったトピックを、まとめに記録した順（件数の多い順）で上位から選ぶ。
 * まとめのあとでトピック分析が公開し直され、記録したトピックが見つからないものは飛ばす。
 */
export function selectSourceTopics<T extends { id: string }>(
  sourceTopicIds: string[],
  topics: T[],
  limit = SOURCE_TOPIC_DISPLAY_LIMIT
): T[] {
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  return sourceTopicIds
    .flatMap((id) => {
      const topic = byId.get(id);
      return topic ? [topic] : [];
    })
    .slice(0, limit);
}

/** まとめページのメタデータ（タイトル「みんなの声のまとめ：若者支援」、説明は冒頭の段落） */
export function buildVoiceSummaryMetadata(params: {
  subjectName: string | null;
  lead: string | null;
  canonical: string;
  shareImageUrl: string;
}): Metadata {
  const title = params.subjectName
    ? `みんなの声のまとめ：${params.subjectName}`
    : "みんなの声のまとめ";
  const description =
    params.lead ?? "寄せられたご意見をAIが整理したみんなの声のまとめ";
  return {
    title,
    description,
    alternates: { canonical: params.canonical },
    ...buildShareMetadata(title, description, params.shareImageUrl, "article"),
  };
}
