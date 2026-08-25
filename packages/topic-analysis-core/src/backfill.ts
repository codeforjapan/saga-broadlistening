import {
  countPendingReextraction,
  findOpinionsToReextract,
  resetReextractionForInterviewConfig,
} from "./repositories/backfill-repository";
import {
  type GenerateReportFn,
  reextractReportOpinions,
} from "./services/reextract-report-opinions";
import type { BackfillScope } from "./shared/backfill-params";
import type { BackfillTargetOpinion } from "./shared/types";
import {
  OPINION_BACKFILL_CHUNK_SIZE,
  OPINION_BACKFILL_CONCURRENCY,
} from "./shared/constants";
import {
  type BackfillChunkResult,
  runWatermarkBackfill,
  runWatermarkBackfillChunk,
  type WatermarkBackfillSteps,
} from "./utils/run-watermark-backfill";

export type { BackfillChunkResult };

/** 再抽出1件あたりの依存（生成関数の差し替え・使用モデル）。 */
type ReextractDeps = { generateReport?: GenerateReportFn; model?: string };

export type BackfillOptions = ReextractDeps & {
  /** 指定テーマに限定して実行する。未指定なら全テーマ。 */
  interviewConfigId?: string;
  /**
   * "pending"（既定）: 未再抽出の意見のみ。
   * "all": 既に再抽出済みも含めて全件やり直す（interviewConfigId 必須）。
   */
  scope?: BackfillScope;
};

/** 共通ドライバに渡すステップ定義を組み立てる。 */
function buildSteps(
  deps: { interviewConfigId?: string } & ReextractDeps
): WatermarkBackfillSteps<BackfillTargetOpinion> {
  const { interviewConfigId, generateReport, model } = deps;
  return {
    label: "backfill",
    chunkSize: OPINION_BACKFILL_CHUNK_SIZE,
    concurrency: OPINION_BACKFILL_CONCURRENCY,
    findTargets: (limit) => findOpinionsToReextract(limit, interviewConfigId),
    processTarget: (target) =>
      reextractReportOpinions(target, { generateReport, model }),
    countRemaining: () => countPendingReextraction(interviewConfigId),
  };
}

/**
 * 未再抽出の意見を1チャンク分（最大 CHUNK_SIZE 件）処理する。
 * チャンク内は CONCURRENCY 件ずつ並列実行する。
 * 成功・スキップはウォーターマークを進めるが、失敗（生成エラー等）は進めない。
 */
export function runOpinionBackfillChunk(
  deps: { interviewConfigId?: string } & ReextractDeps = {}
): Promise<BackfillChunkResult> {
  return runWatermarkBackfillChunk(buildSteps(deps));
}

/**
 * 意見再抽出バックフィルを実行する（Cloud Run Job のメイン処理）。
 * - scope="pending"（既定）: 未再抽出の意見をウォーターマーク方式で全件処理。
 * - scope="all": 指定テーマのウォーターマークを一旦リセットしてから全件処理し直す
 *   （interviewConfigId 必須）。リセットにより全件が未再抽出扱いになるため、
 *   進捗（pending）が正しく分母になる。
 * - model: 再抽出に使う AI モデル（未指定なら OPINION_BACKFILL_MODEL）。
 */
export async function runBackfill(
  options: BackfillOptions = {}
): Promise<void> {
  const {
    interviewConfigId,
    scope = "pending",
    generateReport,
    model,
  } = options;
  console.log(
    `[topic-analysis] start opinion backfill (scope=${scope} config=${interviewConfigId ?? "all"} model=${model ?? "default"})`
  );

  if (scope === "all") {
    if (!interviewConfigId) {
      throw new Error('backfill scope="all" requires an interviewConfigId');
    }
    const reset = await resetReextractionForInterviewConfig(interviewConfigId);
    console.log(
      `[topic-analysis] reset ${reset} reextraction watermark(s) for config=${interviewConfigId}`
    );
  }

  await runWatermarkBackfill(
    buildSteps({ interviewConfigId, generateReport, model })
  );
}
