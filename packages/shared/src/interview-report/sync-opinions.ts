import "server-only";

import type { createAdminClient } from "@mirai-gikai/supabase";
import type { OpinionSegmentInsert } from "./build-opinion-rows";

/** 呼び出し側が渡す Supabase クライアント（createAdminClient の戻り値）。 */
type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * 意見の論点を opinion_segments（正規化プロジェクション）へ同期する。
 *
 * opinion_segments.id(UUID) を安定させるため delete+insert ではなく
 * ON CONFLICT (opinion_id, opinion_index) DO UPDATE で upsert する（§3.1）。
 * 論点数が減った再生成では、新配列長以降の opinion_index を持つ行のみ削除する。
 *
 * web のインタビュー完了時 dual-write と admin の再抽出バックフィルで共通利用する。
 */
export async function syncOpinionSegments(
  supabase: AdminClient,
  opinionId: string,
  rows: OpinionSegmentInsert[]
): Promise<void> {
  if (rows.length > 0) {
    const { error } = await supabase
      .from("opinion_segments")
      .upsert(rows, { onConflict: "opinion_id,opinion_index" });
    if (error) {
      throw new Error(`Failed to upsert opinion segments: ${error.message}`);
    }
  }

  // 論点数が縮んだ（または0になった）場合に末尾の古い行を削除
  const { error: deleteError } = await supabase
    .from("opinion_segments")
    .delete()
    .eq("opinion_id", opinionId)
    .gte("opinion_index", rows.length);
  if (deleteError) {
    throw new Error(
      `Failed to prune stale opinion segments: ${deleteError.message}`
    );
  }
}
