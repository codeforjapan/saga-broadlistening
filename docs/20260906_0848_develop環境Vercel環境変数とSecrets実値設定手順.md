# develop環境（staging）Vercel環境変数 ＋ Secrets Manager実値 設定手順

`docs/20260831_1206_staging環境整備計画.md`の手順6・「TopicAnalysisStackのデプロイ後にやること」手順1に対応する作業手順。
`MiraiGikaiVercelOidcStack-dev` / `MiraiGikaiTopicAnalysisStack-dev`は既にAWSアカウント`826784631888`（`saga-koucho-dev`）にデプロイ済みで、この手順はその出力値をVercel/Secrets Managerに反映する作業。

## 前提

- AWSアカウント`826784631888`（プロファイル`saga-koucho-dev`）への読み取りアクセス権があること
- Vercelチーム`c4j`の`saga-kocho-web` / `saga-kocho-admin`プロジェクトの設定変更権限があること
- `SUPABASE_SECRET_KEY` / `AI_GATEWAY_API_KEY`などの実値を持っていること（1Password等、社内の秘密情報管理先を参照）

## 全体像：develop環境に関わる設定の分類

develop環境（staging）には性質の異なる3種類の認証情報があり、混同しやすいので整理する。

| 分類 | 保存先 | 用途 | 現状 |
|---|---|---|---|
| ① GitHub Actions Environment Secrets | GitHub `staging` Environment | CI/CDが`develop`へのpush時にSupabase migrate・CDK deploy・worker ECR pushを実行するための認証情報 | 設定済み（下表参照） |
| ② Vercel環境変数 | Vercelダッシュボード（`saga-kocho-admin`の`Preview`環境） | adminアプリの**実行時**（ユーザーがアクセスした時）にBedrock呼び出し・AWS Batch起動を行うための認証情報 | **未設定（本手順の対象）** |
| ③ AWS Secrets Manager | AWSアカウント`826784631888`内 | AWS Batchで動くworkerコンテナが起動時に読む、Supabase/AI Gatewayの認証情報 | **未設定（本手順の対象）** |

①と②はどちらも「AWSにOIDCで認証する」という点で似ているが、**別々のIAM Role**を使う点に注意:
- ①は`MiraiGikaiGitHubActionsDeployRole-dev`（GitHub Actions用、`infra/aws-cdk`のCDKデプロイ専用）
- ②は`MiraiGikaiVercelBedrockAccessRole-dev`（Vercel用、Bedrock呼び出し＋Batch SubmitJob専用）

### ① GitHub Actions Environment Secrets（`staging`、現状・参考情報）

既に設定済みで、本手順での追加作業は不要。参考として現状の一覧を記載する。

```bash
gh api repos/codeforjapan/saga-broadlistening/environments/staging/secrets --jq '.secrets[].name'
```

| Secret名 | 用途 |
|---|---|
| `AWS_CDK_DEPLOY_ROLE_ARN` | CDK deploy/diff・worker ECR pushのOIDC認証（`MiraiGikaiGitHubActionsDeployRole-dev`） |
| `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_REF` / `SUPABASE_DB_PASSWORD` | `supabase link` / `db push` |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` / `ADMIN_AUTH_CALLBACK_URL` | `supabase config push`（Google OAuth設定） |
| `WEB_VERCEL_DEPLOY_HOOK_URL` / `ADMIN_VERCEL_DEPLOY_HOOK_URL` | DB migrate完了後にVercelデプロイを起動するDeploy Hook |

## 2. Vercel環境変数の設定（`saga-kocho-admin`の`Preview`環境）

### 2.1 対象の環境変数

adminアプリ（`admin/src/lib/env.ts`）が実行時に読む変数。**webアプリはこれらを一切参照していない**（Bedrock呼び出し・Batch起動はadminのみの機能）ため、`saga-kocho-web`側の設定は不要。

| 環境変数名 | 取得元 |
|---|---|
| `AWS_ROLE_ARN` | `MiraiGikaiVercelOidcStack-dev`の出力`VercelBedrockAccessRoleArn` |
| `AWS_REGION` | `ap-northeast-1`（固定値。未設定でもコード側のデフォルトで動くが明示推奨） |
| `TOPIC_ANALYSIS_BATCH_JOB_QUEUE_ARN` | `MiraiGikaiTopicAnalysisStack-dev`の出力`JobQueueArnOutput` |
| `TOPIC_ANALYSIS_BATCH_JOB_DEFINITION_ARN` | `MiraiGikaiTopicAnalysisStack-dev`の出力`JobDefinitionArnOutput` |

### 2.2 実際の値を取得する

```bash
aws sso login --profile saga-koucho-dev

aws cloudformation describe-stacks \
  --stack-name MiraiGikaiVercelOidcStack-dev \
  --profile saga-koucho-dev --region ap-northeast-1 \
  --query "Stacks[0].Outputs"

aws cloudformation describe-stacks \
  --stack-name MiraiGikaiTopicAnalysisStack-dev \
  --profile saga-koucho-dev --region ap-northeast-1 \
  --query "Stacks[0].Outputs"
