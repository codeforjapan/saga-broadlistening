import { createAdminClient } from "@mirai-gikai/supabase";
import type { OpinionToTag } from "../utils/build-opinion-tags-prompt";

/** タグ付け対象の意見（1意見 = 1回のLLM呼び出し）。 */
export type TagTargetOpinion = {
  opinionId: string;
  sessionId: string;
  roleTitle: string | null;
};

// interviewConfigId で絞る場合のみテーマまでの join を付ける。
// opinion_segments → opinions → interview_sessions はすべて NOT NULL の 1:1 なので
// !inner でも件数は変わらない。
const CONFIG_JOIN =
  "opinions!inner(interview_sessions!inner(interview_config_id))";
const SEGMENT_WITH_CONFIG = `id, ${CONFIG_JOIN}`;
const SEGMENT_CONFIG_FILTER = "opinions.interview_sessions.interview_config_id";

/**
 * 1意見あたりの論点数の上限（opinionSchema の `opinions: z.array(...).max(3)`
 * と opinion_segments.opinion_index の 0..2 に対応）。
 * 意見単位で束ねるためのページサイズ算出に使う。
 */
const MAX_SEGMENTS_PER_OPINION = 3;

/** タグ未抽出（tags_extracted_at IS NULL）の論点件数。進捗表示と継続判定に使う。 */
export async function countPendingTagExtraction(
  interviewConfigId?: string
): Promise<number> {
  const supabase = createAdminClient();
  const query = interviewConfigId
    ? supabase
        .from("opinion_segments")
        .select(SEGMENT_WITH_CONFIG, { count: "exact", head: true })
        .eq(SEGMENT_CONFIG_FILTER, interviewConfigId)
    : supabase
        .from("opinion_segments")
        .select("id", { count: "exact", head: true });
  const { count, error } = await query.is("tags_extracted_at", null);

  if (error) {
    throw new Error(`Failed to count opinion segments: ${error.message}`);
  }
  return count ?? 0;
}

/**
 * タグ未抽出の論点を持つ意見を最大 limit 件返す。
 *
 * タグ付けは1意見分の論点をまとめて1回のLLM呼び出しで処理するため、対象は
 * 意見単位で束ねる。Supabase JS に DISTINCT が無いので、1意見あたりの
 * 論点上限（MAX_SEGMENTS_PER_OPINION）を掛けた行数を引いて JS 側で重複排除する。
 */
export async function findOpinionsToTag(
  limit: number,
  interviewConfigId?: string
): Promise<TagTargetOpinion[]> {
  const supabase = createAdminClient();
  // 必要なのは opinion_id だけ。テーマ指定時のみテーマまでの join を足す。
  const base = interviewConfigId
    ? supabase
        .from("opinion_segments")
        .select(`opinion_id, ${CONFIG_JOIN}`)
        .eq(SEGMENT_CONFIG_FILTER, interviewConfigId)
    : supabase.from("opinion_segments").select("opinion_id");

  const { data, error } = await base
    .is("tags_extracted_at", null)
    .order("opinion_id", { ascending: true })
    .limit(limit * MAX_SEGMENTS_PER_OPINION);

  if (error) {
    throw new Error(`Failed to fetch opinions to tag: ${error.message}`);
  }

  const seen = new Set<string>();
  const opinionIds: string[] = [];
  for (const row of data ?? []) {
    const opinionId = row.opinion_id;
    if (seen.has(opinionId)) continue;
    seen.add(opinionId);
    opinionIds.push(opinionId);
    if (opinionIds.length >= limit) break;
  }
  if (opinionIds.length === 0) return [];

  // 立場（role_title）はプロンプトの接地に使うため別途まとめて引く。
  // 並びは公開同意優先・古い順にするが、対象意見の集合自体は1段目の
  // opinion_id 昇順で決まっているので、この並べ替えが効くのは
  // チャンク内の処理順だけ（ジョブ全体で公開データが先に埋まるわけではない）。
  const { data: opinions, error: opinionError } = await supabase
    .from("opinions")
    .select("id, interview_session_id, role_title")
    .in("id", opinionIds)
    .order("is_public_by_user", { ascending: false })
    .order("created_at", { ascending: true });
  if (opinionError) {
    throw new Error(`Failed to fetch opinion roles: ${opinionError.message}`);
  }

  return (opinions ?? []).map((o) => ({
    opinionId: o.id,
    sessionId: o.interview_session_id,
    roleTitle: o.role_title,
  }));
}

