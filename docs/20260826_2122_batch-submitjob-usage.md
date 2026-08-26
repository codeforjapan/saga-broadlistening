# AWS Batch (topic-analysis worker) の起動方法

トピック分析・意見再抽出バックフィルworker（`worker/`）を AWS Batch 経由で起動する方法をまとめる。実行基盤自体は `infra/aws-cdk/lib/stacks/topic-analysis-stack.ts`（GitHub Issue #48 / #66）で構築済み。admin（Vercel）からの実際の起動処理はまだコード化されていない（GitHub Issue #49で対応予定）ため、本ドキュメントはその実装時の参考、および手動での動作確認手順として用意する。

## 前提: 何が作られているか

`TopicAnalysisStack` が以下を作成する。

| リソース | 名前（`<env>` は `dev`/`stg`/`prd`） |
| --- | --- |
| Job Queue | `mirai-gikai-topic-analysis-<env>` |
| Job Definition | `mirai-gikai-topic-analysis-worker-<env>` |
| ECR リポジトリ | `mirai-gikai-topic-analysis-worker-<env>` |
| ロググループ | `/mirai-gikai/topic-analysis-worker-<env>` |

Job Definition に登録済みの `command` は `["--mode=analyze-all"]`（既定値）。実際に起動する際は `containerOverrides.command` で上書きする。`worker/src/main.ts` が受け付ける `--mode` は以下の3種類（詳細は `worker/src/main.ts` のコメント参照）。

```
--mode=analyze --bill-id=<uuid> --version-id=<uuid> [--strategy=full|incremental]
--mode=analyze-all [--strategy=full|incremental]
--mode=backfill [--bill-id=<uuid>] [--scope=all] [--model=<model-id>]
```

## 権限: 誰が起動できるか

`batch:SubmitJob` は以下の2つのIAMロールに、Job Queue/Job Definition ARN限定で付与されている（`iam:PassRole` は不要 — SubmitJobはJob Definition登録時に確定した`jobRole`/`executionRole`を使うため）。

1. **EventBridge Scheduler の `SchedulerExecutionRole`**（`topic-analysis-stack.ts`） — 毎朝6:00 JSTの定期実行用
2. **Vercel OIDC の `VercelBedrockAccessRole`**（`vercel-oidc-stack.ts`、本変更で追加） — admin からの手動起動用（#49で実装予定）

両方とも同じ `createSubmitTopicAnalysisJobPolicyStatement()`（`topic-analysis-stack.ts` からexport）を使っており、権限の中身は完全に一致する。

## 手動実行（AWS CLI）

ローカル/運用者が動作確認する場合。`assignPublicIp`・subnet・security groupの指定は**不要**（ECS RunTaskと違い、ネットワーク設定はCompute Environment側に一度だけ設定されているため）。

```bash
aws batch submit-job \
  --job-name manual-test \
  --job-queue mirai-gikai-topic-analysis-<env> \
  --job-definition mirai-gikai-topic-analysis-worker-<env> \
  --container-overrides command=--mode=analyze-all \
  --profile <profile> --region ap-northeast-1

# ログを確認
aws logs tail /mirai-gikai/topic-analysis-worker-<env> --follow --profile <profile> --region ap-northeast-1
```

`--bill-id`/`--version-id` を渡す場合は `command` をカンマ区切りで複数指定する。

```bash
aws batch submit-job \
  --job-name manual-analyze \
  --job-queue mirai-gikai-topic-analysis-<env> \
  --job-definition mirai-gikai-topic-analysis-worker-<env> \
  --container-overrides command=--mode=analyze,--bill-id=<uuid>,--version-id=<uuid> \
  --profile <profile> --region ap-northeast-1
```

## コードから起動する（#49実装時の参考）

`admin/src/lib/cloud-run-job.ts`（現行のGCP Cloud Run Job起動処理）を置き換える形で、`@aws-sdk/client-batch` + `@vercel/oidc-aws-credentials-provider` を使う。依存追加: `@aws-sdk/client-batch`（admin）。