```

### 2.3 Vercelダッシュボードで設定する

1. [Vercel Dashboard](https://vercel.com/) → `c4j`チーム → `saga-kocho-admin`プロジェクトを開く
2. **Settings > Environment Variables** に移動
3. 上記4つの変数を追加し、適用環境として **Preview** を選択

### 2.4 注意（重要・セキュリティ）

Vercelの`Preview`環境変数は、branchを絞らない限り**developブランチだけでなく、任意のfeatureブランチのプレビューデプロイにも適用される**。つまり何も絞らずに設定すると、develop以外のPRプレビューからも`MiraiGikaiVercelBedrockAccessRole-dev`（Bedrock呼び出し＋Batch SubmitJob権限）にアクセスできてしまう。

- Vercelのプラン・設定で「特定ブランチのみに適用するPreview環境変数」（Preview Branchesの指定）が可能な場合は、**`develop`ブランチに限定**して設定すること
- 絞り込みができない場合は、リスクを許容範囲と判断できるか（本リポジトリはfork PRを`if: github.event.pull_request.head.repo.full_name == github.repository`で弾いているため、外部フォークからの悪用は防げるが、社内の他featureブランチのプレビューからはアクセスできてしまう点は変わらない）を確認してから設定する

### 2.5 動作確認

1. `develop`へpush → `Migrate DB then Deploy`ワークフロー経由でVercelデプロイが起動することを確認
2. developのプレビューURLでadminにログインし、トピック分析のBatch起動機能（`admin/src/lib/topic-analysis-batch.ts`を使う画面）を実行
3. AWS Batchのjob queue（`mirai-gikai-topic-analysis-dev`）にjobが積まれることを確認:
   ```bash
   aws batch list-jobs --job-queue mirai-gikai-topic-analysis-dev \
     --profile saga-koucho-dev --region ap-northeast-1
   ```

## 3. Secrets Manager実値の投入（devのworker用）

### 3.1 対象キー

CDKは空のSecretだけを作成しており（`infra/aws-cdk/lib/stacks/topic-analysis-stack.ts`）、実値は別途投入する必要がある。worker本体（`worker/src/main.ts`）が起動時に必須envとして要求する3つ。

| Secret ID | 値 |
|---|---|
| `mirai-gikai-topic-analysis-worker-dev/SUPABASE_URL` | dev用SupabaseプロジェクトのURL |
| `mirai-gikai-topic-analysis-worker-dev/SUPABASE_SECRET_KEY` | dev用SupabaseのService Role Key |
| `mirai-gikai-topic-analysis-worker-dev/AI_GATEWAY_API_KEY` | Vercel AI GatewayのAPIキー |

### 3.2 投入コマンド

値は対話入力させ、シェル履歴に残さない。

```bash
aws secretsmanager put-secret-value \
  --secret-id mirai-gikai-topic-analysis-worker-dev/SUPABASE_URL \
  --secret-string "<値>" --profile saga-koucho-dev --region ap-northeast-1

aws secretsmanager put-secret-value \
  --secret-id mirai-gikai-topic-analysis-worker-dev/SUPABASE_SECRET_KEY \
  --secret-string "<値>" --profile saga-koucho-dev --region ap-northeast-1

aws secretsmanager put-secret-value \
  --secret-id mirai-gikai-topic-analysis-worker-dev/AI_GATEWAY_API_KEY \
  --secret-string "<値>" --profile saga-koucho-dev --region ap-northeast-1
```

### 3.3 workerイメージのpush（初回のみ手動、以降は自動）

`:latest`タグが無いとBatch Job Definitionの起動が失敗する。PR #109で`deploy_worker_ecs_dev.yml`が追加されたため、**develop側は次回`worker/`配下の変更がdevelopにマージされた時点で自動push**される。それより前に動作確認したい場合のみ手動push:

```bash
aws ecr get-login-password --region ap-northeast-1 --profile saga-koucho-dev | \
  docker login --username AWS --password-stdin 826784631888.dkr.ecr.ap-northeast-1.amazonaws.com
docker build --platform linux/amd64 -f worker/Dockerfile \
  -t 826784631888.dkr.ecr.ap-northeast-1.amazonaws.com/mirai-gikai-topic-analysis-worker-dev:latest .
docker push 826784631888.dkr.ecr.ap-northeast-1.amazonaws.com/mirai-gikai-topic-analysis-worker-dev:latest
```

### 3.4 動作確認（手動でBatchジョブを実行）

```bash
aws batch submit-job \
  --job-name manual-test \
  --job-queue mirai-gikai-topic-analysis-dev \
  --job-definition mirai-gikai-topic-analysis-worker-dev \
  --container-overrides command=--mode=analyze-all \
  --profile saga-koucho-dev --region ap-northeast-1

aws logs tail /mirai-gikai/topic-analysis-worker-dev --follow \
  --profile saga-koucho-dev --region ap-northeast-1
```

## 4. 未対応（本手順の対象外）

- EventBridge Schedulerの定期実行有効化（`topicAnalysisSchedulerEnabled`）は、GCP Cloud Scheduler側の停止と合わせて別途判断する（`docs/20260831_1206_staging環境整備計画.md`参照）
- Bedrockモデルアクセスの手動有効化（AWSコンソール、アカウント`826784631888`側）
