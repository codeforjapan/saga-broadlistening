import type { Database } from "@mirai-gikai/supabase";
import { createClient } from "@supabase/supabase-js";

export type AdminClient = ReturnType<typeof createAdminClient>;

type TableName = keyof Database["public"]["Tables"];

export function createAdminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

/**
 * 全行にマッチさせるためのセンチネル値。
 * フィルタなしの DELETE は事故を招くため、実データには存在しない
 * ゼロ UUID を除外する形で全行を対象にする。
 */
const ALL_ROWS_SENTINEL = "00000000-0000-0000-0000-000000000000";

/**
 * 削除対象テーブル（FK の葉から順に並べる）。
 *
 * - `audit_logs` は追記専用トリガ（audit_logs_append_only）が DELETE を
 *   拒否するため、ここには含めない。
 * - `portal_controls` はマイグレーションが `default` 行を 1 行だけ投入する
 *   設定テーブルなので、削除ではなく resetPortalControls() で初期値へ戻す。
 * - `chat_usage_events` は Epic #54 でも廃止されていないため削除対象に含める。
 */
const TABLES_TO_CLEAR = [
  "topic_opinion",
  "topic",
  "topic_analysis_version",
  "topic_analysis_classifications",
  "topic_analysis_topics",
  "topic_analysis_versions",
  "opinion_reactions",
  "opinion_segments",
  "opinions",
  "interview_rating_feedbacks",
  "interview_messages",
  "interview_sessions",
  "interview_questions",
  "policies_interview_configs",
  "interview_configs",
  "guard_events",
  "chat_usage_events",
  "chat_messages",
  "chat_sessions",
  "preview_tokens",
  "policies_tags",
  "policy_contents",
  "policies",
  "tags",
] as const satisfies readonly TableName[];

/**
 * 単一列の `id` を持たない中間テーブルは、代わりに NOT NULL の uuid 列で
 * フィルタする（`id` を指定すると PostgREST が「列が存在しない」で失敗する）。
 */
const FILTER_COLUMN_OVERRIDES: Partial<Record<TableName, string>> = {
  topic_opinion: "topic_id",
  policies_interview_configs: "policy_id",
  policies_tags: "policy_id",
};

export async function clearAllData(supabase: AdminClient) {
  console.log("🧹 Clearing existing data...");

  for (const table of TABLES_TO_CLEAR) {
    const filterColumn = FILTER_COLUMN_OVERRIDES[table] ?? "id";
    const { error } = await supabase
      .from(table)
      .delete()
      .neq(filterColumn, ALL_ROWS_SENTINEL);

    if (error) {
      throw new Error(`Failed to clear ${table}: ${error.message}`);
    }
  }

  await resetPortalControls(supabase);

  console.log("✅ Cleared existing data");
}

/** 緊急停止スイッチを初期状態へ戻す（1 行固定のため削除ではなく更新する） */
async function resetPortalControls(supabase: AdminClient) {
  const { error } = await supabase
    .from("portal_controls")
    .update({
      emergency_stop: false,
      policy_chat_stop: false,
      interview_stop: false,
      notice_message: null,
    })
    .eq("id", "default");

  if (error) {
    throw new Error(`Failed to reset portal_controls: ${error.message}`);
  }
}
