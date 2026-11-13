import { createAdminClient } from "@mirai-gikai/supabase";
import type { BackfillTargetOpinion } from "../shared/types";

// interviewConfigId 指定時のみテーマで絞り込むための埋め込みリレーション付き select。
// opinions → interview_sessions は NOT NULL の 1:1 関係なので、!inner を付けても
// 件数には影響しない。テーマ未指定（既定のポーリング経路）では join を避けるため
// 最小限の "id" / "id, interview_session_id" を使う。
const OPINION_SELECT_WITH_CONFIG =
  "id, interview_session_id, interview_sessions!inner(interview_config_id)";
const CONFIG_FILTER = "interview_sessions.interview_config_id";

const toTargets = (
  rows: { id: string; interview_session_id: string }[]
): BackfillTargetOpinion[] =>
  rows.map((r) => ({ opinionId: r.id, sessionId: r.interview_session_id }));

/** 意見件数を返す（pendingOnly=未再抽出のみ）。テーマ指定時は当該テーマに限定する。 */
async function countOpinions(
  interviewConfigId: string | undefined,
  pendingOnly: boolean
): Promise<number> {
  const supabase = createAdminClient();
  let query = interviewConfigId
    ? supabase
        .from("opinions")
        .select(OPINION_SELECT_WITH_CONFIG, { count: "exact", head: true })
        .eq(CONFIG_FILTER, interviewConfigId)
    : supabase.from("opinions").select("id", { count: "exact", head: true });
  if (pendingOnly) {
    query = query.is("opinions_reextracted_at", null);
  }
  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count opinions: ${error.message}`);
  }
  return count ?? 0;
}

/**
 * 未再抽出（opinions_reextracted_at IS NULL）の意見件数を返す。
 * 進捗表示・チャンク連鎖の継続判定に使う。テーマ指定時は当該テーマに限定する。
 */
export function countPendingReextraction(
  interviewConfigId?: string
): Promise<number> {
  return countOpinions(interviewConfigId, true);
}

/** opinions の総件数（進捗の分母表示用）。テーマ指定時は当該テーマに限定する。 */
export function countAllOpinions(interviewConfigId?: string): Promise<number> {
  return countOpinions(interviewConfigId, false);
}

/**
 * 未再抽出の意見を公開同意優先・古い順で limit 件取得する。
 * テーマ指定時は当該テーマに限定する。
 */
export async function findOpinionsToReextract(
  limit: number,
  interviewConfigId?: string
): Promise<BackfillTargetOpinion[]> {
  const supabase = createAdminClient();
  const base = interviewConfigId
    ? supabase
        .from("opinions")
        .select(OPINION_SELECT_WITH_CONFIG)
        .eq(CONFIG_FILTER, interviewConfigId)
    : supabase.from("opinions").select("id, interview_session_id");
  const { data, error } = await base
    .is("opinions_reextracted_at", null)
    .order("is_public_by_user", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch opinions to reextract: ${error.message}`);
  }
  return toTargets(data ?? []);
}

/**
 * 指定テーマの全意見の再抽出ウォーターマーク（opinions_reextracted_at）を NULL に戻す。
 * scope="all"（既処理含む全件やり直し）の起点。これにより以後は未再抽出として扱われ、
 * pending 件数を進捗の分母にできる（再実行の早期完了表示を防ぐ）。リセット件数を返す。
 *
 * 1ページ取得→更新を繰り返す。更新で NOT NULL から外れた行は次ページに残らないため、
 * 全件を一度にメモリへ載せずに（大規模テーマでもページサイズ分のみ）処理できる。
 */
export async function resetReextractionForInterviewConfig(
  interviewConfigId: string
): Promise<number> {
  const supabase = createAdminClient();
  const pageSize = 1000;
  let reset = 0;

  while (true) {
    // 未リセット（NOT NULL）の行を1ページ分だけ取得する。
    const { data, error } = await supabase
      .from("opinions")
      .select(OPINION_SELECT_WITH_CONFIG)
      .eq(CONFIG_FILTER, interviewConfigId)
      .not("opinions_reextracted_at", "is", null)
      .order("id", { ascending: true })
      .limit(pageSize);
    if (error) {
      throw new Error(`Failed to fetch opinions to reset: ${error.message}`);
    }

    const ids = (data ?? []).map((r) => r.id);
    if (ids.length === 0) break;

    const { error: updateError } = await supabase
      .from("opinions")
      .update({ opinions_reextracted_at: null })
      .in("id", ids);
    if (updateError) {
      throw new Error(
        `Failed to reset reextraction watermark: ${updateError.message}`
      );
    }
    reset += ids.length;

    if (ids.length < pageSize) break;
  }

  return reset;
}

/**
 * 再抽出を試行したが失敗した意見に処理時刻だけ記録する。
 * 公開同意優先の並びで失敗した意見が先頭に滞留して前進が止まるのを防ぐため、
 * 失敗時もウォーターマークを進める（再実行時は当該行を NULL に戻す）。
 */
export async function markReextractionAttempted(
  opinionId: string,
  reextractedAtIso: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("opinions")
    .update({ opinions_reextracted_at: reextractedAtIso })
    .eq("id", opinionId);

  if (error) {
    throw new Error(`Failed to mark reextraction attempted: ${error.message}`);
  }
}