```ts
import "server-only";
import { BatchClient, SubmitJobCommand } from "@aws-sdk/client-batch";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { env } from "@/lib/env";

/**
 * トピック分析・意見再抽出バックフィルworkerのBatchジョブを起動する。
 *
 * SubmitJobは同期的にジョブ登録を行い、jobIdを返す（ECS RunTaskと異なり
 * "成功レスポンスの中にfailuresが入っている"という握りつぶしやすい失敗形は無く、
 * 容量不足・権限不足等は例外としてthrowされる）。
 *
 * @param args worker へ渡す引数。例: ["--mode=analyze", "--bill-id=...", "--version-id=..."]
 * @returns 作成されたジョブのID
 */
export async function submitTopicAnalysisJob(
  args: string[]
): Promise<{ jobId: string }> {
  const client = new BatchClient({
    region: env.aws.region,
    credentials: env.aws.roleArn
      ? awsCredentialsProvider({
          roleArn: env.aws.roleArn,
          audience: "sts.amazonaws.com",
        })
      : // ローカル開発ではVercel OIDCが使えないため ~/.aws の資格情報にフォールバックする
        fromNodeProviderChain(),
  });

  const result = await client.send(
    new SubmitJobCommand({
      jobName: `topic-analysis-${Date.now()}`,
      jobQueue: env.aws.batchJobQueueArn,
      jobDefinition: env.aws.batchJobDefinitionArn,
      containerOverrides: { command: args },
    })
  );

  if (!result.jobId) {
    throw new Error(`SubmitJob returned no jobId: ${JSON.stringify(result)}`);
  }
  return { jobId: result.jobId };
}
```

### 必要な環境変数（Vercel admin プロジェクト）

| 変数 | 説明 |
| --- | --- |
| `AWS_REGION` | `ap-northeast-1`（Vercelが上書きするので明示必須） |
| `AWS_ROLE_ARN` | `VercelOidcStack` の `VercelBedrockAccessRoleArn` Output（`MiraiGikaiVercelBedrockAccessRole-<env>` のARN） |
| `TOPIC_ANALYSIS_BATCH_JOB_QUEUE_ARN` | `mirai-gikai-topic-analysis-<env>` のJob Queue ARN |
| `TOPIC_ANALYSIS_BATCH_JOB_DEFINITION_ARN` | `mirai-gikai-topic-analysis-worker-<env>` のJob Definition ARN |

`ECS_*`のような汎用的な接頭辞は避け、`TOPIC_ANALYSIS_BATCH_*`のようにこのworker専用だと
分かる名前にすること。将来他のBatchワークロードが増えた際に名前が衝突・混同しないようにするため。

Job Queue/Job Definition ARNは、`TopicAnalysisStack` がCfnOutputとして出力しているので
以下で取得できる（`aws batch describe-job-queues`等を都度叩く必要はない）。

```bash
aws cloudformation describe-stacks \
  --stack-name MiraiGikaiTopicAnalysisStack-<env> \
  --profile <profile> --region ap-northeast-1 \
  --query "Stacks[0].Outputs[?OutputKey=='JobQueueArnOutput' || OutputKey=='JobDefinitionArnOutput']" \
  --output table
```

Job Queue/Job Definition ARNは `aws batch describe-job-queues` / `describe-job-definitions` で取得するか、`cdk deploy` 実行者に確認する（現状CfnOutputとしては出力していないので、必要なら `TopicAnalysisStack` にOutputを追加すること）。

### ECS RunTaskとの違い（#49の元設計からの変更点）

issue #49はもともとECS RunTask前提で書かれていたが、#66でBatchに移行したため以下が変わっている。

- `networkConfiguration`（subnet/securityGroups）の指定が**不要**になった（呼び出し側がインフラの詳細を知らなくて済む、が今回のIAM権限追加の動機そのもの）
- レスポンスの失敗形が変わった: ECS RunTaskは `tasks: []` + `failures: [...]` という「HTTP 200だが実質失敗」の形を取り得るため、`response.ok` だけでなく `failures` を見る必要があった。Batch SubmitJobはそのような形を取らず、失敗時は例外がthrowされる（`ClientException`/`ServerException` 等）。呼び出し側の実装は普通に `try/catch` すればよい。
- 明示タイムアウト（旧実装は15s）は`BatchClient`の `requestHandler` 設定等で同様に付けることを推奨する。

## 関連

- `infra/aws-cdk/lib/stacks/topic-analysis-stack.ts`（Job Queue/Job Definition/EventBridge Schedulerの定義）
- `infra/aws-cdk/lib/stacks/vercel-oidc-stack.ts`（Vercel OIDCロールへの`batch:SubmitJob`権限付与）
- `infra/aws-cdk/README.md`（デプロイ手順・手動実行手順）
- GitHub Issue #48（ECS Fargate基盤）/ #66（AWS Batchへの移行）/ #49（admin手動起動の実装）
