# AWS権限確認エンドポイント（`/api/aws-test/*`）の使い方

admin（`saga-kocho-admin`）に追加した、Vercel OIDC Federation経由のAWS権限（Bedrock呼び出し・トピック分析workerのBatch起動）が実際に機能するかを確認するためのエンドポイントの使い方をまとめる。GitHub Issue #75（Vercel OIDCロールへの`batch:SubmitJob`権限追加）・PR #76（本エンドポイント追加）に対応。

## 前提: 管理者ログインが必要

両エンドポイントとも `requireAdmin()` でガードされており、admin管理者としてログイン済みのセッションが無いと `/login` にリダイレクトされる（未ログイン時は `307`）。そのため、**ブラウザで一度adminにログインした状態で叩く**のが一番簡単。

## 1. `GET /api/aws-test/bedrock` — Bedrock疎通確認

副作用なし・低コスト（短い文章を1回生成するだけ）。ブラウザのアドレスバーに直接アクセスするか、ログイン済みのタブの開発者コンソールで以下を実行する。

```js
fetch("/api/aws-test/bedrock").then((r) => r.json()).then(console.log);
```

**成功時のレスポンス例:**

```json
{ "ok": true, "modelId": "anthropic.claude-3-5-sonnet-20241022-v2:0", "text": "OK" }
```

**失敗時**（権限不足・OIDC設定ミス等）は `{ "ok": false, "error": "<AWSのエラーメッセージ>" }` を `500` で返す。`AccessDeniedException` ならIAM権限側、`ValidationException` ならモデルID側（クロスリージョン推論プロファイルが必要な場合がある）を疑う。

## 2. `POST /api/aws-test/topic-analysis-batch` — Batch起動確認

⚠️ **これは本物のジョブを起動する。** 名前は「テスト」だが、対象議案があれば実際にLLM呼び出し・DB書き込みが発生する、毎朝6:00 JSTのEventBridge Schedulerと全く同じ内容（`--mode=analyze-all`）。何度も叩くと同じ処理が何度も走る可能性がある点に注意。誰が起動したかは `console.log` でVercelのログに記録される。

```js
fetch("/api/aws-test/topic-analysis-batch", { method: "POST" })
  .then((r) => r.json())
  .then(console.log);
```

**成功時のレスポンス例:**

```json
{ "ok": true, "jobId": "1234abcd-...-...-...-56789ef01234" }
```

`jobId` が返ってきたら`batch:SubmitJob`自体は成功している（=権限は機能している）。実際にジョブが正常完了したかは以下で確認する。

```bash
# AWSコンソール、またはCLIで確認（要AWSアクセス権）
aws logs tail /mirai-gikai/topic-analysis-worker-<env> --follow --profile <profile> --region ap-northeast-1
```

**失敗パターン:**

| レスポンス | 原因 |
| --- | --- |
| `401 Unauthorized` | 管理者ログインしていない |
| `500` + `TOPIC_ANALYSIS_BATCH_JOB_QUEUE_ARN / ... が未設定です` | Vercel側の環境変数が未設定 |
| `500` + AWSのエラーメッセージ | IAM権限不足・`AWS_ROLE_ARN`未設定等（`admin/src/lib/aws-credentials.ts`参照） |

## 必要な環境変数（再掲）

`infra/aws-cdk/README.md` および `docs/20260826_2122_batch-submitjob-usage.md`（`main`ブランチ）を参照。値はデプロイ後に以下で取得できる。

```bash
aws cloudformation describe-stacks \
  --stack-name MiraiGikaiTopicAnalysisStack-<env> \
  --profile <profile> --region ap-northeast-1 \
  --query "Stacks[0].Outputs[?OutputKey=='JobQueueArnOutput' || OutputKey=='JobDefinitionArnOutput']" \
  --output table
```

| 変数 | 説明 |
| --- | --- |
| `AWS_REGION` | `ap-northeast-1` |
| `AWS_ROLE_ARN` | `MiraiGikaiVercelBedrockAccessRole-<env>` のARN |
| `TOPIC_ANALYSIS_BATCH_JOB_QUEUE_ARN` | Job Queue ARN |
| `TOPIC_ANALYSIS_BATCH_JOB_DEFINITION_ARN` | Job Definition ARN |

ローカル開発時は `AWS_ROLE_ARN` を設定しなければ `~/.aws` の資格情報にフォールバックする（`admin/src/lib/aws-credentials.ts`）。

## 関連

- `admin/src/app/api/aws-test/bedrock/route.ts` / `admin/src/app/api/aws-test/topic-analysis-batch/route.ts`
- `admin/src/lib/aws-credentials.ts`
- GitHub Issue #48（ECS Fargate基盤）/ #66（AWS Batchへの移行）/ #75（Vercel OIDC権限追加）/ #49（admin本実装）
