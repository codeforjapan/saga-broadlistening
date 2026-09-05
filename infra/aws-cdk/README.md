# AWS CDK (Bedrock / Lambda)

AWS Bedrock と Lambda 関連のインフラを管理する AWS CDK (TypeScript) プロジェクトです。
dev / prd を **AWS アカウントレベルで分離** する構成になっています。
develop環境（GitHubの`staging` Environment）は独立したAWSアカウントを持たず、
dev環境（`826784631888`）をそのまま使います。

既存の `infra/cloud-run`（GCP Cloud Run）とは独立したプロジェクトで、pnpm workspace の
メンバー（`@mirai-gikai/aws-cdk`）として管理されています。

## 構成

```
infra/aws-cdk/
├── bin/app.ts                # CDKアプリのエントリーポイント（--context env=dev|prd で対象環境を指定）
├── lib/
│   ├── config/
│   │   ├── types.ts               # EnvConfig / EnvName の型定義
│   │   └── environments/
│   │       ├── dev.ts             # dev環境の設定（develop環境もこれを流用）
│   │       ├── prd.ts             # prd環境の設定
│   │       └── index.ts           # resolveEnvConfig(envName) — 環境名から設定を解決する純粋関数
│   └── stacks/
│       ├── bedrock-stack.ts         # Bedrockのモデル呼び出し用IAM権限（ManagedPolicy）を定義
│       ├── lambda-stack.ts          # Bedrock疎通確認用Lambda関数を定義
│       ├── topic-analysis-stack.ts  # トピック分析worker用 AWS Batch (Fargate) + EventBridge Scheduler基盤
│       └── test-support.ts          # スタックのテスト用セットアップヘルパー
└── src/handlers/
    └── bedrock-health-check/
        ├── build-converse-input.ts      # ConverseCommand入力を組み立てる純粋関数
        ├── extract-reply-text.ts        # レスポンスからテキストを取り出す純粋関数
        └── index.ts                     # Lambdaハンドラ本体
```

（各 `*.ts` に対応する `*.test.ts` は省略しています）

## 環境設定

| 環境 | AWSアカウントID | リージョン |
| --- | --- | --- |
| dev（developブランチのdeploy先も兼ねる） | `826784631888` | `ap-northeast-1` |
| prd | `085350497655` | `ap-northeast-1` |

`bedrockModelId` も含め、環境ごとの設定値は `lib/config/environments/*.ts` に集約しています。
新しい設定項目を追加する場合は `lib/config/types.ts` の `EnvConfig` に追加してください。

## セットアップ

```bash
cd infra/aws-cdk
pnpm install
```

AWS認証情報は環境ごとに異なるアカウントを使うため、環境変数 `AWS_PROFILE` で
対象アカウントのプロファイルを切り替えて実行してください（例: `~/.aws/config` に
`mirai-gikai-dev` / `mirai-gikai-prd` などのプロファイルを用意）。

## 初回のみ: CDK Bootstrap

各AWSアカウント・リージョンごとに一度だけ実行が必要です。

```bash
AWS_PROFILE=<devアカウント用プロファイル> npx cdk bootstrap aws://826784631888/ap-northeast-1 --context env=dev
AWS_PROFILE=<prdアカウント用プロファイル> npx cdk bootstrap aws://085350497655/ap-northeast-1 --context env=prd
```

## コマンド

`package.json` に環境ごとのスクリプトを用意しています。

```bash
# 差分確認
AWS_PROFILE=<devアカウント用プロファイル> pnpm run diff:dev

# デプロイ
AWS_PROFILE=<devアカウント用プロファイル> pnpm run deploy:dev

# CloudFormationテンプレートの出力のみ
pnpm run synth:dev
```

prdも同様に`:prd`のスクリプトを使用してください。

> **注意**: `TopicAnalysisStack` が `ec2.Vpc` を作成するため、`AZ一覧の取得`
> （`ec2:DescribeAvailabilityZones`）にAWS認証情報が必要です。`synth`も含め、
> 対象アカウントの `AWS_PROFILE` を付けて実行してください。初回実行後に生成される
> `cdk.context.json` をコミットしておくと、2回目以降は認証情報なしでも`synth`が通ります。

## テスト

`aws-cdk-lib/assertions` を使ったスタックのユニットテストと、Lambdaハンドラ内の
純粋関数のユニットテストを Vitest で実行します。

```bash
pnpm test        # 単体テスト
pnpm typecheck    # 型チェック
```

## CI/CD

