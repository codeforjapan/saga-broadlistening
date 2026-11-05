import "server-only";

import {
  extractSummaryLead,
  renderVoiceSummaryHtml,
} from "@mirai-gikai/shared/voice-summary/markdown";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { findPublishedVoiceSummary } from "../repositories/voice-summary-repository";

export type PublishedVoiceSummary = {
  /** 本文の HTML（8記法のタグだけ。描画は .voice-summary-content） */
  html: string;
  /** 親ページ・きかせてページのプレビューに出す問いと冒頭の段落 */
  question: string | null;
  lead: string | null;
  sourceTopicCount: number;
  sourceOpinionCount: number;
  sourceTopicIds: string[];
  publishedAt: string | null;
};

/**
 * テーマの公開中のみんなの声のまとめ（#161）。なければ null。
 * admin で公開・非公開にすると INTERVIEW_CONFIGS のタグが落ちる。
 */
export const getPublishedVoiceSummary = unstable_cache(
  async (interviewConfigId: string): Promise<PublishedVoiceSummary | null> => {
    const row = await findPublishedVoiceSummary(interviewConfigId);
    if (!row) return null;
    const { question, lead } = extractSummaryLead(row.content_md);
    return {
      html: renderVoiceSummaryHtml(row.content_md),
      question,
      lead,
      sourceTopicCount: row.source_topic_count,
      sourceOpinionCount: row.source_opinion_count,
      sourceTopicIds: row.source_topic_ids,
      publishedAt: row.published_at,
    };
  },
  ["published-voice-summary"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS],
  }
);
