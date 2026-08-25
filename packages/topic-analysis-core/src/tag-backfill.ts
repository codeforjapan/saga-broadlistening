import {
  countPendingTagExtraction,
  findOpinionsToTag,
  resetTagExtractionForInterviewConfig,
} from "./repositories/opinion-tags-repository";
import {
  extractOpinionTagsForReport,
  type GenerateTagsFn,
} from "./services/extract-opinion-tags";
import type { BackfillScope } from "./shared/backfill-params";
import {
  OPINION_TAG_BACKFILL_CHUNK_SIZE,
  OPINION_TAG_BACKFILL_CONCURRENCY,
} from "./shared/constants";
import {
  runWatermarkBackfill,
  type WatermarkBackfillSteps,
} from "./utils/run-watermark-backfill";

type TagDeps = { generateTags?: GenerateTagsFn; model?: string };

export type TagBackfillOptions = TagDeps & {
  /** 指定テーマに限定して実行する。未指定なら全テーマ。 */
  interviewConfigId?: string;
  /**
   * "pending"（既定）: タグ未抽出の論点のみ。
   * "all": 既にタグ付け済みも含めて全件やり直す（interviewConfigId 必須）。
   */
  scope?: BackfillScope;
};

/** 共通ドライバに渡すステップ定義を組み立てる。 */
function buildSteps(
  deps: { interviewConfigId?: string } & TagDeps
): WatermarkBackfillSteps<
  Awaited<ReturnType<typeof findOpinionsToTag>>[number]
> {
  const { interviewConfigId, generateTags, model } = deps;
  return {
    label: "tag backfill",
    chunkSize: OPINION_TAG_BACKFILL_CHUNK_SIZE,
    concurrency: OPINION_TAG_BACKFILL_CONCURRENCY,
    findTargets: (limit) => findOpinionsToTag(limit, interviewConfigId),
    processTarget: (target) =>
      extractOpinionTagsForReport(target, { generateTags, model }),
    // 残件は論点単位で数える（対象抽出は意見単位だが進捗の分母は論点）。
    countRemaining: () => countPendingTagExtraction(interviewConfigId),
  };
}

/**
 * 意見タグ付けバックフィルを実行する（Cloud Run Job のメイン処理）。
 * - scope="pending"（既定）: タグ未抽出の論点をウォーターマーク方式で全件処理。
 * - scope="all": 指定テーマのウォーターマークをリセットしてから全件やり直す
 *   （interviewConfigId 必須）。
 */
export async function runTagBackfill(
  options: TagBackfillOptions = {}
): Promise<void> {
  const { interviewConfigId, scope = "pending", generateTags, model } = options;
  console.log(
    `[topic-analysis] start opinion tag backfill (scope=${scope} config=${interviewConfigId ?? "all"} model=${model ?? "default"})`
  );

  if (scope === "all") {
    // interviewConfigId 必須は resolveBackfillParams でも検証しているが、
    // 直接呼び出しでも全テーマリセットが起きないよう不変条件として残す。
    if (!interviewConfigId) {
      throw new Error('tag backfill scope="all" requires an interviewConfigId');
    }
    const reset = await resetTagExtractionForInterviewConfig(interviewConfigId);
    console.log(
      `[topic-analysis] reset ${reset} tag watermark(s) for config=${interviewConfigId}`
    );
  }

  await runWatermarkBackfill(
    buildSteps({ interviewConfigId, generateTags, model })
  );
}
