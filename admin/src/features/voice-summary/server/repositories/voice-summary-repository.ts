import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";

type VoiceSummaryInsert =
  Database["public"]["Tables"]["theme_voice_summaries"]["Insert"];

const SUMMARY_COLUMNS =
  "id, interview_config_id, topic_analysis_version_id, content_md, status, source_topic_count, source_opinion_count, source_topic_ids, model, prompt_version, generated_at, edited_by, edited_at, published_at, created_at";

/** テーマのまとめを新しい順に全件（履歴） */
export async function listVoiceSummaries(interviewConfigId: string) {
  const { data, error } = await createAdminClient()
    .from("theme_voice_summaries")
    .select(SUMMARY_COLUMNS)
    .eq("interview_config_id", interviewConfigId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to list voice summaries: ${error.message}`);
  }
  return data;
}

export type VoiceSummaryRow = Awaited<
  ReturnType<typeof listVoiceSummaries>
>[number];

export async function findVoiceSummaryById(id: string) {
  const { data, error } = await createAdminClient()
    .from("theme_voice_summaries")
    .select(SUMMARY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch voice summary: ${error.message}`);
  }
  return data;
}

export async function insertVoiceSummary(row: VoiceSummaryInsert) {
  const { data, error } = await createAdminClient()
    .from("theme_voice_summaries")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    throw new Error(`Failed to insert voice summary: ${error.message}`);
  }
  return data;
}

/** 下書きの本文を更新する。下書き以外（公開中・公開終了）は更新しない */
export async function updateVoiceSummaryDraft(params: {
  id: string;
  contentMd: string;
  editedBy: string;
}): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("theme_voice_summaries")
    .update({
      content_md: params.contentMd,
      edited_by: params.editedBy,
      edited_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("status", "draft")
    .select("id");
  if (error) {
    throw new Error(`Failed to update voice summary: ${error.message}`);
  }
  return data.length > 0;
}

/** 版を公開する。同じテーマで公開中だった版は archived になる（RPC で1トランザクション） */
export async function publishVoiceSummary(id: string) {
  const { error } = await createAdminClient().rpc(
    "publish_theme_voice_summary",
    { p_summary_id: id }
  );
  if (error) {
    throw new Error(`Failed to publish voice summary: ${error.message}`);
  }
}

/** 公開中の版を非公開（archived）にする。公開中でなければ何もせず false */
export async function archiveVoiceSummary(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("theme_voice_summaries")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("status", "published")
    .select("id");
  if (error) {
    throw new Error(`Failed to archive voice summary: ${error.message}`);
  }
  return data.length > 0;
}

/** テーマの公開中のトピック分析の版ID（なければ null） */
export async function findPublishedAnalysisVersionId(
  interviewConfigId: string
): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("topic_analysis_version")
    .select("id")
    .eq("interview_config_id", interviewConfigId)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch published analysis: ${error.message}`);
  }
  return data?.id ?? null;
}
