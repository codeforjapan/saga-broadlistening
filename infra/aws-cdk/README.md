# AWS CDK (Bedrock / Lambda)

AWS Bedrock と Lambda 関連のインフラを管理する AWS CDK (TypeScript) プロジェクトです。
dev / stg / prd を **AWS アカウントレベルで分離** する構成になっています。

既存の `infra/cloud-run`（GCP Cloud Run）とは独立したプロジェクトで、pnpm workspace の
メンバー（`@mirai-gikai/aws-cdk`）として管理されています。

## 構成

```
infra/aws-cdk/
├── bin/app.ts                # CDKアプリのエントリーポイント（--context env=dev|stg|prd で対象環境を指定）
├── lib/
│   ├── config/
│   │   ├── types.ts               # EnvConfig / EnvName の型定義
│   │   └── environments/
│   │       ├── dev.ts             # dev環境の設定
│   │       ├── stg.ts             # stg環境の設定（アカウント未定のためプレースホルダー）
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
| dev | `826784631888` | `ap-northeast-1` |
| stg | 未設定（`resolveEnvConfig("stg")` が明示的にエラーを投げる。stg用アカウントが決まったら `lib/config/environments/stg.ts` の `account` を実際のIDに差し替える） | `ap-northeast-1` |
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

stg / prd も同様に `:stg` / `:prd` のスクリプトを使用してください
（stgは`account`が未設定のため、対象アカウントが決まるまで`resolveEnvConfig`がエラーを投げてsynth/deployを止めます）。

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

## CI/CD（main ブランチ・prd環境）

`.github/workflows/cdk_diff.yml` / `cdk_deploy.yml` により、`infra/aws-cdk/` に変更がある場合
prd環境（AWSアカウント `085350497655`）に対して以下を自動実行します。

- **main への PR**: `cdk diff --context env=prd` を実行し、結果をPRコメントに表示（実デプロイなし）。
  コメントは同一PRへの再pushのたびに上書き更新されます。
- **main へのマージ（push）**: `cdk deploy --all --context env=prd --require-approval never` を実行。
  **承認ゲートなし**でマージ直後に本番デプロイされるため、mainへのマージ自体を変更管理の最終ゲートとして扱ってください。

認証は長期のAWSアクセスキーを使わず、GitHub ActionsのOIDCとAWS IAM Roleの信頼関係で行います。
OIDC IDプロバイダーおよびデプロイ用IAM Roleは CDK スタック（`MiraiGikaiGitHubOidcStack`）としてコード管理されているため、手元の管理者権限プロファイルから事前作成します。

### 1. CDKによるOIDCスタックのデプロイ

```bash
AWS_PROFILE=<prdアカウント用プロファイル> npx cdk deploy MiraiGikaiGitHubOidcStack-prd --context env=prd
```

このスタックにより以下が作成されます：

- **OIDC IDプロバイダー**: `https://token.actions.githubusercontent.com`
- **デプロイ用IAM Role**: `MiraiGikaiGitHubActionsDeployRole-prd`
  - **信頼関係**: リポジトリ `codeforjapan/saga-broadlistening` の `main` ブランチおよび `pull_request` のみ許可 (`sts:AssumeRoleWithWebIdentity`)
  - **権限**: CDK Bootstrap が作成する既定のロール群（`cdk-hnb659fds-*-085350497655-ap-northeast-1`）への `sts:AssumeRole` のみ許可

### 2. GitHub側の設定

- リポジトリに `production` という名前のGitHub Environmentを作成する
  （承認ゲートは設けない方針のため、protection ruleは追加不要）。
- `production` EnvironmentのSecretに `AWS_CDK_PRD_DEPLOY_ROLE_ARN` を追加し、
  CDKデプロイ時の CloudFormation Output (`GitHubActionsDeployRoleArn`) または以下のRole ARNを設定する。
  `arn:aws:iam::085350497655:role/MiraiGikaiGitHubActionsDeployRole-prd`

### 補足

- dev環境（`826784631888`）にはCI/CDを設定していません。ローカルから
  `AWS_PROFILE=<devプロファイル> pnpm run deploy:dev` 等で手動デプロイしてください。
- stg環境は前述の通りAWSアカウント未発行のため対象外です。

### worker イメージのCI（`.github/workflows/deploy_worker_ecs.yml`）

`worker/` 配下（および依存パッケージ）の変更が main にマージされると、上記の
`MiraiGikaiGitHubActionsDeployRole-prd` を使ってprd用ECRリポジトリへ
`mirai-gikai-topic-analysis-worker-prd:latest` / `:<sha>` をpushする
（タスク定義は常に`:latest`を参照するため、pushするだけで次回起動から反映される）。
Roleの信頼条件が `main`ブランチ限定のため、dev/stg環境への自動pushは対象外
（手動で`docker push`するか、上記手順3を参照）。

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
  admin からの手動起動（`batch:SubmitJob`）はGitHub Issue #49で対応する。

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
4. **EventBridge Scheduler → Batch SubmitJobの疎通確認（要実施）**: `CfnSchedule` の
   Batchターゲットは universal target（`arn:aws:scheduler:::aws-sdk:batch:submitJob`）を
   使っており、`Input` のキー名（`jobName`/`jobQueue`/`jobDefinition`/`containerOverrides`）が
   実際のBatch SubmitJob APIの期待する形式と一致するかはコード上のドキュメント調査でのみ確認済みで、
   実機での発火確認はまだ行っていない。`topicAnalysisSchedulerEnabled` を一時的に `true` にして
   数分後に発火するようスケジュールし、実際にジョブが起動することを確認すること。
5. **定期実行を有効化する場合**は、GCP Cloud Scheduler側を`SCHEDULER_PAUSED=1`で
   一時停止してから `lib/config/environments/<env>.ts` の `topicAnalysisSchedulerEnabled`
   を `true` にしてデプロイする（両方が有効だと同一議案の分析が二重実行される）。