/** 指定意見のタグ未抽出の論点を opinion_index 昇順で返す。 */
export async function findUntaggedOpinionSegments(
  opinionId: string
): Promise<OpinionToTag[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinion_segments")
    .select(
      "opinion_index, title, content, contextual_quote, source_message_id"
    )
    .eq("opinion_id", opinionId)
    .is("tags_extracted_at", null)
    .order("opinion_index", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch untagged opinion segments: ${error.message}`
    );
  }
  return data ?? [];
}

/** 1論点へ書き込むタグ。 */
export type OpinionTagsUpdate = {
  opinionIndex: number;
  concern: string | null;
  proposal: string | null;
  reasoningTypes: string[];
};

/**
 * 論点のタグ列だけを更新する（title/content 等の本文は触らない）。
 *
 * 本文を作り直さないことが重要。既存の再抽出経路はプロンプトごと論点を再生成するため
 * opinion_index に載る内容が変わり、UUID を参照している topic_opinion の割当が
 * 実質ずれる（公開中のトピック分析の引用が差し替わる）。タグ付けはこれを避けるために
 * 追加専用にしている。
 *
 * 更新条件に `tags_extracted_at IS NULL` を残して compare-and-set にしている。
 * バックフィルは本番稼働中に走るため、対象抽出から更新までの間に同じ意見へ
 * ライブ生成の同期や再抽出が当たることがあり、無条件 UPDATE だと本物のタグを
 * 後から自分の生成結果で上書きしてしまう。
 *
 * 論点ごとに1文へ分けているが、途中で失敗しても未更新の行は
 * `tags_extracted_at IS NULL` のまま残り次回実行で再試行されるため、
 * 半端な状態は自己修復する。
 */
export async function updateOpinionSegmentTags(
  opinionId: string,
  updates: OpinionTagsUpdate[],
  taggedAtIso: string
): Promise<void> {
  const supabase = createAdminClient();

  for (const update of updates) {
    const { error } = await supabase
      .from("opinion_segments")
      .update({
        concern: update.concern,
        proposal: update.proposal,
        reasoning_types: update.reasoningTypes,
        tags_extracted_at: taggedAtIso,
      })
      .eq("opinion_id", opinionId)
      .eq("opinion_index", update.opinionIndex)
      .is("tags_extracted_at", null);

    if (error) {
      throw new Error(
        `Failed to update opinion segment tags: ${error.message}`
      );
    }
  }
}

/**
 * LLM が特定の論点を返さなかった場合に、その論点のウォーターマークだけ進める。
 * 進めないと同じ意見が毎チャンク先頭に滞留して前進が止まる。
 */
export async function markOpinionSegmentsTagAttempted(
  opinionId: string,
  opinionIndexes: number[],
  taggedAtIso: string
): Promise<void> {
  if (opinionIndexes.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("opinion_segments")
    .update({ tags_extracted_at: taggedAtIso })
    .eq("opinion_id", opinionId)
    .in("opinion_index", opinionIndexes)
    // 直前に立ったライブ生成のウォーターマークを空振りマークで塗り替えない。
    .is("tags_extracted_at", null);

  if (error) {
    throw new Error(
      `Failed to mark opinion segments tag attempted: ${error.message}`
    );
  }
}

/**
 * 指定テーマの論点のタグ抽出ウォーターマークを NULL に戻す（scope="all" の起点）。
 * 1ページ取得→更新を繰り返し、全件をメモリに載せずに処理する。
 */
export async function resetTagExtractionForInterviewConfig(
  interviewConfigId: string
): Promise<number> {
  const supabase = createAdminClient();
  const pageSize = 1000;
  let reset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("opinion_segments")
      .select(SEGMENT_WITH_CONFIG)
      .eq(SEGMENT_CONFIG_FILTER, interviewConfigId)
      .not("tags_extracted_at", "is", null)
      .order("id", { ascending: true })
      .limit(pageSize);
    if (error) {
      throw new Error(
        `Failed to fetch opinion segments to reset: ${error.message}`
      );
    }

    const ids = (data ?? []).map((r) => r.id);
    if (ids.length === 0) break;

    const { error: updateError } = await supabase
      .from("opinion_segments")
      .update({ tags_extracted_at: null })
      .in("id", ids);
    if (updateError) {
      throw new Error(
        `Failed to reset tag extraction watermark: ${updateError.message}`
      );
    }
    reset += ids.length;

    if (ids.length < pageSize) break;
  }

  return reset;
}
