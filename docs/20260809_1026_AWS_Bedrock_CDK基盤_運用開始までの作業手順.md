# AWS Bedrock/CDK基盤 運用開始までの作業手順

PR #21（`feat/aws-cdk-bedrock-lambda`）で追加した `infra/aws-cdk/`（AWS CDKプロジェクト）と
関連のGitHub Actionsワークフローは、コードとしてはこの時点で完成しているが、
**実際にAWS上で動かす・自動デプロイを有効化するには、人手によるAWS/GitHub側の設定が別途必要**。
本ドキュメントはその作業の全体像とチェックリストをまとめる。

コード側の詳細（ディレクトリ構成・コマンド一覧・現状のスコープ）は
[`infra/aws-cdk/README.md`](../infra/aws-cdk/README.md) を参照。本ドキュメントは
「誰が・どの順番で・何をするか」の運用手順にフォーカスする。

## 全体像

```
① PRマージ（develop→main等、既存フロー）
       │
② AWSアカウント準備（dev / prd 個別に必要）
   ├─ Bedrockモデルアクセスの有効化（コンソール操作）
   └─ cdk bootstrap（ローカルCLIから、admin権限で1回だけ）
       │
③ prd自動デプロイ用のOIDC連携セットアップ（本番のみ・1回だけ）
   ├─ IAM OIDCプロバイダー作成
   ├─ IAM Role作成（GitHub Actionsから引き受け可能に）
   └─ GitHub Environment "production" + Secret登録
       │
④ 動作確認
   ├─ main向けPRで cdk diff コメントが表示されるか
   ├─ mainマージで cdk deploy が走るか
   └─ Lambda(bedrock-health-check)を手動実行して疎通確認
       │
⑤（将来）stgアカウントが発行されたら対応
```

②③は一度やれば終わりの初期セットアップ。④は毎回というより初回の動作確認用。

## ① PRのマージ

- PR #21 をレビューし、`develop` にマージする。
- CI（lint-and-typecheck / integration-test / pinact-check）はすべてpass済み、
  CodeRabbitは `.coderabbit.yml` の `path_filters` の対象外（`infra/**` 未対象）のためコメントなし。
- `infra/aws-cdk/` のCI/CD（`cdk_diff.yml` / `cdk_deploy.yml`）は **`main` ブランチ向けのPR・push** にのみ反応するため、
  `develop` にマージしただけではまだ何も動かない。実際に有効化されるのは、この変更が
  `develop→main` のリリースPRを経て `main` にマージされたとき。

## ② AWSアカウント準備（dev・prdそれぞれ）

対象アカウント:

| 環境 | AWSアカウントID |
| --- | --- |
| dev | `826784631888` |
| prd | `085350497655` |

### 2-1. Bedrockモデルアクセスの有効化

AWS Bedrockはデフォルトではモデルへのアクセスが無効になっているため、各アカウントのBedrockコンソール
（リージョン: `ap-northeast-1`）で、使用するモデル（`lib/config/environments/{dev,prd}.ts` の
`bedrockModelId`、現状は `anthropic.claude-3-5-sonnet-20241022-v2:0` を仮設定）へのモデルアクセスを
リクエストし、承認されていることを確認する。

- これはCDKのコード管理対象外（AWSコンソールでの手動操作が必要な項目）。
- 未承認のままだと `bedrock-health-check` Lambdaの実行時に `AccessDeniedException` になる。

### 2-2. CDK Bootstrap（ローカルから、admin権限で1回だけ）

GitHub ActionsのOIDC Roleは「CDKが作成するbootstrapロール群を引き受ける」権限しか持たない設計
（③参照）のため、**bootstrapスタック自体は先にadmin権限のローカル実行で作成しておく必要がある**。

```bash
cd infra/aws-cdk
AWS_PROFILE=<devアカウント用admin権限プロファイル> npx cdk bootstrap aws://826784631888/ap-northeast-1
AWS_PROFILE=<prdアカウント用admin権限プロファイル> npx cdk bootstrap aws://085350497655/ap-northeast-1
```

これにより各アカウント・リージョンに `cdk-hnb659fds-*` の一連のIAMロール・S3バケット等が作成される
（qualifier `hnb659fds` はCDKの既定値）。

## ③ prd自動デプロイ用のOIDC連携セットアップ（本番のみ）

`main` へのマージで自動的に `cdk deploy` が走る（承認ゲートなし）ため、事前にこのセットアップが
完了していないとワークフローは "green skip"（何もせず成功扱い）になるだけで、実デプロイはされない
（`infra/aws-cdk/README.md` の該当セクションと同じ内容。手順の全文はそちらを参照）。

チェックリスト:

- [ ] prdアカウント（`085350497655`）にGitHub用OIDC IDプロバイダーを作成
      （`aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com`。thumbprint指定は現在不要）
- [ ] デプロイ用IAM Roleを作成
      - 信頼ポリシー: `repo:codeforjapan/saga-broadlistening:ref:refs/heads/main` と
        `repo:codeforjapan/saga-broadlistening:pull_request` からの `AssumeRoleWithWebIdentity` のみ許可
      - 権限ポリシー: ②-2で作成された `cdk-hnb659fds-{deploy,file-publishing,lookup}-role-085350497655-ap-northeast-1`
        への `sts:AssumeRole` のみ（このRole自体に広い権限を直接持たせない）
- [ ] GitHubリポジトリに Environment `production` を作成（protection ruleは追加しない方針）
- [ ] `production` Environmentの Secret に `AWS_CDK_PRD_DEPLOY_ROLE_ARN` を登録
      （作成したIAM RoleのARN）

## ④ 動作確認

セットアップ後、以下を確認する。

- [ ] `infra/aws-cdk/` に変更を含む `main` 向けPRを作成し、`cdk diff (prd)` コメントが
      自動投稿されること（PRを再pushすると同じコメントが更新されること）
- [ ] そのPRを `main` にマージし、`cdk_deploy.yml` が実行されて
      `BedrockStack` / `LambdaStack` が実際にprdアカウントへデプロイされること
      （AWS CloudFormationコンソールでスタック作成を確認）
- [ ] デプロイされた `mirai-gikai-bedrock-health-check-prd` Lambdaを手動実行し、
      Bedrockから応答が返る（`{"ok": true, ...}`）ことを確認
      （②-1のモデルアクセス承認が済んでいないとここで失敗する）

## ⑤（将来）stgアカウント発行時の対応

現状 `lib/config/environments/stg.ts` の `account` はプレースホルダー（`000000000000`）で、
`resolveEnvConfig("stg")` は明示的にエラーを投げるようガードされている。stg用AWSアカウントが
発行されたら:

1. `lib/config/environments/stg.ts` の `account` を実際のアカウントIDに差し替える
2. ②・③と同様の手順（Bedrockモデルアクセス有効化・cdk bootstrap）をstgアカウントに対して実施
3. 必要であれば `develop` 向けにも `cdk_diff.yml` / `cdk_deploy.yml` 相当のワークフローを追加するか検討
   （現時点ではmain/prdのみを対象としており、stg/dev向けのCI/CD自動化は未実装）

## 誰がやるか

②③はAWSアカウントの管理者権限（IAM操作・OIDCプロバイダー作成権限）が必要な作業のため、
インフラ管理者が実施する想定。④の動作確認はPRの作成者・レビュアーが行う。
