# API疎通確認エンドポイント（`/api/tests/*`）の使い方

admin（`saga-kocho-admin`）に追加した、外部サービス（AWS等）への権限が実際に機能するかを確認するためのエンドポイント群の使い方をまとめる。GitHub Issue #75（Vercel OIDCロールへの`batch:SubmitJob`権限追加）・PR #76（本エンドポイント追加）に対応。

現状は`/api/tests/aws/*`（AWS Vercel OIDC Federation関連）のみだが、将来他サービスの疎通確認が必要になった場合は`/api/tests/<サービス名>/*`の形で追加していく想定。

## 認証: 共有シークレットヘッダー（管理者ログイン不要）

このリポジトリは公開OSSのため、`requireAdmin()`（管理者ログイン）ではなく、
共有シークレットによる認証を使っている（`admin/src/lib/require-secret-header.ts`）。
管理者ログイン無しで**curlから直接叩ける**ことを優先した設計で、実際のUI組み込み
（#49）とは別枠の、あくまでテスト・疎通確認用のエンドポイントという位置づけ。

`X-Api-Test-Secret-Token` ヘッダーの値が環境変数 `API_TEST_SECRET_TOKEN` と
一致しない場合は `401 Unauthorized` を返す。`API_TEST_SECRET_TOKEN` は他の値と
推測されにくいランダムな文字列をVercelの環境変数に設定すること
（例: `openssl rand -hex 32`）。

## 1. `GET /api/tests/aws/bedrock` — Bedrock疎通確認

副作用なし・低コスト（短い文章を1回生成するだけ）。

```bash
curl -sS https://<admin-domain>/api/tests/aws/bedrock \
  -H "X-Api-Test-Secret-Token: <API_TEST_SECRET_TOKENの値>"
```

**成功時のレスポンス例:**

```json
{ "ok": true, "modelId": "jp.anthropic.claude-sonnet-4-6", "text": "OK" }
```

**失敗時**（権限不足・OIDC設定ミス等）は `{ "ok": false, "error": "<AWSのエラーメッセージ>" }` を `500` で返す。`AccessDeniedException` ならIAM権限側、`ValidationException` ならモデルID側を疑う。

`ap-northeast-1`では生のmodel IDでのオンデマンド呼び出しができず、クロスリージョン推論プロファイルIDが必要（実機確認済み）。`jp.`（日本CRIS）を使っているのは、IAMポリシーを`jp.*`に限定する計画（Issue #45）と整合させるため。

## 2. `GET /api/tests/aws/bedrock/chat` — Bedrock任意メッセージ確認

固定文言（「OK」とだけ返す）だとLLMらしい応答か確認しづらいため、任意のメッセージを送って応答を見たい場合に使う。クエリパラメータ`message`は必須（無ければ`400`）。

```bash
curl -sS -G https://<admin-domain>/api/tests/aws/bedrock/chat \
  -H "X-Api-Test-Secret-Token: <API_TEST_SECRET_TOKENの値>" \
  --data-urlencode "message=富士山の高さを教えて"
```

**成功時のレスポンス例:**

```json
{ "ok": true, "modelId": "jp.anthropic.claude-sonnet-4-6", "text": "富士山の高さは3,776メートルです。" }
```

失敗パターンは`GET /api/tests/aws/bedrock`と同様。

## 3. `POST /api/tests/aws/topic-analysis-batch` — Batch起動確認

⚠️ **これは本物のジョブを起動する。** 名前は「テスト」だが、対象議案があれば実際にLLM呼び出し・DB書き込みが発生する、毎朝6:00 JSTのEventBridge Schedulerと全く同じ内容（`--mode=analyze-all`）。何度も叩くと同じ処理が何度も走る可能性がある点に注意。起動されたことは`console.log`でVercelのログに記録される（共有シークレット認証のため「誰が」までは特定できない）。

```bash
curl -sS -X POST https://<admin-domain>/api/tests/aws/topic-analysis-batch \
  -H "X-Api-Test-Secret-Token: <API_TEST_SECRET_TOKENの値>"
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
| `401 Unauthorized` | `X-Api-Test-Secret-Token` ヘッダーが無い・値が違う・`API_TEST_SECRET_TOKEN`未設定 |
| `500` + `TOPIC_ANALYSIS_BATCH_JOB_QUEUE_ARN / ... が未設定です` | Vercel側の環境変数が未設定 |
| `500` + AWSのエラーメッセージ | IAM権限不足・`AWS_ROLE_ARN`未設定等（`admin/src/lib/aws-credentials.ts`参照） |

## 必要な環境変数（再掲）

`infra/aws-cdk/README.md` および `docs/20260826_2122_batch-submitjob-usage.md`（`main`ブランチ）を参照。Job Queue/Job DefinitionのARNはデプロイ後に以下で取得できる。

```bash
aws cloudformation describe-stacks \
  --stack-name MiraiGikaiTopicAnalysisStack-<env> \
  --profile <profile> --region ap-northeast-1 \
  --query "Stacks[0].Outputs[?OutputKey=='JobQueueArnOutput' || OutputKey=='JobDefinitionArnOutput']" \
  --output table
```

| 変数 | 説明 |
| --- | --- |
| `API_TEST_SECRET_TOKEN` | `/api/tests/*` 用の共有シークレット。ランダムな文字列を自分で生成して設定する |
| `AWS_REGION` | `ap-northeast-1` |
| `AWS_ROLE_ARN` | `MiraiGikaiVercelBedrockAccessRole-<env>` のARN |
| `TOPIC_ANALYSIS_BATCH_JOB_QUEUE_ARN` | Job Queue ARN |
| `TOPIC_ANALYSIS_BATCH_JOB_DEFINITION_ARN` | Job Definition ARN |

ローカル開発時は `AWS_ROLE_ARN` を設定しなければ `~/.aws` の資格情報にフォールバックする（`admin/src/lib/aws-credentials.ts`）。

## 関連

- `admin/src/app/api/tests/aws/bedrock/route.ts` / `admin/src/app/api/tests/aws/bedrock/chat/route.ts` / `admin/src/app/api/tests/aws/topic-analysis-batch/route.ts`
- `admin/src/lib/aws-credentials.ts` / `admin/src/lib/require-secret-header.ts`
- GitHub Issue #48（ECS Fargate基盤）/ #66（AWS Batchへの移行）/ #75（Vercel OIDC権限追加）/ #49（admin本実装）
