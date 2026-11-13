import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

/** テーマの公開中のまとめ（なければ null）。公開中はテーマごとに1件 */
export async function findPublishedVoiceSummary(interviewConfigId: string) {
  const { data, error } = await createAdminClient()
    .from("theme_voice_summaries")
    .select(
      "content_md, source_topic_count, source_opinion_count, source_topic_ids, published_at"
    )
    .eq("interview_config_id", interviewConfigId)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch voice summary: ${error.message}`);
  }
  return data;
}
