import { BatchClient, SubmitJobCommand } from "@aws-sdk/client-batch";
import { getAwsCredentials } from "@/lib/aws-credentials";
import { env } from "@/lib/env";
import { requireSecretHeader } from "@/lib/require-secret-header";

export const maxDuration = 30;

/**
 * Vercel OIDC Federation経由でトピック分析workerのbatch:SubmitJob権限が機能しているかを
 * 確認するための疎通確認エンドポイント（Vercel OIDCロールの権限テスト・呼び出し方の
 * サンプルを兼ねる）。実際に `--mode=analyze-all` のBatchジョブを起動する
 * （毎朝6:00 JSTのEventBridge Schedulerと同じ内容。対象議案が無ければworker側でskipする）。
 * 実際のUI組み込み（#49）では対象を選べるようにする想定。
 * `X-Aws-Test-Token` ヘッダーによる共有シークレット認証（管理者ログイン不要）。
 */
export async function POST(request: Request) {
  try {
    requireSecretHeader(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // 実処理（実際のトピック分析）が走るエンドポイントのため、起動されたことを記録する
  // （共有シークレット認証のため、requireAdminと違い「誰が」までは特定できない）。
  console.log("[aws-test/topic-analysis-batch] triggered");

  const { topicAnalysisBatchJobQueueArn, topicAnalysisBatchJobDefinitionArn } =
    env.aws;
  if (!topicAnalysisBatchJobQueueArn || !topicAnalysisBatchJobDefinitionArn) {
    return Response.json(
      {
        error:
          "TOPIC_ANALYSIS_BATCH_JOB_QUEUE_ARN / TOPIC_ANALYSIS_BATCH_JOB_DEFINITION_ARN が未設定です",
      },
      { status: 500 }
    );
  }

  try {
    const client = new BatchClient({
      region: env.aws.region,
      credentials: getAwsCredentials(),
    });

    const result = await client.send(
      new SubmitJobCommand({
        jobName: `aws-test-${Date.now()}`,
        jobQueue: topicAnalysisBatchJobQueueArn,
        jobDefinition: topicAnalysisBatchJobDefinitionArn,
        containerOverrides: { command: ["--mode=analyze-all"] },
      })
    );

    if (!result.jobId) {
      return Response.json(
        {
          ok: false,
          error: `SubmitJob returned no jobId: ${JSON.stringify(result)}`,
        },
        { status: 502 }
      );
    }
    return Response.json({ ok: true, jobId: result.jobId });
  } catch (error) {
    console.error("[aws-test/topic-analysis-batch] failed:", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
