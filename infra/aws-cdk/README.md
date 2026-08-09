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
│       ├── bedrock-stack.ts       # Bedrockのモデル呼び出し用IAM権限（ManagedPolicy）を定義
│       ├── lambda-stack.ts        # Bedrock疎通確認用Lambda関数を定義
│       └── test-support.ts        # スタックのテスト用セットアップヘルパー
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

# CloudFormationテンプレートの出力のみ（AWS認証不要）
pnpm run synth:dev
```

stg / prd も同様に `:stg` / `:prd` のスクリプトを使用してください
（stgは`account`が未設定のため、対象アカウントが決まるまで`resolveEnvConfig`がエラーを投げてsynth/deployを止めます）。

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
以下はAWSアカウント `085350497655`（prd）側で一度だけ必要な手動セットアップです。

### 1. GitHub用OIDC IDプロバイダーの作成（未作成の場合のみ）

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

（thumbprintの指定は現在不要です。指定しても無視されます）

（すでに同一AWSアカウントで別リポジトリ用にGitHub OIDCプロバイダーを作成済みの場合はスキップ）

### 2. デプロイ用IAM Roleの作成

信頼ポリシー（このリポジトリの `main` ブランチへのpush、および `main` 向けPRからのみ引き受け可能にする）:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::085350497655:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:codeforjapan/saga-broadlistening:ref:refs/heads/main",
            "repo:codeforjapan/saga-broadlistening:pull_request"
          ]
        }
      }
    }
  ]
}
```

権限ポリシー（`cdk bootstrap` が作成する既定のブートストラップロール群を引き受けられればよく、
このRole自体に広い権限を直接付与する必要はありません。`hnb659fds` は既定のqualifier）:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": [
        "arn:aws:iam::085350497655:role/cdk-hnb659fds-deploy-role-085350497655-ap-northeast-1",
        "arn:aws:iam::085350497655:role/cdk-hnb659fds-file-publishing-role-085350497655-ap-northeast-1",
        "arn:aws:iam::085350497655:role/cdk-hnb659fds-lookup-role-085350497655-ap-northeast-1"
      ]
    }
  ]
}
```

### 3. GitHub側の設定

- リポジトリに `production` という名前のGitHub Environmentを作成する
  （承認ゲートは設けない方針のため、protection ruleは追加不要）。
- `production` EnvironmentのSecretに `AWS_CDK_PRD_DEPLOY_ROLE_ARN` を追加し、
  作成したIAM RoleのARNを設定する。

### 補足

- dev環境（`826784631888`）にはCI/CDを設定していません。ローカルから
  `AWS_PROFILE=<devプロファイル> pnpm run deploy:dev` 等で手動デプロイしてください。
- stg環境は前述の通りAWSアカウント未発行のため対象外です。

## 現状のスコープ

- `BedrockStack`: Lambda等がBedrockの基盤モデルを呼び出すためのIAM権限（`ManagedPolicy`）のみを定義。
  モデル自体の有効化（Bedrockコンソールでのモデルアクセスリクエスト）はコード管理対象外のため、
  各アカウントで手動有効化が必要です。
- `LambdaStack`: Bedrockとの疎通確認用の最小限のLambda関数（`bedrock-health-check`）のみを実装。
  実際の業務ロジックは未定のため、今後の要件に応じてLambda関数を追加・置き換えしてください。
