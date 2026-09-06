# develop環境（staging）: 「dev」呼称を廃止し「stg」に統一

[develop環境AWSアカウント方針決定](20260905_2149_develop環境AWSアカウント方針決定.md)で
「stgを廃止しdevに統一する」と決定・実装したが、方針を再度変更し、
**devという呼称を廃止してstgに戻す**ことにした。

## 決定事項

- AWSアカウント`826784631888`は引き続き**同一アカウントを流用**する（新規アカウントは作らない）。
  変わるのは呼称（CDKの環境名・スタック名・リソース名等）のみ。
- CDK上の環境名は`dev`ではなく`stg`を使う（`EnvName = "stg" | "prd"`）。
- 実装方法は「リネーム」ではなく**作り直し**: CDKのスタック名・IAM Role名・ECRリポジトリ名は
  `envConfig.envName`から組み立てられており、CloudFormationはスタック名変更を別物の新規作成として
  扱う（リネームAPIが存在しない）ため、以下の手順で対応した。
  1. 既存の`-dev`系AWSリソースを完全に削除（`cdk destroy --all --context env=dev`実行後、
     ECRリポジトリ`mirai-gikai-topic-analysis-worker-dev`は削除ポリシーが`RETAIN`のため残存し、
     `aws ecr delete-repository --force`で個別に削除）
  2. コード側の`envName`等を`dev`→`stg`にリネーム
  3. 新しい`-stg`系スタックを改めてデプロイする（未実施、次のアクション参照）
- AWSアカウント名・IAMアカウントエイリアス・ローカルの`~/.aws/config`プロファイル名
  （`saga-koucho-dev`→`saga-koucho-stg`）の変更はコードと独立した作業のため、
  本PRの対応範囲外（ユーザーが別途実施）。

## 実施した変更

- `infra/aws-cdk/lib/config/types.ts`: `EnvName`を`"dev" | "prd"`から`"stg" | "prd"`に変更
- `infra/aws-cdk/lib/config/environments/dev.ts` → `stg.ts`にリネーム、`devConfig`→`stgConfig`
- `infra/aws-cdk/lib/config/environments/index.ts`: `stg`の登録に変更
- `infra/aws-cdk/lib/config/environments/index.test.ts`・各`*.test.ts`（bedrock-stack /
  github-oidc-stack / vercel-oidc-stack / topic-analysis-stack / lambda-stack）: テストの
  環境名リテラルを`"dev"`→`"stg"`に変更
- `infra/aws-cdk/bin/app.ts`・`package.json`（`synth:dev`等のスクリプト名）: `dev`→`stg`
- `.github/workflows/cdk_deploy_dev.yml` → `cdk_deploy_stg.yml`、
  `cdk_diff_dev.yml` → `cdk_diff_stg.yml`、
  `deploy_worker_ecs_dev.yml` → `deploy_worker_ecs_stg.yml`にリネームし、
  ワークフロー名・`context_env`・ECRリポジトリ名等を`stg`に変更
- `infra/aws-cdk/README.md`・`docs/20260906_0848_develop環境Vercel環境変数とSecrets実値設定手順.md`・
  `docs/20260906_2230_develop環境_全サービス環境変数チェックリスト.md`: `dev`表記を`stg`に更新
- [develop環境AWSアカウント方針決定](20260905_2149_develop環境AWSアカウント方針決定.md)は
  当時の決定の記録として書き換えず残す（本ドキュメントが最新の方針）

## 実施済み

- `AWS_PROFILE=saga-koucho-dev npx cdk deploy --all --context env=stg` で新しい`-stg`系スタック
  （`MiraiGikaiGitHubOidcStack-stg` / `MiraiGikaiBedrockStack-stg` / `MiraiGikaiLambdaStack-stg` /
  `MiraiGikaiTopicAnalysisStack-stg` / `MiraiGikaiVercelOidcStack-stg`）をデプロイ済み
  （CDK Bootstrap自体は`env`非依存で、`-dev`削除時にも`CDKToolkit`は残っていたため再bootstrap不要だった）
- GitHubの`staging` EnvironmentのSecret（`AWS_CDK_DEPLOY_ROLE_ARN`）を、新しくデプロイされた
  `MiraiGikaiGitHubActionsDeployRole-stg`のARNに更新済み（PR #113の`cdk-diff`がgreenになることを確認済み）

## 未実施（次のアクション）

1. `develop`へマージ後、`CDK Deploy [stg]` / `Deploy Topic Analysis Worker (ECR) [stg]`
   ワークフローが成功することを確認する
2. Vercel環境変数・Secrets Manager実値の再設定
   （`docs/20260906_0848_develop環境Vercel環境変数とSecrets実値設定手順.md`参照。
   スタックを作り直したため出力ARNが変わっている点に注意）
3. （任意・ユーザー実施）AWSアカウント名・IAMアカウントエイリアスの変更、
   ローカル`~/.aws/config`の`saga-koucho-dev`プロファイル名を`saga-koucho-stg`へ変更
