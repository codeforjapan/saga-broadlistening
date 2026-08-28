import "server-only";

import { BatchClient, SubmitJobCommand } from "@aws-sdk/client-batch";
import { getAwsCredentials } from "@/lib/aws-credentials";
import { env } from "@/lib/env";

/**
 * トピック分析・意見再抽出バックフィルを実行する AWS Batch ジョブを起動する。
 *
 * `SubmitJob` はジョブをキューに登録して即座に返るため、重い処理の完了は待たない。
 * 起動の成否のみを呼び出し側に返す（進捗は version / interview_report の状態で追う）。
 * EventBridge Scheduler による定期実行（`infra/aws-cdk`）と同じ Job Queue / Job Definition を使う。
 *
 * 必須env: TOPIC_ANALYSIS_BATCH_JOB_QUEUE_ARN, TOPIC_ANALYSIS_BATCH_JOB_DEFINITION_ARN
 *
 * @param args worker へ渡す引数。例: ["--mode=analyze", "--bill-id=...", "--version-id=..."]
 * @returns 作成された Batch ジョブの jobId
 */
export async function executeTopicAnalysisJob(
  args: string[]
): Promise<{ jobId: string }> {
  const { topicAnalysisBatchJobQueueArn, topicAnalysisBatchJobDefinitionArn } =
    env.aws;
  if (!topicAnalysisBatchJobQueueArn || !topicAnalysisBatchJobDefinitionArn) {
    throw new Error(
      "AWS Batch のenv（TOPIC_ANALYSIS_BATCH_JOB_QUEUE_ARN / TOPIC_ANALYSIS_BATCH_JOB_DEFINITION_ARN）が未設定です"
    );
  }

  // 呼び出しごとにクライアントを生成している（モジュールスコープでの使い回しはしていない）。
  // 管理画面からの低頻度な手動操作のため、クライアント生成コストは無視できる範囲と判断。
  const client = new BatchClient({
    region: env.aws.region,
    credentials: getAwsCredentials(),
  });

  const result = await client.send(
    new SubmitJobCommand({
      jobName: `topic-analysis-${Date.now()}`,
      jobQueue: topicAnalysisBatchJobQueueArn,
      jobDefinition: topicAnalysisBatchJobDefinitionArn,
      containerOverrides: { command: args },
    })
  );

  if (!result.jobId) {
    // SubmitJobはHTTP 200でもjobIdを返さない失敗があり得るため、握り潰さず
    // レスポンス全体をメッセージに含める。
    throw new Error(`SubmitJob returned no jobId: ${JSON.stringify(result)}`);
  }
  return { jobId: result.jobId };
}