`infra/aws-cdk/` に変更がある場合、ブランチに応じてprd環境・dev環境それぞれに
diff/deployを自動実行します。認証は長期のAWSアクセスキーを使わず、GitHub Actionsの
OIDCとAWS IAM Roleの信頼関係で行います。OIDC IDプロバイダーおよびデプロイ用IAM Roleは
CDK スタック（`MiraiGikaiGitHubOidcStack`）としてコード管理されているため、
手元の管理者権限プロファイルから事前作成します。

### main ブランチ・prd環境（`cdk_diff.yml` / `cdk_deploy.yml`）

- **main への PR**: `cdk diff --context env=prd` を実行し、結果をPRコメントに表示（実デプロイなし）。
  コメントは同一PRへの再pushのたびに上書き更新されます。
- **main へのマージ（push）**: `cdk deploy --all --context env=prd --require-approval never` を実行。
  **承認ゲートなし**でマージ直後に本番デプロイされるため、mainへのマージ自体を変更管理の最終ゲートとして扱ってください。

### develop ブランチ・dev環境（`cdk_diff_dev.yml` / `cdk_deploy_dev.yml`）

- **develop への PR**: `cdk diff --context env=dev` を実行し、結果をPRコメントに表示（実デプロイなし）。
- **develop へのマージ（push）**: `cdk deploy --all --context env=dev --require-approval never` を実行。
  こちらも**承認ゲートなし**です。GitHub Environmentは既存の`staging`（Supabase/Vercelのdeploy.ymlと共用）を使います。

### 1. CDKによるOIDCスタックのデプロイ

```bash
AWS_PROFILE=<prdアカウント用プロファイル> npx cdk deploy MiraiGikaiGitHubOidcStack-prd --context env=prd
AWS_PROFILE=<devアカウント用プロファイル> npx cdk deploy MiraiGikaiGitHubOidcStack-dev --context env=dev
```

このスタックにより環境ごとに以下が作成されます：

- **OIDC IDプロバイダー**: `https://token.actions.githubusercontent.com`
- **デプロイ用IAM Role**: `MiraiGikaiGitHubActionsDeployRole-<env>`
  - **信頼関係**（`sts:AssumeRoleWithWebIdentity`）: リポジトリ `codeforjapan/saga-broadlistening` の
    `pull_request`に加え、prdは`main`ブランチ/`production` Environmentを、
    devは`develop`ブランチ/`staging` Environmentを許可
  - **権限**: CDK Bootstrap が作成する既定のロール群（`cdk-hnb659fds-*-<account>-ap-northeast-1`）への `sts:AssumeRole` のみ許可

### 2. GitHub側の設定

- `production` EnvironmentのSecretに `AWS_CDK_PRD_DEPLOY_ROLE_ARN` を追加し、
  `arn:aws:iam::085350497655:role/MiraiGikaiGitHubActionsDeployRole-prd` を設定する
  （承認ゲートは設けない方針のため、protection ruleは追加不要）。
- 既存の `staging` EnvironmentのSecretに `AWS_CDK_DEV_DEPLOY_ROLE_ARN` を追加し、
  `arn:aws:iam::826784631888:role/MiraiGikaiGitHubActionsDeployRole-dev` を設定する。
  （このSecretが未設定の間は `cdk_deploy_dev.yml` / `cdk_diff_dev.yml` はgreen skipになります）

### worker イメージのCI（`.github/workflows/deploy_worker_ecs.yml`）

`worker/` 配下（および依存パッケージ）の変更が main にマージされると、
`MiraiGikaiGitHubActionsDeployRole-prd` を使ってprd用ECRリポジトリへ
`mirai-gikai-topic-analysis-worker-prd:latest` / `:<sha>` をpushする
（タスク定義は常に`:latest`を参照するため、pushするだけで次回起動から反映される）。
develop環境向けの同等ワークフローは未対応（手動で`docker push`するか、上記手順1を参照）。

## 現状のスコープ

- `BedrockStack`: Lambda等がBedrockの基盤モデルを呼び出すためのIAM権限（`ManagedPolicy`）のみを定義。
  モデル自体の有効化（Bedrockコンソールでのモデルアクセスリクエスト）はコード管理対象外のため、
  各アカウントで手動有効化が必要です。
- `LambdaStack`: Bedrockとの疎通確認用の最小限のLambda関数（`bedrock-health-check`）のみを実装。
  実際の業務ロジックは未定のため、今後の要件に応じてLambda関数を追加・置き換えしてください。
