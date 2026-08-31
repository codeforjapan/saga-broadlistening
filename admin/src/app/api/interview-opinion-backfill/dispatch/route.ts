import { resolveBackfillParams } from "@mirai-gikai/topic-analysis-core/backfill-params";
import {
  countPendingReextraction,
  resetReextractionForInterviewConfig,
} from "@mirai-gikai/topic-analysis-core/repository";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { executeTopicAnalysisJob } from "@/lib/topic-analysis-batch";

export const maxDuration = 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * 意見再抽出バックフィルの入口（Admin 手動トリガ）。
 * リクエストボディでテーマスコープ（interviewConfigId）・対象範囲（scope）・
 * 使用モデル（model）を指定できる。
 * 対象の意見があれば Cloud Run Job（backfill モード）を起動する。
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  // 空ボディ（旧クライアント互換）は既定値（全テーマ・未再抽出）として扱うが、
  // 壊れた JSON や非オブジェクト（null / 配列 / プリミティブ）は黙って既定実行に
  // せず 400 で弾く（意図しない起動・プロパティアクセスでの 500 を防ぐ）。
  let body: {
    interviewConfigId?: unknown;
    scope?: unknown;
    model?: unknown;
  } = {};
  const raw = await request.text();
  if (raw.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ error: "リクエストボディの JSON が不正です" }, 400);
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return json(
        { error: "リクエストボディはオブジェクトである必要があります" },
        400
      );
    }
    body = parsed as {
      interviewConfigId?: unknown;
      scope?: unknown;
      model?: unknown;
    };
  }

  const resolved = resolveBackfillParams({
    interviewConfigId: body.interviewConfigId,
    scope: body.scope,
    model: body.model,
  });
  if (!resolved.ok) {
    return json({ error: resolved.error }, 400);
  }
  const { interviewConfigId, scope, model } = resolved.params;

  try {
    // scope="all" は起動前に同期的にウォーターマークをリセットする。
    // これで pending=全件 となり、UI が即座に進捗を分母込みで把握できるため、
    // 「既に再抽出済みのテーマで pending=0 を見て早期完了表示→重複起動」を防ぐ。
    // worker 側も冪等に再リセットするが、ここでの同期リセットが起動直後の競合を消す。
    if (scope === "all" && interviewConfigId) {
      await resetReextractionForInterviewConfig(interviewConfigId);
    }

    // 対象件数（未再抽出件数）を確認し、0 件なら起動しない。
    // all はリセット後なので pending=全件、pending はそのまま未再抽出件数。
    const pending = await countPendingReextraction(interviewConfigId);
    if (pending === 0) {
      return json({ started: false, pending });
    }

    const args = ["--mode=backfill", `--scope=${scope}`];
    if (interviewConfigId) {
      args.push(`--interview-config-id=${interviewConfigId}`);
    }
    if (model) {
      args.push(`--model=${model}`);
    }

    try {
      await executeTopicAnalysisJob(args);
    } catch (triggerError) {
      const message =
        triggerError instanceof Error ? triggerError.message : "trigger failed";
      console.error("[OpinionBackfill] Failed to trigger job:", triggerError);
      return json({ error: message }, 502);
    }

    return json({ started: true, pending });
  } catch (error) {
    console.error("[OpinionBackfill] dispatch failed:", error);
    return json(
      { error: error instanceof Error ? error.message : "dispatch failed" },
      500
    );
  }
}
