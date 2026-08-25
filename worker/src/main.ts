import {
  type AnalysisStrategy,
  runAnalysis,
  runAnalyzeAll,
} from "@mirai-gikai/topic-analysis-core/analyze";
import { runBackfill } from "@mirai-gikai/topic-analysis-core/backfill";
import { resolveBackfillParams } from "@mirai-gikai/topic-analysis-core/backfill-params";
import { runTagBackfill } from "@mirai-gikai/topic-analysis-core/tag-backfill";

/**
 * Cloud Run Job のエントリポイント。
 *
 * 起動例:
 *   tsx src/main.ts --mode=analyze --interview-config-id=<uuid> --version-id=<uuid>                 # フル分析（既定）
 *   tsx src/main.ts --mode=analyze --interview-config-id=<uuid> --version-id=<uuid> --strategy=incremental # 差分（増分）
 *   tsx src/main.ts --mode=analyze-all                                   # 全テーマ・差分（既定 incremental）
 *   tsx src/main.ts --mode=analyze-all --strategy=full                   # 全テーマ・フル
 *   tsx src/main.ts --mode=backfill                                          # 未再抽出を全テーマで処理
 *   tsx src/main.ts --mode=backfill --interview-config-id=<uuid>             # 指定テーマの未再抽出のみ
 *   tsx src/main.ts --mode=backfill --interview-config-id=<uuid> --scope=all # 指定テーマを全件やり直し
 *   tsx src/main.ts --mode=backfill --model=openai/gpt-5.2                   # 使用モデルを指定（省略時は既定）
 *   tsx src/main.ts --mode=tag-backfill                                          # タグ未抽出の論点を全テーマで処理
 *   tsx src/main.ts --mode=tag-backfill --interview-config-id=<uuid>             # 指定テーマのタグ未抽出のみ
 *   tsx src/main.ts --mode=tag-backfill --interview-config-id=<uuid> --scope=all # 指定テーマのタグを全件やり直し
 *
 * 必須env: SUPABASE_URL, SUPABASE_SECRET_KEY, AI_GATEWAY_API_KEY
 */

type Mode = "analyze" | "analyze-all" | "backfill" | "tag-backfill";

/** --strategy をパースする（未指定・不正値は fallback）。 */
function parseStrategy(
  value: string | undefined,
  fallback: AnalysisStrategy
): AnalysisStrategy {
  if (value === "full" || value === "incremental") return value;
  if (value !== undefined) {
    throw new Error(
      `Invalid --strategy=${value} (expected "full" or "incremental")`
    );
  }
  return fallback;
}

/** `--key=value` 形式の引数だけをパースする（Cloud Run の --args 渡しに合わせる）。 */
function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

function requireEnv(name: string): void {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.mode as Mode | undefined;

  // 接続情報が無ければ即座に失敗させる（部分実行を避ける）。
  requireEnv("SUPABASE_URL");
  requireEnv("SUPABASE_SECRET_KEY");
  requireEnv("AI_GATEWAY_API_KEY");

  if (mode === "analyze") {
    const versionId = args["version-id"];
    const interviewConfigId = args["interview-config-id"];
    if (!versionId || !interviewConfigId) {
      throw new Error(
        "analyze mode requires --version-id=<uuid> and --interview-config-id=<uuid>"
      );
    }
    const strategy = parseStrategy(args.strategy, "full");
    await runAnalysis(versionId, interviewConfigId, strategy);
    return;
  }

  if (mode === "analyze-all") {
    // 全テーマを順次分析（既定は増分）。version 行は各テーマごとに内部で作成する。
    const strategy = parseStrategy(args.strategy, "incremental");
    await runAnalyzeAll(strategy);
    return;
  }

  if (mode === "backfill") {
    const resolved = resolveBackfillParams({
      interviewConfigId: args["interview-config-id"],
      scope: args.scope,
      model: args.model,
    });
    if (!resolved.ok) {
      throw new Error(`backfill mode: ${resolved.error}`);
    }
    await runBackfill(resolved.params);
    return;
  }

  // 既存の論点へタグ（concern/proposal/reasoning_types）だけを追加する経路。
  // 論点の本文は再生成しないため、公開中のトピック分析の引用が動かない。
  if (mode === "tag-backfill") {
    const resolved = resolveBackfillParams({
      interviewConfigId: args["interview-config-id"],
      scope: args.scope,
      model: args.model,
    });
    if (!resolved.ok) {
      throw new Error(`tag-backfill mode: ${resolved.error}`);
    }
    await runTagBackfill(resolved.params);
    return;
  }

  throw new Error(
    `Unknown --mode=${mode ?? "(none)"} (expected "analyze" / "analyze-all" / "backfill" / "tag-backfill")`
  );
}

main()
  .then(() => {
    console.log("[worker] done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[worker] failed:", error);
    process.exit(1);
  });