- `TopicAnalysisStack`: トピック分析・意見再抽出バックフィルworker（`worker/`）をGCP Cloud Run Job
  （`infra/cloud-run`）からAWS Batch (Fargate)へ移行する基盤。ECRリポジトリ・VPC（NATなし・
  パブリックサブネットのみ）・Compute Environment・Job Queue・Job Definition・
  EventBridge Schedulerを作成する（GitHub Issue #48 / #66）。
  当初はECS RunTaskを直接使う構成（#48）だったが、呼び出しのたびにsubnet/SGを渡す必要があり
  admin側（#49）にもインフラの詳細が漏れ出す問題があったため、AWS Batchへ移行した（#66）。
- `VercelOidcStack`: Vercel（`saga-kocho-web`/`saga-kocho-admin`）からOIDC Federationで
  AWSを呼び出すためのIAMロールを管理。Bedrock呼び出し権限に加え、`TopicAnalysisStack`の
  Job Queue/Job Definition ARNに限定した`batch:SubmitJob`権限も付与している。
  `TopicAnalysisStack`の出力を参照するため、`bin/app.ts`では`VercelOidcStack`より
  先にデプロイされる必要がある（個別スタック指定で`cdk deploy`する場合は順序に注意）。
  admin側の実際のディスパッチ実装（現行のGCP Cloud Run Job起動処理
  `admin/src/lib/cloud-run-job.ts`をBatch SubmitJob版に置き換える想定）は
  GitHub Issue #49で対応する。実際の呼び出しコード例は
  `docs/20260826_2122_batch-submitjob-usage.md` を参照。

### TopicAnalysisStackのデプロイ後にやること

1. **Secretsに実値を設定**（CDKは空のSecretだけを作成する）:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id mirai-gikai-topic-analysis-worker-<env>/SUPABASE_URL \
     --secret-string "<値>" --profile <対象アカウント用プロファイル>
   # SUPABASE_SECRET_KEY / AI_GATEWAY_API_KEY も同様に設定する
   ```
2. **workerイメージをECRにpush**（初回はJob Definitionが参照する`:latest`タグが無いと起動に失敗する）:
   ```bash
   aws ecr get-login-password --region ap-northeast-1 --profile <profile> | \
     docker login --username AWS --password-stdin <account>.dkr.ecr.ap-northeast-1.amazonaws.com
   docker build --platform linux/amd64 -f worker/Dockerfile \
     -t <account>.dkr.ecr.ap-northeast-1.amazonaws.com/mirai-gikai-topic-analysis-worker-<env>:latest .
   docker push <account>.dkr.ecr.ap-northeast-1.amazonaws.com/mirai-gikai-topic-analysis-worker-<env>:latest
   ```
   以降は `.github/workflows/deploy_worker_ecs.yml`（mainブランチ・prd環境のみ）が
   `worker/` 配下の変更を検知して自動push する。
3. **手動でジョブを実行して動作確認する**（Batchなのでsubnet/SGの指定は不要）:
   ```bash
   aws batch submit-job \
     --job-name manual-test \
     --job-queue mirai-gikai-topic-analysis-<env> \
     --job-definition mirai-gikai-topic-analysis-worker-<env> \
     --container-overrides command=--mode=analyze-all \
     --profile <profile> --region ap-northeast-1
   aws logs tail /mirai-gikai/topic-analysis-worker-<env> --follow --profile <profile> --region ap-northeast-1
   ```
4. **EventBridge Scheduler → Batch SubmitJobの実際の発火確認（要実施）**: `CfnSchedule` の
   Batchターゲットは universal target（`arn:aws:scheduler:::aws-sdk:batch:submitJob`）を使う。
   `Input` のキー名は当初camelCase（`jobName`等）で実装したが、実際のprd環境への初回デプロイで
   `Invalid RequestJson provided. ... missing the following field(s): JobName, JobQueue,
   JobDefinition` というCloudFormationのバリデーションエラーになり、AWS Batchは
   JSON protocol（RESTではない）のAPIのためPascalCase（`JobName`/`JobQueue`/`JobDefinition`/
   `ContainerOverrides`/`Command`）が必要と判明した（ECS RunTaskのcamelCaseとは異なる）。
   修正後はCloudFormationのリソース作成自体は通ることを確認したが、
   **スケジュールが実際に発火してBatchジョブが起動することまではまだ確認していない**。
   `topicAnalysisSchedulerEnabled` を一時的に `true` にして数分後に発火するようスケジュールし、
   実際にジョブが起動する（CloudWatch Logsにログが出る）ことを確認すること。
5. **定期実行を有効化する場合**は、GCP Cloud Scheduler側を`SCHEDULER_PAUSED=1`で
   一時停止してから `lib/config/environments/<env>.ts` の `topicAnalysisSchedulerEnabled`
   を `true` にしてデプロイする（両方が有効だと同一議案の分析が二重実行される）。
